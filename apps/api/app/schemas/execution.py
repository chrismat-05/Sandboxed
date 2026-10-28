"""
Sandboxed - Execution Request & Response Schemas
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from sandbox_engine.policies.models import ExecutionPolicy


class ExecutionCreateRequest(BaseModel):
    source_code: str = Field(..., min_length=1, max_length=100000, description="Python script source code")
    policy_id: Optional[str] = Field(default="standard", description="ID of existing policy profile")
    custom_policy: Optional[ExecutionPolicy] = Field(default=None, description="Optional custom policy overrides")
    language: str = Field(default="python", description="Target execution runtime (currently python)")


class ExecutionSummaryResponse(BaseModel):
    id: str
    language: str
    policy_id: str
    state: str
    exit_code: Optional[int]
    termination_reason: Optional[str]
    wall_time_sec: float
    peak_memory_mb: Optional[float]
    submitted_at: datetime
    finished_at: Optional[datetime]


class ExecutionDetailResponse(BaseModel):
    id: str
    source_hash: str
    language: str
    policy_id: str
    policy_snapshot: dict
    state: str
    exit_code: Optional[int]
    termination_reason: Optional[str]
    stdout: str
    stderr: str
    error_summary: Optional[str]
    wall_time_sec: float
    cpu_total_sec: Optional[float]
    cpu_user_sec: Optional[float]
    cpu_system_sec: Optional[float]
    peak_memory_mb: Optional[float]
    oom_killed: bool
    output_bytes: int
    submitted_at: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]


class ExecutionOutputResponse(BaseModel):
    id: str
    stdout: str
    stderr: str
    output_bytes: int
    truncated: bool


class ExecutionMetricsResponse(BaseModel):
    id: str
    wall_time_sec: float
    cpu_total_sec: Optional[float]
    cpu_user_sec: Optional[float]
    cpu_system_sec: Optional[float]
    peak_memory_mb: Optional[float]
    oom_killed: bool
    output_bytes: int
