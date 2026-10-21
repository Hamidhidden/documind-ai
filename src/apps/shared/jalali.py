"""Jalali (Solar Hijri) to Gregorian conversion, without a third-party calendar library."""

from __future__ import annotations

from datetime import date


def jalali_to_gregorian(year: int, month: int, day: int) -> date:
    """Convert a Jalali date; raises ValueError for an impossible one (e.g. 1404-07-31)."""
    if not (1 <= month <= 12 and 1 <= day <= (31 if month <= 6 else 30)):
        raise ValueError(f"Invalid Jalali date {year}-{month}-{day}.")
    year += 1595
    days = (
        -355668
        + 365 * year
        + (year // 33) * 8
        + ((year % 33) + 3) // 4
        + day
        + ((month - 1) * 31 if month < 7 else (month - 7) * 30 + 186)
    )
    gregorian_year = 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        days -= 1
        gregorian_year += 100 * (days // 36524)
        days %= 36524
        if days >= 365:
            days += 1
    gregorian_year += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gregorian_year += (days - 1) // 365
        days = (days - 1) % 365
    day_of_year = days + 1
    leap = gregorian_year % 4 == 0 and (gregorian_year % 100 != 0 or gregorian_year % 400 == 0)
    month_lengths = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    gregorian_month = 1
    for length in month_lengths:
        if day_of_year <= length:
            break
        day_of_year -= length
        gregorian_month += 1
    result = date(gregorian_year, gregorian_month, day_of_year)
    # Esfand 30 exists only in leap years: reject it when it rolled into Farvardin.
    if month == 12 and day == 30 and (result.month, result.day) >= (3, 21):
        following = jalali_to_gregorian(year - 1595 + 1, 1, 1)
        if result >= following:
            raise ValueError(f"Esfand 30 does not exist in {year - 1595}.")
    return result


def parse_iso_date(value: object, *, jalali: bool) -> date | None:
    """Parse `YYYY-MM-DD` (Persian or Latin digits) as a Jalali or Gregorian date."""
    if not isinstance(value, str):
        return None
    digits = value.strip().translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    parts = digits.replace("/", "-").split("-")
    if len(parts) != 3 or not all(part.isdigit() for part in parts):
        return None
    year, month, day = (int(part) for part in parts)
    try:
        return jalali_to_gregorian(year, month, day) if jalali else date(year, month, day)
    except ValueError:
        return None
