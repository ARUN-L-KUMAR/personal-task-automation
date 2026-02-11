from datetime import datetime

def parse_time(time_str: str) -> datetime:
    """
    Supports multiple time/datetime formats:
    - 10:00
    - 10:00 AM
    - 3:30 PM
    - 2026-01-30 09:00
    - 2026-01-30 09:00 AM
    - 30-01-2026 09:00
    """
    formats = [
        "%H:%M",              # 10:00
        "%I:%M %p",           # 10:00 AM
        "%Y-%m-%d %H:%M",     # 2026-01-30 09:00
        "%Y-%m-%d %I:%M %p",  # 2026-01-30 09:00 AM
        "%d-%m-%Y %H:%M",     # 30-01-2026 09:00
    ]

    for fmt in formats:
        try:
            return datetime.strptime(time_str, fmt)
        except ValueError:
            continue

    raise ValueError(f"Unsupported time format: {time_str}")
