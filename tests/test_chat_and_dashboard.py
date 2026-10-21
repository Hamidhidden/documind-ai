import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.conversations.models import Conversation, Message, MessageRole
from apps.conversations.services import rag
from apps.documents.models import Document, DocumentStatus


class RecordingProvider(rag.ChatProvider):
    def __init__(self) -> None:
        self.calls: list[list[dict[str, str]]] = []

    def complete(self, messages: list[dict[str, str]]) -> str:
        self.calls.append(messages)
        if messages[0]["content"] == rag.REWRITE_INSTRUCTIONS:
            return "اجاره‌بهای سال دوم قرارداد دفتر چقدر است؟"
        return "پاسخ [1]"


def test_follow_up_is_rewritten_for_search_and_answered_with_history(monkeypatch) -> None:
    provider = RecordingProvider()
    searched: list[str] = []
    monkeypatch.setattr(rag, "chat_provider", lambda: provider)
    monkeypatch.setattr(
        rag, "semantic_search", lambda **kwargs: searched.append(kwargs["query"]) or []
    )
    history = [
        rag.Turn("user", "اجاره ماهانه دفتر چقدر است؟"),
        rag.Turn("assistant", "۵۰ میلیون تومان [1]"),
    ]
    answer = rag.answer_question(user_id=1, question="و سال دوم؟", history=history)
    assert searched == ["و سال دوم؟", "اجاره‌بهای سال دوم قرارداد دفتر چقدر است؟"]
    # Nothing was retrieved, so the answer step is skipped with a Persian fallback.
    assert answer.content == rag.insufficient_evidence("و سال دوم؟")
    assert len(provider.calls) == 1


def test_answer_prompt_includes_recent_history_before_the_question() -> None:
    history = [rag.Turn("user", f"question {index}") for index in range(10)]
    messages = rag._messages("latest?", "[Source 1: a.txt, page n/a]\ntext", "answer", history)
    assert messages[0]["role"] == "system"
    assert [message["content"] for message in messages[1:-1]] == [
        f"question {index}" for index in range(4, 10)
    ]
    assert "latest?" in messages[-1]["content"]


def test_first_question_is_not_rewritten() -> None:
    assert RecordingProvider().standalone_question("سلام", []) == "سلام"


def test_translated_rewrite_is_discarded() -> None:
    class Translator(RecordingProvider):
        def complete(self, messages: list[dict[str, str]]) -> str:
            return "چگونه دورکاری را مدیریت می‌کنید؟"

    history = [rag.Turn("user", "اجاره ماهانه چقدر است؟")]
    assert Translator().standalone_question("What about remote work?", history) == (
        "What about remote work?"
    )


@pytest.mark.django_db
def test_conversation_passes_previous_turns_to_rag(client_for, monkeypatch) -> None:
    seen: list[list[rag.Turn]] = []

    def fake_answer(**kwargs):
        seen.append(list(kwargs["history"]))
        return rag.RAGAnswer(content="ok", citations=[])

    monkeypatch.setattr("apps.conversations.views.answer_question", fake_answer)
    conversation = client_for.post("/api/v1/conversations/", {}, format="json").data["id"]
    for content in ("first", "second"):
        client_for.post(
            f"/api/v1/conversations/{conversation}/messages/", {"content": content}, format="json"
        )
    assert seen[0] == []
    assert seen[1] == [rag.Turn("user", "first"), rag.Turn("assistant", "ok")]


