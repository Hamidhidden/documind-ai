# DocuMind Architecture

DocuMind separates synchronous API work from expensive extraction and AI processing. Django owns validation, authentication, authorization, and durable workflow state; Celery workers own retryable document and large-summary tasks. PostgreSQL with pgvector is the system of record for document metadata and embeddings.

```mermaid
flowchart LR
  Browser[Next.js client] -->|JWT API calls| Django[Django + DRF]
  Django --> PG[(PostgreSQL + pgvector)]
  Django --> Media[Document media volume]
  Django --> Redis[(Redis broker)]
  Redis --> Worker[Celery worker]
  Worker --> Media
  Worker --> PG
  Worker --> OpenAI[OpenAI embeddings / chat]
```

## Application boundaries

| Area | Responsibility |
| --- | --- |
| `accounts` | Registration, JWT lifecycle, profile data |
| `documents` | Upload validation, durable document records, extraction, chunking, embedding, retrieval |
| `collections` | User-owned document grouping |
| `conversations` | Persistent chat, citations, summaries |
| `shared` | Request correlation, health endpoints, consistent errors |

Views validate requests and enforce the current owner by deriving querysets from `request.user`. Processing and RAG logic lives in service modules so it can be tested without HTTP transport.

## Document pipeline

```mermaid
sequenceDiagram
  participant U as User
  participant A as API
  participant Q as Redis/Celery
  participant W as Worker
  participant D as PostgreSQL
  U->>A: Upload allowed file
  A->>A: Validate extension, MIME, signature, size, filename
  A->>D: Save UPLOADED document
  A->>Q: Enqueue document id after transaction commit
  A-->>U: 201 + processing status
  Q->>W: Execute processing task
  W->>W: Extract, normalize, chunk, embed
  W->>D: Atomically replace chunks/vectors, mark READY
```

Retries replace chunks in one database transaction, making the derived data idempotent. A failed task records a safe user-facing status while the detailed exception remains internal to the job record.

## RAG safety and retrieval

```mermaid
flowchart LR
  Q[Question] --> E[Question embedding]
  E --> V[Owner-scoped pgvector retrieval]
  V --> C[Context with source metadata]
  C --> L[LLM with fixed system instructions]
  L --> A[Answer + structured citations]
```

Retrieved document content is wrapped as untrusted data. The system prompt tells the model not to follow commands within excerpts, and the application never routes retrieved text into a tool or executable path. No results produces an explicit insufficiency response rather than a speculative answer.

## Data relationships

```mermaid
erDiagram
  USER ||--o{ DOCUMENT : owns
  USER ||--o{ COLLECTION : owns
  USER ||--o{ CONVERSATION : owns
  DOCUMENT ||--o{ DOCUMENT_CHUNK : contains
  DOCUMENT ||--o{ DOCUMENT_PROCESSING_JOB : tracks
  DOCUMENT ||--o{ DOCUMENT_SUMMARY : has
  COLLECTION }o--o{ DOCUMENT : groups
  DOCUMENT ||--o{ CONVERSATION : scopes
  CONVERSATION ||--o{ MESSAGE : contains
```

## Operational model

`/health/` proves that the web process can serve requests. `/ready/` checks database connectivity and returns `503` when the database is not available. Request middleware supplies an `X-Request-ID` and records endpoint, status, latency, and user id without logging credentials or document bodies.
