import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.conversations.services import rag
from apps.documents.models import Document, DocumentStatus
from apps.documents.services.persian import normalize_persian
from apps.documents.services.processing import process_document
from apps.documents.services.search import keyword_search, semantic_search


def test_normalizes_arabic_letters_digits_and_diacritics() -> None:
    assert normalize_persian("كتاب علي") == "کتاب علی"
    assert normalize_persian("سال ۱۴۰۳ و ٢٠٢٤") == "سال 1403 و 2024"
    assert normalize_persian("مُحَمَّد") == "محمد"
    assert normalize_persian("كـــتاب") == "کتاب"


def test_folds_pdf_presentation_forms_and_zwnj_noise() -> None:
    # "سلام" written with Arabic presentation-form glyphs, as some PDF text layers emit it.
    assert normalize_persian("\ufeb3\ufefc\ufee1") == "سلام"
    assert normalize_persian("می\u200c\u200cخواهم \u200cبروم") == "می\u200cخواهم بروم"


def _persian_document(owner) -> Document:
    text = "قرارداد اجاره دفتر مركزي براي مدت دو سال تمديد شد.\n\nهزینه ماهانه ۵۰ میلیون است."
    return Document.objects.create(
        owner=owner,
        filename="قرارداد.txt",
        original_filename="contract.txt",
        mime_type="text/plain",
        file_size=len(text.encode()),
        file=SimpleUploadedFile("contract.txt", text.encode("utf-8")),
    )


@pytest.mark.django_db
def test_persian_document_is_searchable_across_spelling_variants(user, settings) -> None:
    settings.AI_PROVIDER = "mock"
    settings.SEMANTIC_SEARCH_MAX_DISTANCE = 0.97
    document = _persian_document(user)
    process_document(document)
    document.refresh_from_db()
    assert document.status == DocumentStatus.READY
    # The document uses Arabic kaf/yeh; the query uses Persian letters.
    results = semantic_search(user_id=user.id, query="قرارداد دفتر مرکزی تمدید شد؟")
    assert [result.chunk.document_id for result in results] == [document.id]
    assert list(keyword_search(user_id=user.id, query="مرکزی"))
    assert list(keyword_search(user_id=user.id, query="50 میلیون"))


def test_local_provider_calls_openai_compatible_server(monkeypatch, settings) -> None:
    settings.AI_PROVIDER = "local"
    settings.LOCAL_LLM_BASE_URL = "http://ollama:11434/v1"
    settings.LOCAL_CHAT_MODEL = "qwen2.5:7b"
    captured: dict[str, object] = {}

    class Completions:
        def create(self, **kwargs):
            captured.update(kwargs)
            message = type("Message", (), {"content": "پاسخ مستند"})()
            return type("Response", (), {"choices": [type("Choice", (), {"message": message})()]})

    class Client:
        def __init__(self, **kwargs):
            captured["client"] = kwargs
            self.chat = type("Chat", (), {"completions": Completions()})()

    monkeypatch.setattr("openai.OpenAI", Client)
    answer = rag.chat_provider().answer(question="مدت قرارداد چقدر است؟", context="...")
    assert answer == "پاسخ مستند"
    assert captured["client"]["base_url"] == "http://ollama:11434/v1"
    assert captured["model"] == "qwen2.5:7b"
    assert "Persian" in captured["messages"][0]["content"]


def test_reply_language_follows_question_or_document() -> None:
    assert rag.reply_language("مبلغ ودیعه چقدر است؟") == "Persian (Farsi)"
    assert rag.reply_language("What is the deposit?") == "English"
    messages = rag._messages("Summarize this.", "این یک قرارداد اجاره است.", "summarization")
    assert messages[1]["content"].endswith("Write the reply in Persian (Farsi).")


@pytest.mark.django_db
def test_semantic_search_drops_chunks_far_from_the_best_match(user, settings, monkeypatch) -> None:
    settings.SEMANTIC_SEARCH_MAX_DISTANCE = 0.9
    settings.SEMANTIC_SEARCH_RELATIVE_MARGIN = 0.12
    settings.EMBEDDING_DIMENSIONS = 1536
    from apps.documents.models import DocumentChunk

    close, far = _persian_document(user), _persian_document(user)
    for document, vector in ((close, [1.0, 0.0]), (far, [0.6, 0.8])):
        document.status = DocumentStatus.READY
        document.save()
        DocumentChunk.objects.create(
            document=document,
            chunk_index=0,
            content="x",
            token_count=1,
            embedding=vector + [0.0] * 1534,
        )

    class Embeddings:
        def embed_one(self, _value):
            return [1.0, 0.0] + [0.0] * 1534

    monkeypatch.setattr("apps.documents.services.search.embedding_provider", lambda: Embeddings())
    # Distances: 0.0 for `close`, 0.4 for `far`; both under the absolute cut-off.
    results = semantic_search(user_id=user.id, query="ودیعه")
    assert [result.chunk.document_id for result in results] == [close.id]


def test_insufficient_evidence_message_matches_question_language(monkeypatch) -> None:
    monkeypatch.setattr(rag, "semantic_search", lambda **_kwargs: [])
    persian = rag.answer_question(user_id=1, question="قیمت دلار چند است؟").content
    assert persian == "اسناد موجود اطلاعات کافی برای پاسخ به این پرسش ندارند."
    assert "/" not in rag.answer_question(user_id=1, question="What is the dollar rate?").content
