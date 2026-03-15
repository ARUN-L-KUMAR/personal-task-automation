"""
Benchmark all 7 AI models for the Personal Task Assistant.
Tests: speed, quality, structured output, reasoning ability.
"""
import time, json, os
from dotenv import load_dotenv
load_dotenv()

from config.settings import (
    llm, llm_gemini_25_flash, llm_gemini_25_lite,
    llm_openrouter, llm_openrouter_alt, llm_openrouter_alt2, llm_heavy
)

MODELS = [
    ("Groq (Llama 3.3 70B)",       "groq",              llm),
    ("Gemini 2.5 Flash",           "gemini-flash",      llm_gemini_25_flash),
    ("Gemini 2.5 Flash Lite",      "gemini-lite",       llm_gemini_25_lite),
    ("Nemotron 30B (OpenRouter)",   "openrouter",        llm_openrouter),
    ("Trinity Large (OpenRouter)",  "openrouter-alt",    llm_openrouter_alt),
    ("Solar Pro 3 (OpenRouter)",    "openrouter-alt2",   llm_openrouter_alt2),
]

# Realistic personal assistant test prompt
TEST_PROMPT = """You are G-One, a personal task assistant. Here is the user's live data:

UPCOMING CALENDAR EVENTS:
- Team standup @ 2026-02-25T09:00:00
- Client presentation @ 2026-02-25T14:00:00
- Dentist @ 2026-02-25T16:30:00

PENDING TASKS:
- Finish quarterly report (due today)
- Review PR #142
- Buy groceries

RECENT UNREAD EMAILS:
- "Urgent: Budget review needed" [from boss@company.com]
- "Meeting rescheduled" [from client@corp.com]

User asks: "I'm feeling overwhelmed. Help me plan my day and tell me what to prioritize."

Reply with clear structure, bullet points, and actionable advice. Be concise."""

def score_response(content):
    """Score response quality 0-10."""
    score = 0
    words = len(content.split())
    
    # Length: not too short, not too long
    if 30 < words < 300: score += 2
    elif 15 < words: score += 1
    
    # Structure (bullet points, bold, numbered lists)
    if any(c in content for c in ["- ", "* ", "• "]): score += 2
    if any(c in content for c in ["**", "##"]): score += 1
    if any(f"{i}." in content for i in range(1, 6)): score += 1
    
    # Mentions key items from context
    mentions = 0
    for kw in ["standup", "presentation", "client", "dentist", "report", "quarterly", 
                "budget", "email", "boss", "PR", "groceries", "rescheduled"]:
        if kw.lower() in content.lower():
            mentions += 1
    if mentions >= 5: score += 2
    elif mentions >= 3: score += 1
    
    # Actionable advice (time-based, priority-based)
    if any(kw in content.lower() for kw in ["priority", "first", "before", "morning", "afternoon"]): 
        score += 1
    if any(kw in content.lower() for kw in ["urgent", "important", "deadline"]): 
        score += 1
    
    return min(score, 10)

print("=" * 80)
print("MODEL BENCHMARK — Personal Task Assistant")
print("=" * 80)
print()

results = []

for name, key, model in MODELS:
    print(f"Testing: {name}...", end=" ", flush=True)
    try:
        start = time.time()
        resp = model.invoke(TEST_PROMPT)
        elapsed = round(time.time() - start, 1)
        content = resp.content
        quality = score_response(content)
        words = len(content.split())
        
        print(f"✅ {elapsed}s | Quality: {quality}/10 | Words: {words}")
        results.append({
            "name": name, "key": key, "time": elapsed, 
            "quality": quality, "words": words, "status": "OK",
            "preview": content.replace("\n", " ")[:120]
        })
    except Exception as e:
        err = str(e)[:100]
        elapsed = round(time.time() - start, 1)
        print(f"❌ {elapsed}s | {err}")
        results.append({
            "name": name, "key": key, "time": elapsed,
            "quality": 0, "words": 0, "status": "FAIL", "error": err
        })

# Rank by composite score: quality * 2 + speed_bonus
print("\n" + "=" * 80)
print("RANKING (best → worst)")
print("=" * 80)

working = [r for r in results if r["status"] == "OK"]
failed = [r for r in results if r["status"] != "OK"]

# Composite: quality (0-10) weighted heavily, speed as tiebreaker
for r in working:
    speed_bonus = max(0, (15 - r["time"]) / 15) * 2  # 0-2 bonus for speed
    r["composite"] = r["quality"] + speed_bonus

working.sort(key=lambda x: x["composite"], reverse=True)

for i, r in enumerate(working, 1):
    bar = "█" * r["quality"] + "░" * (10 - r["quality"])
    print(f"  {i}. {r['name']:<35} Quality: {bar} {r['quality']}/10  Speed: {r['time']}s  Score: {r['composite']:.1f}")
    print(f"     Preview: {r['preview']}")
    print()

if failed:
    print("  FAILED:")
    for r in failed:
        print(f"     ✗ {r['name']} — {r.get('error', 'unknown')}")

print("\n" + "=" * 80)
print("RECOMMENDED AUTO FALLBACK ORDER:")
print("=" * 80)
for i, r in enumerate(working, 1):
    print(f"  {i}. {r['name']:<35} (quality={r['quality']}, speed={r['time']}s)")
