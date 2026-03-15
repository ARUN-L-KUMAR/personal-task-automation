# Data and Prompts - Complete Reference

## 📂 Overview

The `data/` and `prompts/` directories now contain comprehensive resources for the multi-agent system.

---

## 📁 Data Directory (`backend/data/`)

### Files Created:

#### 1. `sample_data.json`
**Purpose**: Comprehensive test data for system validation

**Contents**:
- ✅ **3 Sample Schedules**:
  - `light_day`: 1 meeting, 1 task (minimal workload)
  - `busy_day`: 3 meetings, 3 tasks (with conflicts)
  - `travel_heavy`: 4 meetings across city (travel focus)

- ✅ **Location Database**:
  - Common meeting locations
  - Travel time estimates
  - Location types (office, virtual, etc.)

- ✅ **Working Hours**:
  - Default schedule (9 AM - 6 PM)
  - Lunch break times
  - Standard work day structure

- ✅ **Time Zones**:
  - IST configuration
  - UTC offset information

#### 2. `data_loader.py`
**Purpose**: Utility class for loading and validating test data

**Features**:
- Load scenarios by ID
- List all available scenarios
- Validate schedule data format
- Create custom test scenarios
- Quick access convenience functions

**Usage Example**:
```python
from data.data_loader import load_scenario

# Load a test scenario
busy_schedule = load_scenario('busy_day')
meetings = busy_schedule['meetings']
tasks = busy_schedule['tasks']
```

#### 3. `README.md`
**Purpose**: Complete documentation for data directory

**Sections**:
- File descriptions
- Usage examples
- Test scenarios with expected results
- Data structure specifications
- Customization guide
- Best practices

---

## 📝 Prompts Directory (`backend/prompts/`)

### Files Created:

#### 1. `calendar_agent_prompt.txt`
**Purpose**: Guidelines for calendar analysis agent

**Key Sections**:
- Agent responsibilities
- Analysis guidelines
- Output format specification
- Example analysis patterns

**Focus**: Meeting pattern recognition, busy period identification

---

#### 2. `task_agent_prompt.txt`
**Purpose**: Guidelines for task prioritization agent

**Key Sections**:
- Urgency assessment criteria (< 2 hours = urgent)
- Workload classification (light/moderate/heavy)
- Prioritization strategy
- Actionable recommendations

**Focus**: Deadline analysis, priority ordering, workload assessment

---

#### 3. `conflict_agent_prompt.txt`
**Purpose**: Guidelines for conflict detection agent

**Key Sections**:
- Three conflict types:
  - Time overlap
  - Deadline conflict
  - Buffer issues
- Severity levels (high/medium/low)
- Detailed conflict descriptions

**Focus**: Comprehensive conflict identification and severity assessment

---

#### 4. `travel_agent_prompt.txt`
**Purpose**: Guidelines for travel planning agent

**Key Sections**:
- Distance-based time estimates
- Departure time recommendations
- Travel mode suggestions
- Route optimization for multiple locations

**Focus**: Realistic travel logistics and timing

---

#### 5. `planning_agent_prompt.txt`
**Purpose**: Guidelines for schedule optimization agent

**Key Sections**:
- Planning principles (fixed vs flexible)
- Time blocking strategies
- Conflict resolution approaches
- Quality criteria for schedules

**Focus**: Creating optimized, realistic daily schedules

---

#### 6. `coordinator_agent_prompt.txt`
**Purpose**: Guidelines for response coordination agent

**Key Sections**:
- Friendly, encouraging tone
- Response structure template
- Communication guidelines (Do's and Don'ts)
- Scenario-specific responses

**Focus**: User-friendly, actionable summaries

---

#### 7. `README.md` (Updated)
**Purpose**: Comprehensive prompt documentation

**Sections**:
- All prompt files with descriptions
- How prompts are used in code
- Customization guide
- Temperature settings
- Best practices for prompt engineering
- Testing methods

---

## 🎯 How They Work Together

### Data Flow:
```
1. User sends schedule data
   ↓
2. Data validated against sample_data structure
   ↓
3. Each agent uses its prompt template
   ↓
4. Agents analyze using guidelines from prompts
   ↓
5. Structured JSON responses returned
```

### Testing Workflow:
```
1. Load test scenario from sample_data.json
   ↓
2. Use data_loader.py for validation
   ↓
3. Send to multi-agent system
   ↓
4. Each agent follows its prompt guidelines
   ↓
5. Compare output against expected results
```

---

## 📊 File Structure Summary

