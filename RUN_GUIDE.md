# 🚀 Quick Run Guide

## Prerequisites Setup (One-Time)

```powershell
# 1. Navigate to backend
cd "c:\Users\arunk\Downloads\Final-Year Project\Personal_Task\backend"

# 2. Create & activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup API key
# Create .env file with your OpenRouter API key:
"OPENROUTER_API_KEY=your_key_here" | Out-File -FilePath .env -Encoding utf8
```

Get free API key: https://openrouter.ai/

---

## 💻 Running CLI (Command Line Interface)

### Quick Start
```powershell
cd backend
.\venv\Scripts\activate
python cli.py
```

### What You Can Do:
1. **Manual Input** - Enter your schedule interactively
2. **Sample Scenarios** - Test with pre-made data
3. **Save Results** - Export analysis to JSON

### Example Session:
```
🤖 AI Personal Task Automation (Multi-Agent CLI)

Choose input method:
   1. Enter schedule manually
   2. Use sample scenario
   3. Exit

Your choice (1-3): 2

Select scenario:
   1. light_day (1 meeting, 1 task)
   2. busy_day (3 meetings, 3 tasks) ⭐ Recommended
   3. travel_heavy (4 meetings, 2 tasks)

Select scenario number: 2

[AI agents analyze your schedule...]
[Results displayed with insights and recommendations]
```

---

## 🌐 Running API (Web Service)

### Start Server
```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload
```

Server runs at: **http://127.0.0.1:8000**

### Test in Browser
Open: **http://127.0.0.1:8000/docs**

This opens Swagger UI where you can:
- See all API endpoints
- Test with interactive forms
- View JSON responses

### Test with PowerShell
```powershell
# Simple test
$body = @{
    meetings = @(
        @{title = "Team Meeting"; time = "10:00 AM"; location = "Office"}
    )
    tasks = @(
        @{title = "Complete Report"; deadline = "5:00 PM"}
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/plan-day" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

---

## 🎯 Quick Test Commands

### Test 1: Light Schedule (No Conflicts)
```powershell
python cli.py
# Choose option 2
# Select scenario 1 (light_day)
```

### Test 2: Busy Schedule (With Conflicts)
```powershell
python cli.py
# Choose option 2
# Select scenario 2 (busy_day)
```

### Test 3: Manual Input
```powershell
python cli.py
# Choose option 1
# Enter your own meetings and tasks
```

---

## 📁 Project Structure

```
Personal_Task/backend/
├── cli.py              ← Run this for CLI
├── main.py             ← Run with uvicorn for API
├── config/
│   └── settings.py     ← LLM configuration
├── agents/             ← 6 AI agents
├── graph/
│   └── agent_graph.py  ← Workflow orchestration
├── data/
│   └── sample_data.json ← Test scenarios
└── .env                ← Your API key here
```

---

## 🔍 Quick Diagnostics

### Check if Everything is Setup
```powershell
# 1. Check Python
python --version  # Should be 3.8+

# 2. Check venv is active
echo $env:VIRTUAL_ENV  # Should show path to venv

# 3. Check key packages
pip list | Select-String "langchain|langgraph|fastapi"

# 4. Check .env file
if (Test-Path .env) { "✅ .env exists" } else { "❌ .env missing" }

# 5. Test API key
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('✅ API key loaded' if os.getenv('OPENROUTER_API_KEY') else '❌ API key missing')"
```

---

## 🐛 Common Issues & Fixes

### "Module not found"
```powershell
pip install -r requirements.txt
```

### "API key not found"
```powershell
# Make sure .env file exists in backend directory
"OPENROUTER_API_KEY=your_key_here" | Out-File -FilePath .env -Encoding utf8
```

### "Port already in use"
```powershell
# Use different port
uvicorn main:app --reload --port 8001
```

### "Import error: langgraph.graph"
```powershell
# This is expected before installing packages
# Just means you need to install dependencies
pip install langgraph
```

---

## 📊 What Each Agent Does

1. **CalendarAgent** 📅 - Analyzes meetings and finds busy periods
2. **TaskAgent** 📝 - Evaluates task urgency and workload
3. **ConflictAgent** ⚠️ - Detects scheduling conflicts
4. **TravelAgent** 🚗 - Plans travel logistics
5. **PlanningAgent** 📋 - Creates optimized schedule
6. **CoordinatorAgent** 💡 - Generates friendly summary

All agents use AI (DeepSeek-R1 via OpenRouter)!

---

## ⚡ Speed Run (Fastest Way to Test)

```powershell
# 1. One-line setup (if first time)
cd "c:\Users\arunk\Downloads\Final-Year Project\Personal_Task\backend"; python -m venv venv; .\venv\Scripts\activate; pip install -r requirements.txt

# 2. Add API key to .env (do once)
# OPENROUTER_API_KEY=your_key_here

# 3. Run CLI
python cli.py

# 4. Choose option 2, select scenario 2
# 5. View AI analysis results!
```

---

## 📖 More Information

- **Full Testing Guide**: See `TESTING_GUIDE.md`
- **Setup Details**: See `QUICKSTART.md`
- **Architecture**: See `ARCHITECTURE_DIAGRAMS.md`
- **Sample Data**: See `backend/data/README.md`

---

## ✅ Success Checklist

Before running, verify:
- [ ] Python 3.8+ installed
- [ ] Virtual environment activated
- [ ] Dependencies installed (`pip list`)
- [ ] `.env` file with API key exists
- [ ] Internet connection (for AI API calls)

Then just run:
```powershell
python cli.py
```

---

## 💡 Pro Tips

1. **Use sample scenarios** first to verify setup
2. **Check browser API docs** for visual testing
3. **Save results to JSON** for later analysis
4. **Try different schedules** to see agent behavior
5. **Monitor API usage** at https://openrouter.ai/

---

## 🎉 You're Ready!

The system is fully functional. Just run `python cli.py` and explore!

**Questions?** Check `TESTING_GUIDE.md` for detailed troubleshooting.

**Happy scheduling!** 🚀
