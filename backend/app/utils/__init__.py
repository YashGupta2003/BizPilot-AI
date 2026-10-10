from datetime import datetime, timezone, timedelta, date

# IST is UTC+5:30
IST = timezone(timedelta(hours=5, minutes=30))

def utc_now() -> datetime:
    """Returns the current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)

def ist_now() -> datetime:
    """Returns the current timezone-aware IST datetime."""
    return datetime.now(IST)

def ist_today() -> date:
    """Returns today's date in IST."""
    return ist_now().date()

def to_ist(dt: datetime) -> datetime:
    """Converts a given datetime to IST."""
    if dt.tzinfo is None:
        # Assume UTC if naive, per current system behavior
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST)

def get_indian_fy(dt: date) -> str:
    """Returns the Indian Financial Year (e.g., '2026-27') for a given date."""
    if dt.month >= 4:
        return f"{dt.year}-{str(dt.year + 1)[-2:]}"
    else:
        return f"{dt.year - 1}-{str(dt.year)[-2:]}"
