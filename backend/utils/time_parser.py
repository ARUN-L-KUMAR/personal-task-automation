from datetime import datetime

def parse_time(time_str: str) -> datetime:
    """
    Supports:
    - 10:00
    - 10:00 AM
    - 3:30 PM
    """
    formats = ["%H:%M", "%I:%M %p"]

    for fmt in formats:
        try:
            return datetime.strptime(time_str, fmt)
        except ValueError:
            continue

    raise ValueError(f"Unsupported time format: {time_str}")
