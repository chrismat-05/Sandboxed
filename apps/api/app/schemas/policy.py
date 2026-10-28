"""
Sandboxed - Policy Request & Response Schemas
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from sandbox_engine.policies.models import FilesystemPolicy, SyscallPolicy


class PolicyCreateRequest(BaseModel):
    id: str = Field(..., min_length=2, max_length=64, pattern=r"^[a-zA-Z0-9_\-]+$")
    name: str = Field(..., min_length=2, max_length=64)
    description: str = Field(default="", max_length=256)
    wall_time_limit_sec: float = Field(default=5.0, ge=0.1, le=60.0)
    memory_limit_mb: int = Field(default=128, ge=16, le=2048)
    cpu_quota_pct: int = Field(default=50, ge=10, le=100)
    max_processes: int = Field(default=32, ge=1, le=128)
    max_output_bytes: int = Field(default=65536, ge=1024, le=1048576)
    temp_storage_mb: int = Field(default=64, ge=8, le=512)
    network_enabled: bool = Field(default=False)
    filesystem_policy: FilesystemPolicy = Field(default=FilesystemPolicy.ISOLATED_RO_ROOT)
    syscall_policy: SyscallPolicy = Field(default=SyscallPolicy.STANDARD)


class PolicyUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=64)
    description: Optional[str] = Field(default=None, max_length=256)
    wall_time_limit_sec: Optional[float] = Field(default=None, ge=0.1, le=60.0)
    memory_limit_mb: Optional[int] = Field(default=None, ge=16, le=2048)
    cpu_quota_pct: Optional[int] = Field(default=None, ge=10, le=100)
    max_processes: Optional[int] = Field(default=None, ge=1, le=128)
    max_output_bytes: Optional[int] = Field(default=None, ge=1024, le=1048576)
    temp_storage_mb: Optional[int] = Field(default=None, ge=8, le=512)
    network_enabled: Optional[bool] = None
    filesystem_policy: Optional[FilesystemPolicy] = None
    syscall_policy: Optional[SyscallPolicy] = None


class PolicyResponse(BaseModel):
    id: str
    name: str
    description: str
    wall_time_limit_sec: float
    memory_limit_mb: int
    cpu_quota_pct: int
    max_processes: int
    max_output_bytes: int
    temp_storage_mb: int
    network_enabled: bool
    filesystem_policy: str
    syscall_policy: str
    created_at: datetime
    updated_at: datetime
