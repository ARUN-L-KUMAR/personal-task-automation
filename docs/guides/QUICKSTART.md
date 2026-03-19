# Quick Start Guide - Personal Task Automation

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Set Up API Key

1. Get a free OpenRouter API key: [https://openrouter.ai/](https://openrouter.ai/)
2. Create `.env` file in the `backend` folder:

```bash
OPENROUTER_API_KEY=your_api_key_here
```

### Step 3: Run the Server

```bash
uvicorn main:app --reload
```

✅ Server running at: http://127.0.0.1:8000

### Step 4: Test the API

Open your browser and go to: http://127.0.0.1:8000/docs

Or use curl:

```bash
curl -X POST "http://127.0.0.1:8000/plan-day" \
  -H "Content-Type: application/json" \
  -d '{
    "meetings": [
      {
        "title": "Team Standup",
        "time": "9:00 AM",
        "location": "Office Building A"
      },
      {
        "title": "Client Call",
        "time": "2:00 PM",
        "location": "Virtual"
      }
    ],
    "tasks": [
      {
        "title": "Complete Project Proposal",
        "deadline": "11:00 AM"
      },
      {
        "title": "Review Code PRs",
        "deadline": "5:00 PM"
      }
    ]
  }'
```

### Expected Response

You'll get a comprehensive analysis including:
- ✅ **Calendar Analysis**: Meeting insights and busy periods
- ✅ **Task Analysis**: Priority and urgency assessment
- ✅ **Conflict Detection**: Any scheduling conflicts
- ✅ **Travel Planning**: Departure times and logistics
- ✅ **Optimized Plan**: AI-generated daily schedule
- ✅ **Final Response**: Friendly, actionable summary

---

## 🧪 Test Different Scenarios

### Scenario 1: Conflict Detection
```json
{
  "meetings": [
    {"title": "Meeting", "time": "10:00 AM", "location": "Office"}
  ],
  "tasks": [
    {"title": "Task", "deadline": "10:30 AM"}
  ]
}
```
Expected: High-severity conflict detected

### Scenario 2: Heavy Workload
```json
{
  "meetings": [
    {"title": "Meeting 1", "time": "9:00 AM", "location": "Office A"},
    {"title": "Meeting 2", "time": "11:00 AM", "location": "Office B"},
    {"title": "Meeting 3", "time": "2:00 PM", "location": "Office C"}
  ],
  "tasks": [
    {"title": "Task 1", "deadline": "12:00 PM"},
    {"title": "Task 2", "deadline": "4:00 PM"},
    {"title": "Task 3", "deadline": "6:00 PM"}
  ]
}
```
Expected: Heavy workload assessment, travel planning between locations

### Scenario 3: Light Schedule
```json
{
  "meetings": [
    {"title": "Quick Check-in", "time": "10:00 AM", "location": "Virtual"}
  ],
  "tasks": [
    {"title": "Email Review", "deadline": "5:00 PM"}
  ]
}
```
Expected: Light workload, balanced schedule recommendations

---

## 🔧 Troubleshooting

### Error: "OPENROUTER_API_KEY not found"
- Make sure `.env` file exists in `backend/` folder
- Check that the API key is correctly formatted
- Restart the server after adding the key

### Error: "Module not found"
- Run `pip install -r requirements.txt` again
- Make sure you're in the `backend/` directory
- Check Python version (requires Python 3.8+)

### Error: "Rate limit exceeded"
- OpenRouter free tier has rate limits
- Wait a few moments and try again
- Consider upgrading your OpenRouter plan

---

## 📊 Understanding the Response

### Calendar Analysis
```json
{
  "summary": "Overview of your day",
  "busy_periods": ["Time slots with meetings"],
  "locations": ["Meeting locations"],
  "total_meetings": 2,
  "insights": ["AI-generated observations"]
}
```

### Task Analysis
```json
{
  "urgent_tasks": ["Tasks needing immediate attention"],
  "priority_order": ["Tasks in priority order"],
  "workload_assessment": "light/moderate/heavy",
  "recommendations": ["Actionable suggestions"]
}
```

### Conflict Analysis
```json
{
  "has_conflicts": true,
  "conflicts": [
    {
      "type": "deadline_conflict",
      "severity": "high",
      "description": "Detailed explanation",
      "items_involved": ["Meeting/Task names"]
    }
  ]
}
```

---

## 🎯 Next Steps

1. **Integrate with Frontend**: Connect React app to the API
2. **Customize Agents**: Modify prompts in agent files
3. **Add More Agents**: Extend the graph with new capabilities
4. **Deploy**: Host on cloud platforms (AWS, Azure, Heroku)

---

## 📚 Additional Resources

- [LangChain Documentation](https://python.langchain.com/)
- [LangGraph Guide](https://langchain-ai.github.io/langgraph/)
- [OpenRouter API](https://openrouter.ai/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

## 💡 Pro Tips

- Adjust `temperature` in `config/settings.py` for more/less creative responses (0.0 - 1.0)
- Use the `/docs` endpoint to explore the API interactively
- Check agent outputs individually by adding debug logging
- Monitor API usage in your OpenRouter dashboard

**Happy scheduling! 🎉**
