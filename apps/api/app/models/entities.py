"""
Sandboxed - SQLAlchemy Persistence Entities
Normalized schema storing execution history, policies, experiments, and security audit logs.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from apps.api.app.models.db import Base


class PolicyRecord(Base):
    __tablename__ = "policies"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, default="")
    config_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ExecutionRecord(Base):
    __tablename__ = "executions"

    id = Column(String(36), primary_key=True)
    source_hash = Column(String(64), index=True, nullable=False)
    language = Column(String(32), default="python")
    policy_id = Column(String(64), nullable=False)
    policy_snapshot = Column(Text, nullable=False)
    state = Column(String(32), index=True, nullable=False)
    exit_code = Column(Integer, nullable=True)
    termination_reason = Column(String(32), nullable=True)
    stdout = Column(Text, default="")
    stderr = Column(Text, default="")
    error_summary = Column(Text, nullable=True)
    
    # Telemetry
    wall_time_sec = Column(Float, default=0.0)
    cpu_total_sec = Column(Float, nullable=True)
    cpu_user_sec = Column(Float, nullable=True)
    cpu_system_sec = Column(Float, nullable=True)
    peak_memory_mb = Column(Float, nullable=True)
    oom_killed = Column(Boolean, default=False)
    output_bytes = Column(Integer, default=0)
    
    # Timestamps
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)


class ExperimentRecord(Base):
    __tablename__ = "experiments"

    id = Column(String(36), primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, default="")
    workload_id = Column(String(64), nullable=True)
    source_code = Column(Text, nullable=False)
    status = Column(String(32), default="CREATED")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    runs = relationship("ExperimentRunRecord", back_populates="experiment", cascade="all, delete-orphan")


class ExperimentRunRecord(Base):
    __tablename__ = "experiment_runs"

    id = Column(String(36), primary_key=True)
    experiment_id = Column(String(36), ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False)
    execution_id = Column(String(36), nullable=True)
    policy_id = Column(String(64), nullable=False)
    policy_name = Column(String(128), nullable=False)
    run_order = Column(Integer, default=0)
    status = Column(String(32), default="PENDING")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    experiment = relationship("ExperimentRecord", back_populates="runs")


class AuditEventRecord(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True)
    execution_id = Column(String(36), nullable=True, index=True)
    experiment_id = Column(String(36), nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    details_json = Column(Text, default="{}")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
