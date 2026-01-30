# 🧪 Testing Guide - Personal Task Automation

Complete guide for testing the AI Multi-Agent Personal Task Automation system.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [CLI Testing](#cli-testing)
3. [API Testing](#api-testing)
4. [Agent Testing](#agent-testing)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

```powershell
# 1. Navigate to backend directory
cd "c:\Users\arunk\Downloads\Final-Year Project\Personal_Task\backend"

# 2. Create virtual environment (if not exists)
python -m venv venv

# 3. Activate virtual environment
.\venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Set up API key in .env file
# Create .env file with: OPENROUTER_API_KEY=your_key_here
```

### Verify Installation

```powershell
# Check Python version (requires 3.8+)
python --version

# Verify packages
pip list | Select-String "langchain|langgraph|fastapi"
```

---

## 💻 CLI Testing

### Method 1: Interactive CLI

```powershell
# Run the CLI application
python cli.py
```

**What you'll see:**
```
============================================================
  🤖 AI Personal Task Automation (Multi-Agent CLI)
============================================================

🎯 This system uses 6 AI agents to analyze your schedule:
   1. CalendarAgent - Meeting analysis
   2. TaskAgent - Task prioritization
   3. ConflictAgent - Conflict detection
   4. TravelAgent - Travel planning
   5. PlanningAgent - Schedule optimization
   6. CoordinatorAgent - Final recommendations

📋 Choose input method:
   1. Enter schedule manually
   2. Use sample scenario
   3. Exit

Your choice (1-3): 
```

### Option 1: Manual Input

**Example Session:**
```
Your choice (1-3): 1

📅 Enter meeting details (leave title empty to stop):

Meeting #1:
  Title: Team Standup
  Time (e.g., 10:00 AM): 9:00 AM
  Location: Office
  ✅ Meeting added!

Meeting #2:
  Title: Client Call
  Time (e.g., 10:00 AM): 2:00 PM
  Location: Virtual
  ✅ Meeting added!

Meeting #3:
  Title: [press Enter to finish]

📝 Enter task details (leave title empty to stop):

Task #1:
  Title: Complete Report
  Deadline (e.g., 5:00 PM): 11:00 AM
  ✅ Task added!

Task #2:
  Title: [press Enter to finish]

✅ Schedule loaded: 2 meeting(s), 1 task(s)

🤖 Initializing AI Multi-Agent System...
   This may take a moment as agents analyze your schedule...

🔄 Running agent workflow...
[Agent analysis results displayed]
```

### Option 2: Sample Scenarios

```
Your choice (1-3): 2

📦 Available Sample Scenarios:
------------------------------------------------------------
1. light_day
   Description: Light workload day
   Meetings: 1, Tasks: 1

2. busy_day
   Description: Busy day with conflicts
   Meetings: 3, Tasks: 3

3. travel_heavy
   Description: Multiple locations requiring travel
   Meetings: 4, Tasks: 2

Select scenario number (0 to cancel): 2

✅ Loaded scenario: busy_day
```

### Understanding CLI Output

The CLI displays structured results:

```
============================================================
  📊 SCHEDULE ANALYSIS RESULTS
============================================================

📅 CALENDAR ANALYSIS:
------------------------------------------------------------
Summary: You have 3 meetings scheduled throughout the day
Total Meetings: 3
Busy Periods: 10:00 AM - 11:00 AM, 2:00 PM - 5:00 PM
Locations: College - Building 2, Downtown Office, Virtual

📝 TASK ANALYSIS:
------------------------------------------------------------
Summary: Moderate workload with one urgent deadline
Total Tasks: 3
Workload: MODERATE
Urgent Tasks: Finish Assignment

⚠️  CONFLICT DETECTION:
------------------------------------------------------------
Conflicts Found: YES
Conflict Count: 1

  • Type: deadline_conflict
    Severity: HIGH
    Description: Task 'Finish Assignment' due at 10:30 AM conflicts with 'Project Review' at 10:00 AM

🚗 TRAVEL PLANNING:
------------------------------------------------------------
Summary: Multiple location changes require travel planning
Total Travel Time: 1 hour 30 minutes

📋 OPTIMIZED SCHEDULE:
------------------------------------------------------------
Focus Areas:
  • Complete Assignment before 9:30 AM
  • Prepare for Client Meeting
  • Code Review completion

💡 AI ASSISTANT SUMMARY:
------------------------------------------------------------
[Friendly AI-generated summary and recommendations]
```

---

## 🌐 API Testing

### Method 1: Start Server

```powershell
# Start FastAPI server
uvicorn main:app --reload

# Server runs at: http://127.0.0.1:8000
```

### Method 2: Interactive API Docs

Open in browser:
```
http://127.0.0.1:8000/docs
```

**Test via Swagger UI:**
1. Click on `POST /plan-day`
2. Click "Try it out"
3. Enter test data in JSON format
4. Click "Execute"

### Method 3: PowerShell/curl Testing

**Test 1: Light Schedule**
```powershell
$body = @{
    meetings = @(
        @{
            title = "Quick Sync"
            time = "10:00 AM"
            location = "Virtual"
        }
    )
    tasks = @(
        @{
            title = "Review Emails"
            deadline = "5:00 PM"
        }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/plan-day" `
    -Method Post `
    -Body $body `
    -ContentType "application/json" | ConvertTo-Json -Depth 10
```

**Test 2: Conflict Scenario**
```powershell
$body = @{
    meetings = @(
        @{
            title = "Important Meeting"
            time = "10:00 AM"
            location = "Office"
        }
    )
    tasks = @(
        @{
            title = "Urgent Task"
            deadline = "10:15 AM"
        }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/plan-day" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

**Test 3: Heavy Schedule**
```powershell
$body = @{
    meetings = @(
        @{title = "Morning Meeting"; time = "9:00 AM"; location = "Office A"},
        @{title = "Client Call"; time = "11:00 AM"; location = "Office B"},
        @{title = "Lunch Meeting"; time = "1:00 PM"; location = "Restaurant"},
        @{title = "Team Sync"; time = "3:00 PM"; location = "Virtual"}
    )
    tasks = @(
        @{title = "Report"; deadline = "10:00 AM"},
        @{title = "Presentation"; deadline = "2:00 PM"},
        @{title = "Code Review"; deadline = "5:00 PM"}
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/plan-day" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Method 4: Using Sample Data

```powershell
# Test with sample data file
$sampleData = Get-Content "data\sample_data.json" | ConvertFrom-Json
$busyDay = $sampleData.sample_schedules | Where-Object {$_.id -eq "busy_day"}

$body = @{
    meetings = $busyDay.meetings
    tasks = $busyDay.tasks
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://127.0.0.1:8000/plan-day" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

---

## 🧪 Agent Testing

### Test Individual Agents

Create a test script `test_agents.py`:

```python
from agents import CalendarAgent, TaskAgent, ConflictAgent

# Test Calendar Agent
calendar_agent = CalendarAgent()
meetings = [
    {"title": "Team Meeting", "time": "10:00 AM", "location": "Office"}
]
result = calendar_agent.analyze(meetings)
print("Calendar Analysis:", result)

# Test Task Agent
task_agent = TaskAgent()
tasks = [
    {"title": "Complete Report", "deadline": "5:00 PM"}
]
result = task_agent.analyze(tasks)
print("Task Analysis:", result)

# Test Conflict Agent
conflict_agent = ConflictAgent()
result = conflict_agent.detect(meetings, tasks)
print("Conflict Analysis:", result)
```

Run with:
```powershell
python test_agents.py
```

### Test Graph Workflow

Create `test_graph.py`:

```python
from graph.agent_graph import ScheduleAgentGraph
import json

# Initialize graph
graph = ScheduleAgentGraph()

# Test data
meetings = [
    {"title": "Meeting", "time": "10:00 AM", "location": "Office"}
]
tasks = [
    {"title": "Task", "deadline": "11:00 AM"}
]

# Execute
result = graph.execute(meetings, tasks)

# Display results
print(json.dumps(result, indent=2))
```

Run with:
```powershell
python test_graph.py
```

### Test Data Loader

```python
from data.data_loader import DataLoader

loader = DataLoader()

# List scenarios
scenarios = loader.list_scenarios()
print("Available scenarios:", scenarios)

# Load and validate
busy_day = loader.get_scenario('busy_day')
validation = loader.validate_schedule(
    busy_day['meetings'], 
    busy_day['tasks']
)
print("Validation:", validation)
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Import Errors

**Error:**
```
ModuleNotFoundError: No module named 'langchain'
```

**Solution:**
```powershell
pip install -r requirements.txt
```

#### 2. API Key Not Found

**Error:**
```
Error: OPENROUTER_API_KEY not found
```

**Solution:**
```powershell
# Create .env file in backend directory
"OPENROUTER_API_KEY=your_key_here" | Out-File -FilePath .env -Encoding utf8
```

#### 3. Port Already in Use

**Error:**
```
ERROR:    [Errno 10048] error while attempting to bind on address
```

**Solution:**
```powershell
# Use different port
uvicorn main:app --reload --port 8001

# Or find and kill process using port 8000
netstat -ano | findstr :8000
taskkill /PID <process_id> /F
```

#### 4. Graph Execution Fails

**Error:**
```
Error during analysis: [error message]
```

**Solutions:**
```powershell
# 1. Check internet connection (required for API calls)
Test-Connection -ComputerName openrouter.ai -Count 2

# 2. Verify API key is valid
# Test at: https://openrouter.ai/keys

# 3. Check rate limits
# Free tier has limits, wait a moment and retry
```

#### 5. JSON Parse Errors from LLM

**Error:**
```
JSONDecodeError: Expecting value
```

**Solution:**
```python
# Adjust temperature in config/settings.py
llm = ChatOpenAI(
    model="deepseek/deepseek-r1",
    temperature=0.2,  # Lower = more consistent
)
```

### Debug Mode

Enable detailed logging:

```python
# Add to top of cli.py or test scripts
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Verify Setup Checklist

```powershell
# Run this checklist
Write-Host "✓ Checking Python version..."
python --version

Write-Host "✓ Checking virtual environment..."
if ($env:VIRTUAL_ENV) { Write-Host "  Active: $env:VIRTUAL_ENV" } else { Write-Host "  ⚠️ Not activated" }

Write-Host "✓ Checking dependencies..."
pip list | Select-String "langchain|langgraph|fastapi"

Write-Host "✓ Checking .env file..."
if (Test-Path .env) { Write-Host "  Found" } else { Write-Host "  ⚠️ Missing" }

Write-Host "✓ Checking data files..."
if (Test-Path "data\sample_data.json") { Write-Host "  Sample data: Found" }

Write-Host "`n✅ Setup verification complete!"
```

---

## 📊 Performance Testing

### Measure Response Time

```python
import time
from graph.agent_graph import ScheduleAgentGraph

graph = ScheduleAgentGraph()

meetings = [{"title": "Test", "time": "10:00 AM", "location": "Office"}]
tasks = [{"title": "Test", "deadline": "5:00 PM"}]

start = time.time()
result = graph.execute(meetings, tasks)
elapsed = time.time() - start

print(f"Execution time: {elapsed:.2f} seconds")
```

### Stress Test

```python
# Test with maximum realistic input
meetings = [
    {"title": f"Meeting {i}", "time": f"{9+i}:00 AM", "location": f"Office {i}"}
    for i in range(10)
]
tasks = [
    {"title": f"Task {i}", "deadline": f"{i+1}:00 PM"}
    for i in range(10)
]

result = graph.execute(meetings, tasks)
```

---

## ✅ Test Success Criteria

A successful test should show:

- ✅ All 6 agents execute without errors
- ✅ Structured JSON responses from each agent
- ✅ Conflicts detected when present
- ✅ Travel times estimated appropriately
- ✅ Friendly, actionable final response
- ✅ Execution completes in < 30 seconds
- ✅ No API errors or rate limit issues

---

## 📝 Test Scenarios

### Recommended Test Suite:

1. **Empty Schedule** - No meetings or tasks
2. **Single Meeting** - Minimal input
3. **Conflict Scenario** - Meeting and task at same time
4. **Travel Heavy** - Multiple distant locations
5. **Heavy Workload** - Many meetings and tasks
6. **Virtual Only** - All virtual meetings
7. **Edge Cases** - Unusual times, locations

Run through each scenario using both CLI and API!

---

## 🎯 Next Steps

After successful testing:

1. ✅ Test all sample scenarios
2. ✅ Test with custom real-world data
3. ✅ Verify all 6 agents work correctly
4. ✅ Check API response structure
5. ✅ Test error handling
6. ✅ Measure performance
7. ✅ Test frontend integration

---

## 📚 Additional Resources

- See `QUICKSTART.md` for setup
- See `ARCHITECTURE_DIAGRAMS.md` for system design
- See `data/README.md` for sample data
- See `prompts/README.md` for agent customization

Happy testing! 🚀
