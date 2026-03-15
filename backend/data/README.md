# Data Directory

This directory contains sample data, test cases, and reference information for the Personal Task Automation system.

## 📁 Files

### `sample_data.json`
Comprehensive sample schedules for testing the multi-agent system.

**Contents**:

#### 1. Sample Schedules
Pre-configured test scenarios:
- **light_day**: Minimal workload (1 meeting, 1 task)
- **busy_day**: Heavy schedule with conflicts (3 meetings, 3 tasks)
- **travel_heavy**: Multiple locations requiring travel planning (4 meetings across city)

#### 2. Location Database
Common meeting locations with travel time estimates from home/office.

#### 3. Time Zones
Standard time zone information (currently IST).

#### 4. Working Hours
Default working hours and break times for context.

---

## 🚀 Usage

### Testing with Sample Data

Load and use sample schedules in your tests:

```python
import json

with open('backend/data/sample_data.json', 'r') as f:
    data = json.load(f)

# Get a test scenario
busy_schedule = next(s for s in data['sample_schedules'] if s['id'] == 'busy_day')
meetings = busy_schedule['meetings']
tasks = busy_schedule['tasks']
```

### API Testing

Use sample data with curl:

```bash
# Test busy day scenario
curl -X POST "http://localhost:8000/plan-day" \
  -H "Content-Type: application/json" \
  -d '{
    "meetings": [
      {"title": "Project Review", "time": "10:00 AM", "location": "College - Building 2"},
      {"title": "Client Meeting", "time": "2:00 PM", "location": "Downtown Office"},
      {"title": "Team Sync", "time": "4:00 PM", "location": "Virtual"}
    ],
    "tasks": [
      {"title": "Finish Assignment", "deadline": "10:30 AM"},
      {"title": "Prepare Presentation", "deadline": "1:00 PM"},
      {"title": "Code Review", "deadline": "6:00 PM"}
    ]
  }'
```

---

## 🧪 Test Scenarios

### Scenario 1: Conflict Detection
**Purpose**: Test high-severity conflict detection

```json
{
  "meetings": [
    {"title": "Meeting", "time": "10:00 AM", "location": "Office"}
  ],
  "tasks": [
    {"title": "Urgent Task", "deadline": "10:15 AM"}
  ]
}
```

**Expected Result**: High-severity deadline conflict detected

---

### Scenario 2: Travel Planning
**Purpose**: Test multi-location travel optimization

```json
{
  "meetings": [
    {"title": "Morning Meeting", "time": "9:00 AM", "location": "Office Downtown"},
    {"title": "Client Visit", "time": "11:00 AM", "location": "Industrial Area"},
    {"title": "Lunch Meeting", "time": "1:00 PM", "location": "City Center"}
  ]
}
```

**Expected Result**: Travel times calculated, departure recommendations provided

---

### Scenario 3: Light Workload
**Purpose**: Test system with minimal schedule

```json
{
  "meetings": [
    {"title": "Quick Sync", "time": "10:00 AM", "location": "Virtual"}
  ],
  "tasks": [
    {"title": "Email Review", "deadline": "5:00 PM"}
  ]
}
```

**Expected Result**: Light workload assessment, encouraging response

---

## 📊 Data Structure

### Meeting Object
```json
{
  "title": "string - Meeting name",
  "time": "string - Time in 12-hour format (e.g., '10:00 AM')",
  "location": "string - Physical location or 'Virtual'"
}
```

### Task Object
```json
{
  "title": "string - Task name",
  "deadline": "string - Time in 12-hour format (e.g., '5:00 PM')"
}
```

---

## 🔧 Customization

### Adding New Test Scenarios

Add to `sample_schedules` array in `sample_data.json`:

```json
{
  "id": "your_scenario_name",
  "description": "Brief description",
  "meetings": [...],
  "tasks": [...]
}
```

### Adding Locations

Add to `location_database.common_locations`:

```json
{
  "name": "New Location Name",
  "type": "office/educational/commercial/virtual",
  "travel_time_from_home": "X minutes"
}
```

### Updating Working Hours

Modify `working_hours` section:

```json
{
  "start": "9:00 AM",
  "end": "6:00 PM",
  "lunch_break": "12:30 PM - 1:30 PM"
}
```

---

## 🎯 Best Practices

### Creating Test Data

1. **Realistic Scenarios**: Use actual time constraints people face
2. **Edge Cases**: Include conflicts, tight schedules, travel issues
3. **Variety**: Mix virtual/physical, urgent/flexible, morning/afternoon
4. **Documentation**: Add descriptions to explain test purpose

### Data Validation

Ensure:
- ✅ Times are in 12-hour format with AM/PM
- ✅ Meeting titles are descriptive
- ✅ Locations are consistent (use same names)
- ✅ Tasks have realistic deadlines
- ✅ JSON is properly formatted

---

## 📈 Extending Data

### Future Additions

Consider adding:
- **User Preferences**: Default meeting durations, preferred break times
- **Calendar Integration**: Import from Google Calendar, Outlook
- **Historical Data**: Past schedules for learning patterns
- **Team Schedules**: Multiple user coordination
- **Resource Booking**: Room availability, equipment

### Database Integration

For production, replace JSON files with database:

```python
# Example with SQLite
import sqlite3

conn = sqlite3.connect('schedules.db')
cursor = conn.cursor()

cursor.execute('''
    CREATE TABLE meetings (
        id INTEGER PRIMARY KEY,
        title TEXT,
        time TEXT,
        location TEXT,
        user_id INTEGER
    )
''')
```

---

## 🔍 Data Analysis

Use sample data to analyze agent performance:

```python
import json
import statistics

# Load data
with open('backend/data/sample_data.json') as f:
    data = json.load(f)

# Analyze scenarios
schedules = data['sample_schedules']
avg_meetings = statistics.mean([len(s['meetings']) for s in schedules])
avg_tasks = statistics.mean([len(s['tasks']) for s in schedules])

print(f"Average meetings per scenario: {avg_meetings}")
print(f"Average tasks per scenario: {avg_tasks}")
```

---

## 📝 Notes

- Sample data is for **testing and demonstration** only
- Time formats must match the parser in `utils/time_parser.py`
- Location names should be consistent across test cases
- Update this README when adding new data structures

---

## 🤝 Contributing Data

When adding new sample data:
1. Follow the existing JSON structure
2. Test with the API to ensure validity
3. Document the purpose of new scenarios
4. Consider edge cases and variations
5. Update this README with new additions
