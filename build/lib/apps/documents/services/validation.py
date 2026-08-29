"""Defensive validation for untrusted uploads."""
from __future__ import annotations

import mimetypes
import re
from dataclasses import dataclass
from pathlib import PurePath

from django.conf import settings
from rest_framework.exceptions import ValidationError
from rest_framework.fields import FileField


@dataclass(frozen=True)
class FileType:
    extension: str
    mime_types: frozenset[str]


SUPPORTED_TYPES = {
    ".pdf": FileType(".pdf", frozenset({"application/pdf"})),
    ".txt": FileType(".txt", frozenset({"text/plain"})),
    ".md": FileType(".md", frozenset({"text/markdown", "text/plain"})),
    ".markdown": FileType(".markdown", frozenset({"text/markdown", "text/plain"})),
    ".docx": FileType(
        ".docx",
        frozenset({"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),
    ),
}


def safe_filename(name: str) -> str:
    basename = PurePath(name).name
    cleaned = re.sub(r"[^A-Za-z0-9._ -]", "_", basename).strip(". ")
    if not cleaned or len(cleaned) > 255:
        raise ValidationError({"file": "Filename is invalid."})
    return cleaned


def _looks_like_expected_file(upload: FileField, extension: str) -> bool:
    header = upload.read(8)
    upload.seek(0)
    if extension == ".pdf":
        return header.startswith(b"%PDF-")
    if extension == ".docx":
        return header.startswith(b"PK")
    if extension in {".txt", ".md", ".markdown"}:
        try:
            header.decode("utf-8")
        except UnicodeDecodeError:
            return False
    return True


def validate_upload(upload: FileField) -> tuple[str, str]:
    original_filename = safe_filename(upload.name)
    extension = PurePath(original_filename).suffix.lower()
    file_type = SUPPORTED_TYPES.get(extension)
    if file_type is None:
        raise ValidationError({"file": "Only PDF, TXT, DOCX, and Markdown files are supported."})
    if upload.size > settings.MAX_UPLOAD_BYTES:
        raise ValidationError({"file": f"File exceeds {settings.MAX_UPLOAD_BYTES // 1024 // 1024}MB limit."})
    reported_mime = (getattr(upload, "content_type", "") or "").lower()
    guessed_mime, _ = mimetypes.guess_type(original_filename)
    if reported_mime and reported_mime not in file_type.mime_types and reported_mime != "application/octet-stream":
        raise ValidationError({"file": "File MIME type does not match its extension."})
    if guessed_mime and guessed_mime not in file_type.mime_types:
        raise ValidationError({"file": "File extension has an unsafe MIME type."})
    if not _looks_like_expected_file(upload, extension):
        raise ValidationError({"file": "File contents do not match its claimed format."})
    return original_filename, next(iter(file_type.mime_types)) if not reported_mime else reported_mime