@pytest.mark.django_db
def test_dashboard_reports_owned_workspace_only(client_for, user, other_user) -> None:
    for owner, name in ((user, "a.pdf"), (user, "b.txt"), (other_user, "secret.txt")):
        Document.objects.create(
            owner=owner,
            filename=name,
            original_filename=name,
            mime_type="text/plain",
            file_size=1000,
            status=DocumentStatus.READY,
            page_count=2,
            file=SimpleUploadedFile(name, b"x"),
        )
    cited = Document.objects.get(filename="a.pdf")
    conversation = Conversation.objects.create(owner=user)
    for question, sources in (("covered?", [cited]), ("gap?", [])):
        Message.objects.create(conversation=conversation, role=MessageRole.USER, content=question)
        Message.objects.create(
            conversation=conversation,
            role=MessageRole.ASSISTANT,
            content="answer",
            sources=[
                {"document_id": str(doc.id), "document_name": doc.filename} for doc in sources
            ],
        )

    data = client_for.get("/api/v1/dashboard/").data
    assert data["documents"]["total"] == 2
    assert data["documents"]["storage_bytes"] == 2000
    assert data["documents"]["by_type"] == {"pdf": 1, "txt": 1}
    assert data["questions"] == {"total": 2, "answered": 1, "answer_rate": 0.5}
    assert data["top_documents"] == [{"id": str(cited.id), "filename": "a.pdf", "citations": 1}]
    assert [gap["question"] for gap in data["knowledge_gaps"]] == ["gap?"]
    assert len(data["activity"]) == 14 and data["activity"][-1]["questions"] == 2


@pytest.mark.django_db
def test_api_errors_follow_accept_language(client_for) -> None:
    english = client_for.post(
        "/api/v1/collections/", {}, format="json", HTTP_ACCEPT_LANGUAGE="en"
    ).data
    persian = client_for.post(
        "/api/v1/collections/", {}, format="json", HTTP_ACCEPT_LANGUAGE="fa"
    ).data
    assert english["error"]["details"]["name"] == ["This field is required."]
    assert persian["error"]["details"]["name"] != english["error"]["details"]["name"]


def _results(*names: str) -> list:
    from types import SimpleNamespace
    from uuid import uuid4

    return [
        SimpleNamespace(
            chunk=SimpleNamespace(
                id=uuid4(),
                document_id=uuid4(),
                document=SimpleNamespace(filename=name),
                page_number=None,
                content=f"text of {name}",
            ),
            score=0.5,
        )
        for name in names
    ]


def test_refusal_carries_no_sources() -> None:
    refusal = "اسناد موجود اطلاعات کافی برای پاسخ به این پرسش ندارند."
    answer = rag._finalize(f"متأسفم. {refusal}", _results("a.txt"), "بیمه چطور است؟")
    assert answer == rag.RAGAnswer(refusal, [])


def test_only_cited_sources_are_returned_and_renumbered() -> None:
    results = _results("a.txt", "b.docx", "c.pdf")
    content = "Rent is 50 [3]. Deposit is 500 [3][1].\n\n[3] c.pdf, clause 3"
    answer = rag._finalize(content, results, "What is the rent?")
    assert answer.content == "Rent is 50 [2]. Deposit is 500 [2][1]."
    assert [source["document_name"] for source in answer.citations] == ["a.txt", "c.pdf"]


def test_uncited_reply_is_treated_as_refusal_and_reference_lines_are_dropped() -> None:
    content = "I could not find information about insurance.\n[1] hr-policy, clause 1"
    answer = rag._finalize(content, _results("a.txt", "b.docx"), "What about insurance?")
    assert answer == rag.RAGAnswer("I could not find information about insurance.", [])


@pytest.mark.parametrize(
    ("content", "refusal"),
    [
        ("قیمت دلار امروز در این متن ذکر نشده است. [1] بهتر است از بانک بپرسید.", True),
        ("The excerpts do not mention insurance [1].", True),
        ("Remote work is allowed two days a week [1]. No other details were mentioned.", False),
        ("مبلغ ودیعه ۵۰۰ میلیون تومان است [1].", False),
    ],
)
def test_cited_refusal_is_recognized_from_its_first_sentence(content, refusal) -> None:
    answer = rag._finalize(content, _results("a.txt"), "q")
    assert (answer.citations == []) is refusal
