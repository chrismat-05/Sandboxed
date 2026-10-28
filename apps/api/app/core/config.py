"""
Sandboxed API - Application Configuration
Loads settings from environment variables with sensible development defaults.
"""

import json
import os
from pathlib import Path
from typing import List


class Settings:
    PROJECT_NAME: str = "Sandboxed"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    API_HOST: str = os.getenv("SANDBOXED_API_HOST", "127.0.0.1")
    API_PORT: int = int(os.getenv("SANDBOXED_API_PORT", "8000"))
    ENV: str = os.getenv("SANDBOXED_ENV", "development")

    # CORS configuration
    _cors_raw = os.getenv("SANDBOXED_CORS_ORIGINS", '["http://localhost:5173", "http://127.0.0.1:5173"]')
    try:
        CORS_ORIGINS: List[str] = json.loads(_cors_raw)
    except Exception:
        CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Persistence
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sandboxed.db")

    # Execution Engine Configuration
    MAX_CONCURRENCY: int = int(os.getenv("SANDBOXED_MAX_CONCURRENCY", "1"))
    JOB_QUEUE_CAPACITY: int = int(os.getenv("SANDBOXED_JOB_QUEUE_CAPACITY", "50"))
    STORAGE_DIR: str = os.getenv("SANDBOXED_STORAGE_DIR", "/tmp/sandboxed_storage")

    # Limits
    DEFAULT_WALL_TIME_LIMIT_SEC: float = float(os.getenv("SANDBOXED_DEFAULT_WALL_TIME_LIMIT_SEC", "5.0"))
    MAX_WALL_TIME_LIMIT_SEC: float = float(os.getenv("SANDBOXED_MAX_WALL_TIME_LIMIT_SEC", "60.0"))
    DEFAULT_MEMORY_LIMIT_MB: int = int(os.getenv("SANDBOXED_DEFAULT_MEMORY_LIMIT_MB", "128"))
    MAX_MEMORY_LIMIT_MB: int = int(os.getenv("SANDBOXED_MAX_MEMORY_LIMIT_MB", "1024"))
    MAX_OUTPUT_BYTES: int = int(os.getenv("SANDBOXED_MAX_OUTPUT_BYTES", "65536"))

    # Linux Paths
    BWRAP_PATH: str = os.getenv("BWRAP_BINARY_PATH", "/usr/bin/bwrap")
    CGROUP_ROOT: str = os.getenv("CGROUP_ROOT", "/sys/fs/cgroup")
    CGROUP_SLICE: str = os.getenv("CGROUP_SANDBOX_SLICE", "sandboxed.slice")


settings = Settings()
