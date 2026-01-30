# Multi-Agent System Prompts

This directory contains detailed prompt templates that guide the behavior of each AI agent in the system.

## 📁 Prompt Files

### 1. `calendar_agent_prompt.txt`
**Purpose**: Guides calendar analysis and meeting schedule insights

**Key Capabilities**:
- Meeting pattern recognition
- Busy period identification
- Location analysis
- Schedule recommendations

**Output**: JSON with summary, busy_periods, locations, insights

---

### 2. `task_agent_prompt.txt`
**Purpose**: Analyzes task deadlines and prioritization

**Key Capabilities**:
- Urgency assessment (< 2 hours = urgent)
- Workload evaluation (light/moderate/heavy)
- Priority ordering
- Task completion strategies

**Output**: JSON with urgent_tasks, priority_order, workload_assessment, recommendations

---

### 3. `conflict_agent_prompt.txt`
**Purpose**: Detects scheduling conflicts with severity analysis

**Key Capabilities**:
- Time overlap detection
- Deadline conflict identification
- Buffer issue recognition
- Severity assessment (high/medium/low)

**Output**: JSON with conflicts array, severity levels, detailed descriptions

---

### 4. `travel_agent_prompt.txt`
**Purpose**: Plans travel logistics between meeting locations

**Key Capabilities**:
- Distance-based time estimation
- Departure time recommendations
- Route optimization
- Travel mode suggestions

**Output**: JSON with travel_plan, departure times, duration estimates

---

### 5. `planning_agent_prompt.txt`
**Purpose**: Creates optimized daily schedules with conflict resolutions

**Key Capabilities**:
- Time block optimization
- Conflict resolution strategies
- Break and buffer management
- Priority-based scheduling

**Output**: JSON with optimized_schedule, conflict_resolutions, time_management_tips

---

### 6. `coordinator_agent_prompt.txt`
**Purpose**: Synthesizes all agent outputs into friendly user guidance

**Key Capabilities**:
- Natural language summarization
- Encouraging communication
- Actionable recommendations
- Personalized scheduling advice

**Output**: Natural language text summary

---

## 🎯 How Prompts Are Used

Each agent class in `backend/agents/` incorporates these prompt guidelines:

```python
class CalendarAgent:
    def __init__(self):
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an intelligent calendar analysis agent..."),
            ("human", "Analyze the following meetings: {meetings}")
        ])
```

The prompts define:
1. **Agent Role**: What the agent specializes in
2. **Responsibilities**: What tasks the agent performs
3. **Guidelines**: How to analyze the data
4. **Output Format**: Structure of the response
5. **Examples**: Sample analysis patterns

---

## 🔧 Customization Guide

### Adjusting Agent Behavior:

#### 1. Modify Prompt Content
Edit the `.txt` files to change how agents think and respond.

**Example**: Make conflict detection more/less strict
```
# In conflict_agent_prompt.txt, adjust:
High Severity:
- Direct time overlap (impossible to attend both)
- Task due within 15 minutes of meeting  # Change this threshold
```

#### 2. Update Agent Classes
Modify the actual prompts in `backend/agents/*.py` files:

```python
# In conflict_agent.py
self.prompt = ChatPromptTemplate.from_messages([
    ("system", """Your custom instructions here..."""),
    ("human", """Your custom user prompt...""")
])
```

#### 3. Adjust LLM Settings
In `config/settings.py`:
```python
llm = ChatOpenAI(
    model="deepseek/deepseek-r1",
    temperature=0.3,  # Adjust: 0.0 = deterministic, 1.0 = creative
)
```

### Temperature Guidelines:
- **0.0 - 0.3**: Consistent, factual (recommended for analysis)
- **0.4 - 0.6**: Balanced creativity and consistency
- **0.7 - 1.0**: More creative, varied responses

---

## 📚 Best Practices

### Writing Effective Prompts:

1. **Be Specific**: Clear instructions produce better results
2. **Provide Examples**: Show the format you want
3. **Define Edge Cases**: Handle empty data, conflicts, etc.
4. **Set Constraints**: Define output structure strictly
5. **Test Iteratively**: Refine based on actual outputs

### Common Improvements:

**Add Domain Knowledge**:
```
"In academic settings, classes typically last 1 hour.
In corporate settings, meetings often run 30-60 minutes."
```

**Provide Context**:
```
"Current time: {current_time}
Working hours: 9 AM - 6 PM
Lunch break: 12:30 PM - 1:30 PM"
```

**Specify Error Handling**:
```
"If no meetings provided, return:
{'summary': 'No meetings scheduled', ...}"
```

---

## 🧪 Testing Prompts

### Method 1: Direct Testing
Use the API with test data:
```bash
curl -X POST "http://localhost:8000/plan-day" \
  -H "Content-Type: application/json" \
  -d @backend/data/sample_data.json
```

### Method 2: Individual Agent Testing
Create a test script:
```python
from agents.calendar_agent import CalendarAgent

agent = CalendarAgent()
result = agent.analyze([{"title": "Test", "time": "10 AM", "location": "Office"}])
print(result)
```

### Method 3: Use Sample Data
Load from `backend/data/sample_data.json` for consistent testing.

---

## 📊 Prompt Evolution

Track how prompts improve over time:

| Version | Agent | Change | Impact |
|---------|-------|--------|--------|
| v1.0 | All | Initial prompts | Base functionality |
| v1.1 | Conflict | Added severity levels | Better prioritization |
| v1.2 | Travel | Added traffic considerations | More realistic |
| v1.3 | Coordinator | More encouraging tone | Better UX |

---

## 🤝 Contributing

When improving prompts:
1. Test with multiple scenarios
2. Document the changes
3. Keep backup of working versions
4. Update this README with insights

---

## 📞 Reference

For more on prompt engineering:
- [LangChain Prompt Templates](https://python.langchain.com/docs/modules/model_io/prompts/)
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Few-Shot Prompting](https://www.promptingguide.ai/techniques/fewshot)
