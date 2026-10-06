import os, requests
from dotenv import load_dotenv
load_dotenv()

key = os.getenv("OPENROUTER_API_KEY")
url = "https://openrouter.ai/api/v1/chat/completions"
headers = {"Authorization": f"Bearer {key}"}

models = [
    "google/gemma-3-27b-it:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "qwen/qwen3-4b:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "meta-llama/llama-3.2-3b-instruct:free",
]

for m in models:
    try:
        r = requests.post(url, headers=headers, json={
            "model": m,
            "messages": [{"role": "user", "content": "Say hi"}],
            "max_tokens": 5,
        }, timeout=15)
        print(f"{m}: {r.status_code} - {r.text[:120]}")
    except Exception as e:
        print(f"{m}: ERROR - {e}")