```
backend/
├── data/
│   ├── sample_data.json          ✅ Test scenarios & reference data
│   ├── data_loader.py            ✅ Utility for loading/validating
│   └── README.md                 ✅ Complete data documentation
│
└── prompts/
    ├── calendar_agent_prompt.txt    ✅ Calendar analysis guidelines
    ├── task_agent_prompt.txt        ✅ Task prioritization guidelines
    ├── conflict_agent_prompt.txt    ✅ Conflict detection guidelines
    ├── travel_agent_prompt.txt      ✅ Travel planning guidelines
    ├── planning_agent_prompt.txt    ✅ Schedule optimization guidelines
    ├── coordinator_agent_prompt.txt ✅ Response coordination guidelines
    └── README.md                    ✅ Complete prompt documentation
```

---

## 🚀 Quick Usage Examples

### Example 1: Load Test Data
```python
from data.data_loader import DataLoader

loader = DataLoader()

# List all scenarios
scenarios = loader.list_scenarios()
for s in scenarios:
    print(f"{s['id']}: {s['description']}")

# Load specific scenario
busy_day = loader.get_scenario('busy_day')
```

### Example 2: Test with Sample Data
```bash
# Using busy_day scenario
curl -X POST "http://localhost:8000/plan-day" \
  -H "Content-Type: application/json" \
  -d '{
    "meetings": [
      {"title": "Project Review", "time": "10:00 AM", "location": "College"},
      {"title": "Client Meeting", "time": "2:00 PM", "location": "Downtown"},
      {"title": "Team Sync", "time": "4:00 PM", "location": "Virtual"}
    ],
    "tasks": [
      {"title": "Assignment", "deadline": "10:30 AM"},
      {"title": "Presentation", "deadline": "1:00 PM"},
      {"title": "Code Review", "deadline": "6:00 PM"}
    ]
  }'
```

### Example 3: Validate Custom Data
```python
from data.data_loader import DataLoader

loader = DataLoader()

# Your custom schedule
meetings = [{"title": "Meeting", "time": "10:00 AM", "location": "Office"}]
tasks = [{"title": "Task", "deadline": "5:00 PM"}]

# Validate
validation = loader.validate_schedule(meetings, tasks)
if validation['valid']:
    print("✅ Schedule is valid!")
else:
    print("❌ Errors:", validation['errors'])
```

---

## 🎓 Key Features

### Data Features:
✅ **3 realistic test scenarios** covering different workload levels
✅ **Location database** with travel time estimates
✅ **Validation utility** to ensure data quality
✅ **Extensible structure** for adding new scenarios
✅ **Complete documentation** with examples

### Prompt Features:
✅ **6 specialized agent prompts** with clear guidelines
✅ **Detailed instructions** for each agent's behavior
✅ **Output format specifications** for consistency
✅ **Best practices** for prompt engineering
✅ **Customization guide** for adjusting behavior

---

## 🔧 Customization Tips

### Adding New Test Scenarios:

1. **Edit `sample_data.json`**:
```json
{
  "id": "your_scenario",
  "description": "Your description",
  "meetings": [...],
  "tasks": [...]
}
```

2. **Test with data_loader**:
```python
scenario = loader.get_scenario('your_scenario')
validation = loader.validate_schedule(scenario['meetings'], scenario['tasks'])
```

3. **Run through API** to verify agent behavior

### Modifying Agent Behavior:

1. **Update prompt files** with new guidelines
2. **Adjust agent classes** in `backend/agents/`
3. **Test with sample data** to verify changes
4. **Update documentation** in README files

---

## 📈 Benefits

### For Development:
- Consistent test data across development team
- Easy validation of new features
- Quick scenario switching for testing
- Clear agent behavior guidelines

### For Testing:
- Reproducible test cases
- Edge case coverage
- Expected result documentation
- Automated validation

### For Documentation:
- Complete reference for all agents
- Clear examples and usage
- Customization guidance
- Best practices included

---

## ✅ Completion Status

| Category | Status | Files |
|----------|--------|-------|
| **Data Files** | ✅ Complete | 3/3 |
| **Prompt Files** | ✅ Complete | 7/7 |
| **Documentation** | ✅ Complete | 2/2 |
| **Utilities** | ✅ Complete | 1/1 |

**Total**: 13 files created/updated with comprehensive content!

---

## 🎉 Summary

The `data/` and `prompts/` directories are now **production-ready** with:

✅ Sample test scenarios for all use cases
✅ Comprehensive prompt guidelines for all agents
✅ Validation and loading utilities
✅ Complete documentation and examples
✅ Best practices and customization guides

The system is ready for testing, development, and deployment! 🚀
