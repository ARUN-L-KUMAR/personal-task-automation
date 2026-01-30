from datetime import datetime
import re

def normalize_time_string(time_str: str) -> str:
    """
    Normalizes time strings like:
    - 12:00pm  -> 12:00 PM
    - 11:00 Pm -> 11:00 PM
    - 9:00am   -> 9:00 AM
    """
    time_str = time_str.strip()

    # Insert space before am/pm if missing
    time_str = re.sub(r'(\d)(am|pm)$', r'\1 \2', time_str, flags=re.IGNORECASE)

    # Uppercase AM/PM
    time_str = time_str.upper()

    return time_str


def parse_time(time_str: str) -> datetime:
    """
    Supports:
    - 10:00
    - 10:00 AM
    - 10:00am
    - 10:00 Pm
    """
    time_str = normalize_time_string(time_str)

    formats = ["%H:%M", "%I:%M %p"]

    for fmt in formats:
        try:
            return datetime.strptime(time_str, fmt)
        except ValueError:
            continue

    raise ValueError(f"Unsupported time format: {time_str}")
