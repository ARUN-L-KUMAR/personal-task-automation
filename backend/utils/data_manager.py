"""
Data management utilities for saving and retrieving analysis data.
Handles input/output persistence and history tracking.
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from config.settings import data_config


class DataManager:
    """Manages data persistence (input/output/history)"""
    
    def __init__(self):
        """Initialize data manager with configured paths"""
        self.data_dir = data_config.DATA_DIR
        self.input_file = data_config.INPUT_FILE
        self.output_file = data_config.OUTPUT_FILE
        self.history_file = data_config.HISTORY_FILE
        self.ensure_files_exist()
    
    def ensure_files_exist(self):
        """Create data files if they don't exist"""
        for file_path in [self.input_file, self.output_file, self.history_file]:
            if not os.path.exists(file_path):
                with open(file_path, 'w') as f:
                    if "history" in file_path:
                        json.dump([], f)  # History is a list
                    else:
                        json.dump({}, f)  # Input/output are dicts
    
    # ============================================
    # INPUT DATA MANAGEMENT
    # ============================================
    
    def save_input(self, meetings: List[Dict], tasks: List[Dict]) -> bool:
        """
        Save user input (meetings and tasks) to file.
        
        Args:
            meetings: List of meeting dictionaries
            tasks: List of task dictionaries
        
        Returns:
            True if successful, False otherwise
        """
        try:
            data = {
                "timestamp": datetime.now().isoformat(),
                "meetings": meetings,
                "tasks": tasks
            }
            
            with open(self.input_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving input: {e}")
            return False
    
    def load_input(self) -> Optional[Dict]:
        """
        Load previously saved input data.
        
        Returns:
            Dictionary with meetings and tasks, or None if file is empty
        """
        try:
            with open(self.input_file, 'r') as f:
                data = json.load(f)
                return data if data else None
        except Exception as e:
            print(f"Error loading input: {e}")
            return None
    
    # ============================================
    # OUTPUT DATA MANAGEMENT
    # ============================================
    
    def save_output(self, analysis_result: Dict[str, Any]) -> bool:
        """
        Save analysis output to file.
        
        Args:
            analysis_result: Dictionary with all agent outputs
        
        Returns:
            True if successful, False otherwise
        """
        try:
            data = {
                "timestamp": datetime.now().isoformat(),
                "analysis": analysis_result
            }
            
            with open(self.output_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving output: {e}")
            return False
    
    def load_output(self) -> Optional[Dict]:
        """
        Load previously saved analysis output.
        
        Returns:
            Dictionary with analysis results, or None if file is empty
        """
        try:
            with open(self.output_file, 'r') as f:
                data = json.load(f)
                return data if data else None
        except Exception as e:
            print(f"Error loading output: {e}")
            return None
    
    # ============================================
    # HISTORY MANAGEMENT
    # ============================================
    
    def save_to_history(self, input_data: Dict, output_data: Dict) -> bool:
        """
        Save analysis to history log.
        
        Args:
            input_data: User input (meetings & tasks)
            output_data: Analysis results
        
        Returns:
            True if successful, False otherwise
        """
        try:
            entry = {
                "timestamp": datetime.now().isoformat(),
                "input": input_data,
                "output": output_data
            }
            
            # Load existing history
            with open(self.history_file, 'r') as f:
                history = json.load(f)
            
            # Add new entry
            history.append(entry)
            
            # Keep only last N entries
            if len(history) > data_config.HISTORY_LIMIT:
                history = history[-data_config.HISTORY_LIMIT:]
            
            # Save updated history
            with open(self.history_file, 'w') as f:
                json.dump(history, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving to history: {e}")
            return False
    
    def load_history(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Load analysis history.
        
        Args:
            limit: Maximum number of entries to return (None = all)
        
        Returns:
            List of historical analysis entries
        """
        try:
            with open(self.history_file, 'r') as f:
                history = json.load(f)
            
            if limit:
                return history[-limit:]
            return history
        except Exception as e:
            print(f"Error loading history: {e}")
            return []
    
    def clear_history(self) -> bool:
        """Clear all history"""
        try:
            with open(self.history_file, 'w') as f:
                json.dump([], f)
            return True
        except Exception as e:
            print(f"Error clearing history: {e}")
            return False
    
    # ============================================
    # UTILITY METHODS
    # ============================================
    
    def export_data(self, file_path: str) -> bool:
        """Export all data to external file (for backup)"""
        try:
            data = {
                "input": self.load_input(),
                "output": self.load_output(),
                "history": self.load_history()
            }
            
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error exporting data: {e}")
            return False
    
    def get_stats(self) -> Dict:
        """Get statistics about stored data"""
        history = self.load_history()
        return {
            "total_analyses": len(history),
            "first_analysis": history[0]["timestamp"] if history else None,
            "last_analysis": history[-1]["timestamp"] if history else None,
            "history_limit": data_config.HISTORY_LIMIT
        }


# Create singleton instance
data_manager = DataManager()
