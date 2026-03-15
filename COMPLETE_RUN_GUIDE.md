# 🎯 Complete Guide - Running and Testing Personal Task Automation

## Quick Navigation

- **Want to run quickly?** → See [Speed Run](#-speed-run-fastest-way)
- **First time setup?** → See [Setup Instructions](#%EF%B8%8F-first-time-setup)
- **Testing the system?** → See [Testing Methods](#-testing-methods)
- **Having issues?** → See [Troubleshooting](#-troubleshooting)

---

## ⚡ Speed Run (Fastest Way)

Already have everything setup? Just do this:

```powershell
# Navigate to backend
cd "c:\Users\arunk\Downloads\Final-Year Project\Personal_Task\backend"

# Activate environment
.\venv\Scripts\activate

# Run CLI
python cli.py

# Choose option 2 (sample scenarios)
# Select scenario 2 (busy_day)
# View AI analysis!
```

---

## 🛠️ First Time Setup

### Step 1: Install Python (if needed)

Check if you have Python:
```powershell
python --version
```

Need Python? Download from: https://www.python.org/downloads/ (version 3.8+)

### Step 2: Navigate to Project

```powershell
cd "c:\Users\arunk\Downloads\Final-Year Project\Personal_Task\backend"
```

### Step 3: Create Virtual Environment

```powershell
python -m venv venv
```

### Step 4: Activate Virtual Environment

```powershell
.\venv\Scripts\activate
```

You should see `(venv)` in your prompt.

### Step 5: Install Dependencies

```powershell
pip install -r requirements.txt
```

This takes 1-2 minutes. Wait for it to complete.

### Step 6: Get API Key

1. Go to https://openrouter.ai/
2. Sign up (free)
3. Go to Keys section
4. Create a new API key
5. Copy the key

### Step 7: Create .env File

```powershell
# Create .env file with your API key
"OPENROUTER_API_KEY=your_actual_key_here" | Out-File -FilePath .env -Encoding utf8
```

Replace `your_actual_key_here` with your real API key!

### Step 8: Verify Setup

```powershell
# Check everything is ready
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('✅ Setup complete!' if os.getenv('OPENROUTER_API_KEY') else '❌ API key missing')"
```

You're ready! 🎉

---

## 🚀 Testing Methods

### Method 1: CLI with Sample Data (Recommended)

**Why?** Easiest way to see the system in action.

```powershell
cd backend
.\venv\Scripts\activate
python cli.py
```

**What to do:**
1. Choose option `2` (Use sample scenario)
2. Select scenario `2` (busy_day)
3. Watch the AI agents analyze
4. Review the comprehensive output
5. Save results if you want (type `y` when asked)

**Expected Output:**
- Calendar Analysis: Meeting overview and insights
- Task Analysis: Priority and workload assessment
- Conflict Detection: Any scheduling issues found
- Travel Planning: Logistics and timing
- Optimized Schedule: AI-generated plan
- Final Summary: Friendly, actionable advice

**Time:** ~15-30 seconds for analysis

### Method 2: CLI with Manual Input

**Why?** Test with your own real schedule.

```powershell
cd backend
.\venv\Scripts\activate
python cli.py
```

**What to do:**
1. Choose option `1` (Enter schedule manually)
2. Add meetings:
   ```
   Meeting #1:
     Title: Team Standup
     Time: 9:00 AM
     Location: Office
   
   Meeting #2:
     Title: [Press Enter when done]
   ```
3. Add tasks:
   ```
   Task #1:
     Title: Complete Report
     Deadline: 11:00 AM
   
   Task #2:
     Title: [Press Enter when done]
   ```
4. Review AI analysis

### Method 3: API Server Testing

**Why?** Test the web service interface.

#### Start the Server:
```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload
```

Keep this terminal open (server is running).

#### Option A: Browser Testing (Easiest)

1. Open browser
2. Go to: http://127.0.0.1:8000/docs
3. Click `POST /plan-day`
4. Click "Try it out"
5. Modify the JSON (or use default)
6. Click "Execute"
7. See response below

#### Option B: PowerShell Testing

Open a **new** PowerShell window:

```powershell
# Test with simple schedule
$body = @{
    meetings = @(
        @{title = "Meeting"; time = "10:00 AM"; location = "Office"}
    )
    tasks = @(
        @{title = "Task"; deadline = "5:00 PM"}
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/plan-day" `
    -Method Post `
    -Body $body `
    -ContentType "application/json" | ConvertTo-Json -Depth 10
```

---

## 📊 Test Scenarios

### Scenario 1: Light Day (No Issues)
**Purpose:** Verify basic functionality

**Data:**
- 1 meeting (virtual)
- 1 task (flexible deadline)

**Expected:** 
- Light workload assessment
- No conflicts
- Encouraging message

### Scenario 2: Busy Day (With Conflicts) ⭐
**Purpose:** Test conflict detection and resolution

**Data:**
- 3 meetings (different locations)
- 3 tasks (tight deadlines)

**Expected:**
- Moderate/heavy workload
- Conflicts detected
- Specific resolution suggestions
- Travel planning included

### Scenario 3: Travel Heavy
**Purpose:** Test travel planning

**Data:**
- 4 meetings (4 different locations)
- 2 tasks

**Expected:**
- Detailed travel times
- Departure recommendations
- Route optimization notes

---

## 🔍 What to Check

After each test, verify:

✅ **All 6 agents executed** (no errors)
✅ **Calendar analysis** has summary and insights
✅ **Task analysis** shows priorities and workload
✅ **Conflicts detected** (if scenario has conflicts)
✅ **Travel times** estimated (if multiple locations)
✅ **Optimized schedule** created with time blocks
✅ **Final response** is friendly and actionable
✅ **Execution time** < 30 seconds

---

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'langchain'"

**Fix:**
```powershell
pip install -r requirements.txt
```

### Error: "OPENROUTER_API_KEY not found"

**Fix:**
```powershell
# Check if .env exists
if (Test-Path .env) { "File exists" } else { "File missing!" }

# Recreate .env
"OPENROUTER_API_KEY=your_key_here" | Out-File -FilePath .env -Encoding utf8
```

### Error: "Address already in use" (API)

**Fix:**
```powershell
# Use different port
uvicorn main:app --reload --port 8001

# Then access at: http://127.0.0.1:8001
```

### Error: "JSONDecodeError" from LLM

**Fix:** The LLM sometimes returns invalid JSON. Try:

1. Run again (usually works)
2. Lower temperature in `config/settings.py`:
   ```python
   temperature=0.2  # Was 0.3
   ```
3. Check API rate limits (wait a moment)

### Agents taking too long

**Causes:**
- Slow internet connection
- API rate limiting
- Server load

**Fix:**
- Check internet: `Test-Connection openrouter.ai`
- Wait 30 seconds and retry
- Check OpenRouter status

### Virtual environment not activating

**Fix:**
```powershell
# Allow script execution (run as Admin)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then try again
.\venv\Scripts\activate
```

---

## 📈 Performance Benchmarks

**Expected Times:**
- CLI startup: < 2 seconds
- Sample data loading: < 1 second
- Agent analysis (all 6): 15-30 seconds
- API response: 15-30 seconds

**If slower:**
- Check internet speed
- Verify API key is valid
- Check OpenRouter service status

---

## ✅ Verification Checklist

Before considering setup complete, test:

- [ ] CLI runs without errors
- [ ] Can load sample scenarios
- [ ] Manual input works
- [ ] API server starts successfully
- [ ] Browser API docs load (http://127.0.0.1:8000/docs)
- [ ] PowerShell API test works
- [ ] All 6 agents execute
- [ ] Results are comprehensive
- [ ] Can save results to JSON
- [ ] No API key errors

---

## 🎓 Understanding the Output

### CLI Output Structure

```
============================================================
  📊 SCHEDULE ANALYSIS RESULTS
============================================================

📅 CALENDAR ANALYSIS:
[Meeting overview, busy periods, locations, insights]

📝 TASK ANALYSIS:
[Task priorities, urgency, workload assessment]

⚠️  CONFLICT DETECTION:
[Any conflicts found with severity levels]

🚗 TRAVEL PLANNING:
[Travel times, departure recommendations]

📋 OPTIMIZED SCHEDULE:
[Time blocks, focus areas, conflict resolutions]

💡 AI ASSISTANT SUMMARY:
[Friendly, actionable summary from Coordinator]
```

### API Response Structure

```json
{
  "status": "success",
  "calendar_analysis": { /* AI insights */ },
  "task_analysis": { /* Priority and urgency */ },
  "conflict_analysis": { /* Conflicts found */ },
  "travel_plan": { /* Logistics */ },
  "optimized_plan": { /* Schedule */ },
  "final_response": "Friendly summary...",
  "metadata": { /* System info */ }
}
```

---

## 🎯 Next Steps

After successful testing:

1. ✅ Try all 3 sample scenarios
2. ✅ Test with your own schedule data
3. ✅ Test both CLI and API
4. ✅ Review agent outputs for quality
5. ✅ Test error handling (invalid data)
6. ✅ Measure performance
7. ✅ Read full documentation

---

## 📚 Additional Documentation

- **Quick Commands**: `RUN_GUIDE.md`
- **Detailed Testing**: `TESTING_GUIDE.md`
- **Setup Guide**: `QUICKSTART.md`
- **Architecture**: `ARCHITECTURE_DIAGRAMS.md`
- **Data Info**: `backend/data/README.md`
- **Prompts**: `backend/prompts/README.md`

---

## 💡 Pro Tips

1. **Start with sample scenarios** - Fastest way to verify setup
2. **Use browser API docs** - Visual, interactive testing
3. **Check logs if issues** - Terminal shows detailed errors
4. **Save interesting results** - Good for documentation
5. **Try edge cases** - Empty schedules, many conflicts, etc.
6. **Monitor API usage** - Check your OpenRouter dashboard
7. **Test incrementally** - CLI first, then API

---

## 🤝 Support

**Setup Issues?**
- Review this guide carefully
- Check `TESTING_GUIDE.md`
- Verify all prerequisites

**Agent Issues?**
- Check internet connection
- Verify API key
- Review OpenRouter status

**Output Issues?**
- Try different scenarios
- Check prompt templates in `backend/prompts/`
- Adjust temperature in `config/settings.py`

---

## ✨ You're All Set!

The system is production-ready and fully functional. 

**Quick Test Right Now:**
```powershell
cd "c:\Users\arunk\Downloads\Final-Year Project\Personal_Task\backend"
.\venv\Scripts\activate
python cli.py
# Choose 2, Select 2, View results!
```

**Success looks like:** AI agents analyze your schedule, detect conflicts, plan travel, optimize your day, and give friendly advice - all in under 30 seconds! 🎉

Happy testing! 🚀
