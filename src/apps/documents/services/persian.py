"""Persian (Farsi) text normalization applied to documents and queries alike.

Persian text arrives in many encodings of "the same" word: Arabic yeh/kaf from Arabic
keyboards, presentation-form glyphs from PDF extraction, Persian or Arabic-Indic digits, and
optional diacritics. Normalizing both sides makes search and retrieval match reliably.
"""

from __future__ import annotations

import re
import unicodedata

_CHARACTER_MAP = str.maketrans(
    {
        "\u064a": "\u06cc",  # Arabic yeh -> Persian yeh
        "\u0649": "\u06cc",  # Alef maksura -> Persian yeh
        "\u0643": "\u06a9",  # Arabic kaf -> Persian keheh
        "\u0640": None,  # Tatweel (kashida)
        **{chr(0x06F0 + digit): str(digit) for digit in range(10)},  # Persian digits
        **{chr(0x0660 + digit): str(digit) for digit in range(10)},  # Arabic-Indic digits
    }
)
# Harakat, tanween, sukun and superscript alef: optional marks that break exact matching.
_DIACRITICS = re.compile("[\u064b-\u0652\u0670]")
# Repeated zero-width non-joiners and stray ones next to spaces.
_ZWNJ_NOISE = re.compile("\u200c{2,}|\u200c(?=\\s)|(?<=\\s)\u200c")


def normalize_persian(value: str) -> str:
    # NFKC folds Arabic presentation forms (common in PDF text layers) into base letters.
    value = unicodedata.normalize("NFKC", value)
    value = value.translate(_CHARACTER_MAP)
    value = _DIACRITICS.sub("", value)
    return _ZWNJ_NOISE.sub(lambda match: "\u200c" if len(match.group()) > 1 else "", value)
