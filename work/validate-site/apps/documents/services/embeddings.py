from __future__ import annotations

import hashlib
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
    """Deterministic local embeddings used only for tests and credential-free development."""

    def embed_many(self, values: list[str]) -> list[list[float]]:
        return [self._embed(value) for value in values]

    @staticmethod
    def _embed(value: str) -> list[float]:
        seed = hashlib.sha512(value.lower().encode("utf-8")).digest()
        return [((seed[index % len(seed)] / 255) * 2) - 1 for index in range(settings.EMBEDDING_DIMENSIONS)]


def embedding_provider() -> EmbeddingProvider:
    if settings.AI_PROVIDER == "openai":
        return OpenAIEmbeddingProvider()
    return MockEmbeddingProvider()

