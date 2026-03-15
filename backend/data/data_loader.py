"""
Data Loader Utility

Helper functions to load and validate sample data for testing.
"""

import json
import os
from typing import Dict, List, Optional


class DataLoader:
    """Load sample data for testing the multi-agent system"""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.data_file = os.path.join(data_dir, "sample_data.json")
        self._data = None
    
    def load_data(self) -> Dict:
        """Load the sample data JSON file"""
        if self._data is None:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                self._data = json.load(f)
        return self._data
    
    def get_scenario(self, scenario_id: str) -> Optional[Dict]:
        """
        Get a specific test scenario by ID
        
        Args:
            scenario_id: ID of the scenario (e.g., 'light_day', 'busy_day')
        
        Returns:
            Dictionary with meetings and tasks, or None if not found
        """
        data = self.load_data()
        for scenario in data['sample_schedules']:
            if scenario['id'] == scenario_id:
                return {
                    'meetings': scenario['meetings'],
                    'tasks': scenario['tasks'],
                    'description': scenario.get('description', '')
                }
        return None
    
    def list_scenarios(self) -> List[Dict]:
        """Get a list of all available scenarios"""
        data = self.load_data()
        return [
            {
                'id': s['id'],
                'description': s['description'],
                'meeting_count': len(s['meetings']),
                'task_count': len(s['tasks'])
            }
            for s in data['sample_schedules']
        ]
    
    def get_locations(self) -> List[Dict]:
        """Get all common locations with travel time info"""
        data = self.load_data()
        return data.get('location_database', {}).get('common_locations', [])
    
    def get_working_hours(self) -> Dict:
        """Get default working hours"""
        data = self.load_data()
        return data.get('working_hours', {})
    
    def validate_schedule(self, meetings: List[Dict], tasks: List[Dict]) -> Dict:
        """
        Validate schedule data format
        
        Args:
            meetings: List of meeting dictionaries
            tasks: List of task dictionaries
        
        Returns:
            Dictionary with validation results
        """
        errors = []
        warnings = []
        
        # Validate meetings
        for i, meeting in enumerate(meetings):
            if 'title' not in meeting:
                errors.append(f"Meeting {i}: Missing 'title' field")
            if 'time' not in meeting:
                errors.append(f"Meeting {i}: Missing 'time' field")
            if 'location' not in meeting:
                warnings.append(f"Meeting {i}: Missing 'location' field")
        
        # Validate tasks
        for i, task in enumerate(tasks):
            if 'title' not in task:
                errors.append(f"Task {i}: Missing 'title' field")
            if 'deadline' not in task:
                errors.append(f"Task {i}: Missing 'deadline' field")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'summary': {
                'total_meetings': len(meetings),
                'total_tasks': len(tasks)
            }
        }
    
    def create_custom_scenario(
        self, 
        meetings: List[Dict], 
        tasks: List[Dict],
        scenario_id: str,
        description: str = ""
    ) -> Dict:
        """
        Create a custom test scenario
        
        Args:
            meetings: List of meetings
            tasks: List of tasks
            scenario_id: Unique ID for the scenario
            description: Brief description
        
        Returns:
            Formatted scenario dictionary
        """
        validation = self.validate_schedule(meetings, tasks)
        if not validation['valid']:
            raise ValueError(f"Invalid schedule data: {validation['errors']}")
        
        return {
            'id': scenario_id,
            'description': description,
            'meetings': meetings,
            'tasks': tasks
        }


# Convenience functions for quick access
def load_scenario(scenario_id: str) -> Optional[Dict]:
    """Quick function to load a scenario"""
    loader = DataLoader()
    return loader.get_scenario(scenario_id)


def list_all_scenarios() -> List[Dict]:
    """Quick function to list all scenarios"""
    loader = DataLoader()
    return loader.list_scenarios()


# Example usage
if __name__ == "__main__":
    loader = DataLoader()
    
    print("Available Test Scenarios:")
    print("-" * 50)
    
    scenarios = loader.list_scenarios()
    for scenario in scenarios:
        print(f"\nID: {scenario['id']}")
        print(f"Description: {scenario['description']}")
        print(f"Meetings: {scenario['meeting_count']}")
        print(f"Tasks: {scenario['task_count']}")
    
    print("\n" + "=" * 50)
    print("\nLoading 'busy_day' scenario:")
    print("-" * 50)
    
    busy_day = loader.get_scenario('busy_day')
    if busy_day:
        print(f"\nDescription: {busy_day['description']}")
        print(f"\nMeetings ({len(busy_day['meetings'])}):")
        for meeting in busy_day['meetings']:
            print(f"  - {meeting['title']} at {meeting['time']} ({meeting['location']})")
        
        print(f"\nTasks ({len(busy_day['tasks'])}):")
        for task in busy_day['tasks']:
            print(f"  - {task['title']} (due: {task['deadline']})")
    
    print("\n" + "=" * 50)
    print("\nValidation Test:")
    print("-" * 50)
    
    # Test validation
    test_meetings = [
        {"title": "Test Meeting", "time": "10:00 AM", "location": "Office"}
    ]
    test_tasks = [
        {"title": "Test Task", "deadline": "5:00 PM"}
    ]
    
    validation = loader.validate_schedule(test_meetings, test_tasks)
    print(f"Valid: {validation['valid']}")
    print(f"Meetings: {validation['summary']['total_meetings']}")
    print(f"Tasks: {validation['summary']['total_tasks']}")
    if validation['errors']:
        print(f"Errors: {validation['errors']}")
    if validation['warnings']:
        print(f"Warnings: {validation['warnings']}")
