# DocuMind

DocuMind is a production-oriented AI document intelligence platform. Upload private PDF, TXT, DOCX, or Markdown files, organize them into collections, retrieve them semantically, and ask grounded questions that include structured source citations.

It is intentionally designed as a real portfolio project: a Django/DRF API with PostgreSQL + pgvector, Redis/Celery background processing, JWT authentication, a polished Next.js client, Docker Compose, CI, and focused tests.

## Features

- JWT registration, login, refresh, logout, profile management, and owner-enforced resources
- Defensive document upload validation: extension, MIME, format signature, safe filename, and configurable limits
- Non-blocking extraction pipeline with PDF, TXT, DOCX, and Markdown extractors
- Configurable overlapping chunking, deterministic retries, idempotent derived-data replacement, and status tracking
- OpenAI embedding/chat providers behind interfaces plus deterministic local mock providers for tests
- pgvector cosine similarity retrieval with owner, document, and collection filters; keyword search is available now and hybrid search can build on the same service boundary
- Grounded document/global chat, persisted conversations/messages, citations, and evidence-insufficiency behavior
- Short, detailed, key-point, and executive summaries; large summaries run through Celery
- Next.js + TypeScript + Tailwind interface with auth, dashboard, uploads, processing states, search, collections, chat, citations, and profile settings

## Architecture

```mermaid
flowchart LR
  UI[Next.js + TypeScript] --> API[Django REST API]
  API --> DB[(PostgreSQL + pgvector)]
  API --> Q[Redis]
  Q --> Worker[Celery]
  Worker --> DB
  Worker --> AI[OpenAI]
```

See [docs/architecture.md](docs/architecture.md) for the data model, processing sequence, RAG safety boundary, and operational model.

## Quick start with Docker

```bash
cp .env.example .env
docker compose up --build
```

Open the client at `http://localhost:3000`, API documentation at `http://localhost:8000/api/docs/`, and the OpenAPI schema at `http://localhost:8000/api/schema/`.

For a credential-free local experience, leave `AI_PROVIDER=mock`: it uses a simple word-overlap embedding so search and chat still work (answers are the best matching excerpts, not generated text). In a deployment, set `AI_PROVIDER=openai` and supply `OPENAI_API_KEY`; the OpenAI providers are already implemented and selected by configuration.

## Local backend development

Requirements: Python 3.12+, PostgreSQL with the `vector` extension, and Redis. The quickest way to get the two services is Docker: `docker compose up -d postgres redis` (then add `ports` for them, or run your own).

```bash
python -m venv .venv
.venv/bin/pip install -e ".[dev]"          # Windows: .venv\Scripts\pip install -e ".[dev]"
cp .env.example .env                        # Windows: copy .env.example .env
# In .env set POSTGRES_HOST=localhost and REDIS_URL=redis://localhost:6379/0
python src/manage.py migrate
python src/manage.py runserver
# In a second terminal, from the src directory:
cd src && celery -A config.celery worker --loglevel=INFO   # Windows: add --pool=solo
```

Settings read `.env` from the repository root automatically; real environment variables take precedence. If you do not want to run a worker, set `CELERY_TASK_ALWAYS_EAGER=true` so uploads are processed inside the API request.

On Windows, activate the virtual environment using `.venv\Scripts\Activate.ps1`.

## Local frontend development

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` if the API is not on `http://localhost:8000/api/v1`.

## API outline

All application routes are versioned under `/api/v1/`.

| Area | Representative routes |
| --- | --- |
| Authentication | `auth/register/`, `auth/login/`, `auth/refresh/`, `auth/logout/`, `auth/me/` |
| Documents | `documents/`, `documents/{id}/`, `documents/{id}/download/`, `documents/{id}/processing_status/`, `documents/{id}/summarize/` |
| Search | `search/?q=...&mode=semantic` or `mode=keyword` |
| Collections | `collections/`, `collections/{id}/documents/` |
| Conversations | `conversations/`, `conversations/{id}/messages/` |

Schema and interactive documentation live at `/api/schema/` and `/api/docs/`.

## RAG and security model

For a question, DocuMind creates an embedding, retrieves owner-scoped chunks by cosine distance, constructs a labelled context, calls the chat provider, and returns the answer with document id, document name, page, and chunk id citations.

Uploaded text is untrusted. System instructions, user question, and retrieved text are sent in distinct prompt regions. The system instruction explicitly rejects instructions from documents, retrieval is never passed into executable tooling, and missing evidence returns a clear insufficiency message. Server querysets always apply ownership before a document, collection, chunk, conversation, or summary is returned.

Other protections include short-lived access JWTs, rotated/blacklisted refresh tokens, Django password validation, CORS and CSRF configuration, safe errors, filename and signature validation, configurable upload caps, no secrets in the repository, and request correlation without logging sensitive bodies.

## Quality checks

```bash
ruff check src tests
black --check src tests
mypy src
pytest
```

The test suite covers registration/password hashing, anonymous access, ownership isolation, upload queueing and file rejection, chunk overlap, RAG insufficiency behavior, and the prompt boundary. CI runs these checks and builds both Docker images.

## Project structure

```text
src/
  apps/accounts/       authentication and profile API
  apps/documents/      storage, extraction, chunks, embeddings, search, tasks
  apps/collections/    document grouping
  apps/conversations/  RAG, persisted chat, summaries
  apps/shared/         health, errors, structured request context
  config/              Django and Celery configuration
frontend/              Next.js App Router client
docs/                  architecture decision documentation
tests/                 API, domain, and RAG safety tests
```

## Limitations and roadmap

The included `mock` AI providers enable reliable development and tests but are not semantic models; use the configured OpenAI provider for real retrieval quality. File storage is local Docker-volume storage, suitable for the single-node deployment described here. A next production iteration would add S3-compatible object storage, antivirus scanning, a rate-limit backend, hybrid ranking, team sharing, analytics, and billing.

## License

Released under the [MIT License](LICENSE).

