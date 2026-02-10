import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


class Settings:
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    MAX_TOKENS_ARTICLE: int = 4096
    MAX_TOKENS_SUMMARY: int = 2048
    MAX_TOKENS_CLEANUP: int = 4096
    MAX_TOKENS_CONSISTENCY: int = 2048


settings = Settings()
