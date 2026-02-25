import requests
import os
import google.generativeai as genai
from datetime import datetime

# =========================
# CONFIGURE YOUR KEYS HERE
# =========================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

print("=" * 60)
print("AI PROVIDER DIAGNOSTICS")
print("=" * 60)


# =====================================================
# GEMINI CHECK
# =====================================================

def check_gemini():
    print("\n🔷 GEMINI CHECK")
    print("-" * 40)

    try:
        genai.configure(api_key=GEMINI_API_KEY)

        # List models
        models = list(genai.list_models())
        print(f"✅ API Key Valid")
        print(f"📦 Models Available: {len(models)}")

        for m in models[:5]:
            print(f"   - {m.name}")

        # Test lightweight call
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content("Hello")
        print("✅ Test Generation Success")

        print("⚠ Rate/Usage Info:")
        print("   Gemini Free Tier limits:")
        print("   - 5 RPM")
        print("   - 20 Requests per day")
        print("   (Usage must be checked in AI Studio dashboard)")

    except Exception as e:
        print(f"❌ Gemini Error: {str(e)}")


# =====================================================
# GROQ CHECK
# =====================================================

def check_groq():
    print("\n🟢 GROQ CHECK")
    print("-" * 40)

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        # List models
        res = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
        if res.status_code == 200:
            print("✅ API Key Valid")
            models = res.json()["data"]
            print(f"📦 Models Available: {len(models)}")

            for m in models[:5]:
                print(f"   - {m['id']}")

        else:
            print(f"❌ Model List Failed: {res.text}")
            return

        # Test simple completion
        payload = {
            "model": models[0]["id"],
            "messages": [{"role": "user", "content": "Hello"}]
        }

        test = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload
        )

        if test.status_code == 200:
            print("✅ Test Generation Success")

            # Rate limit headers
            print("⚠ Rate Limit Info (from headers):")
            for h in test.headers:
                if "rate" in h.lower():
                    print(f"   {h}: {test.headers[h]}")

        else:
            print(f"❌ Test Failed: {test.text}")

    except Exception as e:
        print(f"❌ Groq Error: {str(e)}")


# =====================================================
# OPENROUTER CHECK
# =====================================================

def check_openrouter():
    print("\n🟣 OPENROUTER CHECK")
    print("-" * 40)

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        # List models
        res = requests.get("https://openrouter.ai/api/v1/models", headers=headers)

        if res.status_code != 200:
            print(f"❌ Model Fetch Failed: {res.text}")
            return

        print("✅ API Key Valid")

        models = res.json()["data"]
        print(f"📦 Total Models: {len(models)}")

        free_models = []

        for m in models:
            pricing = m.get("pricing", {})
            if pricing.get("prompt") == "0":
                free_models.append(m["id"])

        print(f"🆓 Free Models Found: {len(free_models)}")
        for fm in free_models[:10]:
            print(f"   - {fm}")

        # Test lightweight call
        payload = {
            "model": free_models[0] if free_models else models[0]["id"],
            "messages": [{"role": "user", "content": "Hello"}]
        }

        test = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
        )

        if test.status_code == 200:
            print("✅ Test Generation Success")

            print("⚠ Rate Limit Headers:")
            for h in test.headers:
                if "rate" in h.lower():
                    print(f"   {h}: {test.headers[h]}")
        else:
            print(f"❌ Test Failed: {test.text}")

    except Exception as e:
        print(f"❌ OpenRouter Error: {str(e)}")


# =====================================================
# RUN ALL CHECKS
# =====================================================

check_gemini()
check_groq()
check_openrouter()

print("\n" + "=" * 60)
print("Diagnostics Complete")
print("=" * 60)