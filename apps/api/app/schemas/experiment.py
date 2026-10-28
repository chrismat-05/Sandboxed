"""
Sandboxed - Experiment Schemas for Policy Lab
Enables cross-policy evaluation of real sandboxed workloads.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ExperimentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    description: str = Field(default="", max_length=512)
    workload_id: Optional[str] = Field(default=None, description="Optional ID of built-in workload")
    source_code: str = Field(..., min_length=1, max_length=100000)
    policy_ids: List[str] = Field(..., min_length=1, max_length=6, description="Policies to compare")


class ExperimentRunResponse(BaseModel):
    id: str
    experiment_id: str
    execution_id: Optional[str]
    policy_id: str
    policy_name: str
    run_order: int
    status: str
    state: Optional[str] = None
    wall_time_sec: Optional[float] = None
    cpu_total_sec: Optional[float] = None
    peak_memory_mb: Optional[float] = None
    exit_code: Optional[int] = None
    termination_reason: Optional[str] = None
    error_summary: Optional[str] = None


class ExperimentDetailResponse(BaseModel):
    id: str
    name: str
    description: str
    workload_id: Optional[str]
    source_code: str
    status: str
    created_at: datetime
    runs: List[ExperimentRunResponse]


class ExperimentComparisonItem(BaseModel):
    policy_id: str
    policy_name: str
    execution_id: Optional[str]
    status: str
    termination_reason: Optional[str]
    exit_code: Optional[int]
    wall_time_sec: float
    cpu_total_sec: Optional[float]
    peak_memory_mb: Optional[float]
    output_bytes: int
    error_summary: Optional[str]


class ExperimentResultsResponse(BaseModel):
    experiment_id: str
    name: str
    workload_id: Optional[str]
    status: str
    total_runs: int
    completed_runs: int
    comparisons: List[ExperimentComparisonItem]
    interpretation: str
