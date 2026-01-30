import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

INPUT_FILE = DATA_DIR / "input.json"
OUTPUT_FILE = DATA_DIR / "output.json"


def save_input(data: dict):
    DATA_DIR.mkdir(exist_ok=True)
    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def save_output(data: dict):
    DATA_DIR.mkdir(exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_input():
    if INPUT_FILE.exists():
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def load_output():
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return None
