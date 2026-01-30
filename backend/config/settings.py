"""
Central configuration for AI models and system settings
"""

import os
from dotenv import load_dotenv

load_dotenv()

# -------- AI Provider Configuration --------
AI_PROVIDER = os.getenv("AI_PROVIDER", "openrouter")

# -------- Model Configuration --------
AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "deepseek/deepseek-r1")

# -------- Generation Parameters --------
AI_TEMPERATURE = float(os.getenv("AI_TEMPERATURE", 0.4))
AI_MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", 150))

# -------- API Endpoints --------
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
