from __future__ import annotations

import hashlib
import math
import re
from abc import ABC, abstractmethod

from django.conf import settings


class EmbeddingProvider(ABC):
    @abstractmethod
    def embed_many(self, values: list[str]) -> list[list[float]]: ...

    def embed_one(self, value: str) -> list[float]:
        return self.embed_many([value])[0]


class OpenAIEmbeddingProvider(EmbeddingProvider):
    def embed_many(self, values: list[str]) -> list[list[float]]:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is required when AI_PROVIDER=openai.")
        from openai import OpenAI

        response = OpenAI(api_key=settings.OPENAI_API_KEY).embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=values,
            dimensions=settings.EMBEDDING_DIMENSIONS,
        )
        return [item.embedding for item in response.data]


class MockEmbeddingProvider(EmbeddingProvider):
    """Deterministic local embeddings used only for tests and credential-free development.

    Words are hashed into a bag-of-words vector, so texts that share vocabulary are close in
    cosine space. This keeps search and chat usable without an API key.
    """

    def embed_many(self, values: list[str]) -> list[list[float]]:
        return [self._embed(value) for value in values]

    @staticmethod
    def _embed(value: str) -> list[float]:
        dimensions = settings.EMBEDDING_DIMENSIONS
        vector = [0.0] * dimensions
        for word in re.findall(r"\w{3,}", value.lower()):
            if word in _STOPWORDS:
                continue
            digest = hashlib.sha256(word.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % dimensions
            vector[index] += 1.0 if digest[4] % 2 == 0 else -1.0
        norm = math.sqrt(sum(item * item for item in vector))
        if not norm:
            # pgvector cannot compute cosine distance for a zero vector.
            vector[0] = 1.0
            return vector
        return [item / norm for item in vector]


_STOPWORDS = frozenset(
    "the and for are but not you all any can had her was one our out has have this that with "
    "what when where which who why how from they them their there these those into about would "
    "could should does did its it's also than then been being were will just".split()
)


def embedding_provider() -> EmbeddingProvider:
    if settings.AI_PROVIDER == "openai":
        return OpenAIEmbeddingProvider()
    return MockEmbeddingProvider()
