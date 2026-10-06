import os, requests
from dotenv import load_dotenv
load_dotenv()

key = os.getenv("OPENROUTER_API_KEY")
url = "https://openrouter.ai/api/v1/chat/completions"
headers = {"Authorization": f"Bearer {key}"}

models = [
    "nvidia/nemotron-nano-9b-v2:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "google/gemma-3-4b-it:free",
    "openai/gpt-oss-20b:free",
    "stepfun/step-3.5-flash:free",
]

for m in models:
    try:
        r = requests.post(url, headers=headers, json={
            "model": m,
            "messages": [{"role": "user", "content": "Say hi"}],
            "max_tokens": 5,
        }, timeout=20)
        status = r.status_code
        body = r.text[:150]
        ok = "200" if status == 200 else str(status)
        print(f"  {ok}  {m}")
        if status != 200:
            print(f"       {body[:100]}")
    except Exception as e:
        print(f"  ERR  {m} - {e}")
