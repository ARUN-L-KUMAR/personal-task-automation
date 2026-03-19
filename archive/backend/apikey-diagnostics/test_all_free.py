"""
Test all OpenRouter free models for the Personal Task Assistant project.
Evaluates: availability, response quality, speed, and suitability.
"""
import os, requests, time, json
from dotenv import load_dotenv
load_dotenv()

key = os.getenv("OPENROUTER_API_KEY")
url = "https://openrouter.ai/api/v1/chat/completions"
headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

# Get all free models
r = requests.get("https://openrouter.ai/api/v1/models")
all_models = r.json().get("data", [])
free_models = [m for m in all_models if ":free" in m.get("id", "")]

print(f"Found {len(free_models)} free models. Testing each...\n")
print(f"{'Model':<55} {'Status':<8} {'Time':<7} {'Quality'}")
print("-" * 120)

# Test prompt - representative of what the chatbot does
test_prompt = """You are a personal task assistant. The user has these upcoming events:
- Team standup @ 9:00 AM
- Dentist appointment @ 2:00 PM
- Project deadline tomorrow

User asks: "What should I prioritize today?"
Reply concisely with actionable advice in 2-3 sentences."""

results = []

for m in sorted(free_models, key=lambda x: x["id"]):
    model_id = m["id"]
    model_name = m.get("name", "?")
    ctx = m.get("context_length", 0)
    
    try:
        start = time.time()
        resp = requests.post(url, headers=headers, json={
            "model": model_id,
            "messages": [
                {"role": "system", "content": "You are a helpful personal assistant."},
                {"role": "user", "content": test_prompt}
            ],
            "max_tokens": 200,
            "temperature": 0.4,
        }, timeout=30)
        elapsed = round(time.time() - start, 1)
        
        if resp.status_code == 200:
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            # Quality check: does it give actionable advice?
            word_count = len(content.split())
            has_structure = any(c in content for c in ["1.", "- ", "* ", "**"])
            quality = "GOOD" if word_count > 15 and has_structure else ("OK" if word_count > 10 else "WEAK")
            preview = content.replace("\n", " ")[:80]
            print(f"{model_id:<55} {'OK':<8} {elapsed:<7} {quality:<6} {preview}")
            results.append({
                "id": model_id, "name": model_name, "status": "OK",
                "time": elapsed, "quality": quality, "ctx": ctx,
                "response": content[:200], "words": word_count
            })
        else:
            err = resp.json().get("error", {}).get("code", resp.status_code)
            print(f"{model_id:<55} {err:<8} {elapsed:<7} --")
            results.append({"id": model_id, "name": model_name, "status": str(err), "time": elapsed})
    except requests.exceptions.Timeout:
        print(f"{model_id:<55} {'TIMEOUT':<8} {'30+':<7} --")
        results.append({"id": model_id, "name": model_name, "status": "TIMEOUT"})
    except Exception as e:
        print(f"{model_id:<55} {'ERROR':<8} {'--':<7} {str(e)[:50]}")
        results.append({"id": model_id, "name": model_name, "status": "ERROR"})

# Summary
print("\n" + "=" * 80)
print("TOP WORKING MODELS (sorted by speed)")
print("=" * 80)
working = [r for r in results if r.get("status") == "OK"]
working.sort(key=lambda x: x["time"])

for i, w in enumerate(working, 1):
    q = w.get("quality", "?")
    star = " ⭐" if q == "GOOD" else ""
    print(f"  {i}. {w['id']:<50} {w['time']}s  {q}{star}  (ctx:{w.get('ctx',0)})")

print(f"\n✅ {len(working)}/{len(free_models)} models working")
print(f"❌ {len(free_models) - len(working)} rate-limited or failed")
