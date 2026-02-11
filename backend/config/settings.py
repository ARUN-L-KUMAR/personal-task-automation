"""
Configuration settings for AI models and application behavior.
Centralizes all model configurations, API settings, and constants.
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# ============================================
# LLM CONFIGURATION
# ============================================

class LLMConfig:
    """Configuration for LLM models and providers"""
    
    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    
    # Model Selection
    MODEL_NAME: str = os.getenv("MODEL_NAME", "openai/gpt-4o-mini")
    API_BASE: str = "https://openrouter.ai/api/v1"
    
    # Temperature & Behavior
    TEMPERATURE_STRICT: float = 0.0      # For calendar, conflict detection
    TEMPERATURE_BALANCED: float = 0.2    # For task, travel agents
    TEMPERATURE_CREATIVE: float = 0.3    # For planning suggestions


# ============================================
# AGENT CONFIGURATION
# ============================================

class AgentConfig:
    """Configuration for individual agents"""
    
    # Agent Temperature Settings
    AGENT_TEMPS = {
        "calendar": 0.0,      # Strict analysis
        "task": 0.2,          # Balanced
        "conflict": 0.0,      # Precise detection
        "travel": 0.2,        # Balanced
        "planning": 0.3,      # Creative suggestions
    }
    
    # Agent Timeouts (in seconds)
    AGENT_TIMEOUTS = {
        "calendar": 30,
        "task": 30,
        "conflict": 45,
        "travel": 30,
        "planning": 45,
    }
    
    # Max Retries for Failed Agents
    MAX_RETRIES: int = 2


# ============================================
# API CONFIGURATION
# ============================================

class APIConfig:
    """Configuration for FastAPI and endpoints"""
    
    # Server Settings
    HOST: str = os.getenv("API_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("API_PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # CORS Settings
    CORS_ORIGINS: list = ["*"]  # Update for production
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: list = ["*"]
    CORS_HEADERS: list = ["*"]
    
    # API Documentation
    TITLE: str = "Personal Task Automation API"
    DESCRIPTION: str = "AI-powered schedule analyzer using LangGraph agents"
    VERSION: str = "1.0.0"


# ============================================
# DATA STORAGE CONFIGURATION
# ============================================

class DataConfig:
    """Configuration for data storage and management"""
    
    # File Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    CONFIG_DIR: str = os.path.join(BASE_DIR, "config")
    LOGS_DIR: str = os.path.join(BASE_DIR, "logs")
    
    # Ensure directories exist
    @staticmethod
    def ensure_dirs():
        """Create necessary directories if they don't exist"""
        for directory in [DataConfig.DATA_DIR, DataConfig.LOGS_DIR]:
            os.makedirs(directory, exist_ok=True)
    
    # Data Files
    INPUT_FILE: str = os.path.join(DATA_DIR, "input.json")
    OUTPUT_FILE: str = os.path.join(DATA_DIR, "output.json")
    HISTORY_FILE: str = os.path.join(DATA_DIR, "history.json")
    
    # Storage Behavior
    SAVE_INPUT: bool = True          # Save user inputs
    SAVE_OUTPUT: bool = True         # Save analysis results
    SAVE_HISTORY: bool = True        # Keep analysis history
    HISTORY_LIMIT: int = 100         # Keep last N analyses


# ============================================
# WORKFLOW CONFIGURATION
# ============================================

class WorkflowConfig:
    """Configuration for LangGraph workflow behavior"""
    
    # Workflow Settings
    SEQUENTIAL: bool = True           # Run agents sequentially
    PARALLEL: bool = False            # (Future) Run agents in parallel
    TIMEOUT: int = 300                # Total workflow timeout (seconds)
    
    # Node Names
    AGENT_NODES = {
        "calendar": "calendar",
        "task": "task",
        "conflict": "conflict",
        "travel": "travel",
        "planning": "planning",
    }


# ============================================
# LOGGING CONFIGURATION
# ============================================

class LogConfig:
    """Configuration for application logging"""
    
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.path.join(DataConfig.LOGS_DIR, "app.log")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


# ============================================
# INITIALIZE ALL CONFIGS
# ============================================

def initialize():
    """Initialize all configurations"""
    DataConfig.ensure_dirs()
    return {
        "llm": LLMConfig(),
        "agent": AgentConfig(),
        "api": APIConfig(),
        "data": DataConfig(),
        "workflow": WorkflowConfig(),
        "log": LogConfig(),
    }


# Export configs as singletons
llm_config = LLMConfig()
agent_config = AgentConfig()
api_config = APIConfig()
data_config = DataConfig()
workflow_config = WorkflowConfig()
log_config = LogConfig()

# Initialize on import
DataConfig.ensure_dirs()
