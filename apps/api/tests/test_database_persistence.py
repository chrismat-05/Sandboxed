"""
Tests for SQLAlchemy Persistence Layer and Repository Transactions
"""

import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from apps.api.app.models.db import Base
from apps.api.app.models.entities import (
    ExecutionRecord,
    PolicyRecord,
    ExperimentRecord,
    ExperimentRunRecord,
    AuditEventRecord,
)
from apps.api.app.repositories.execution_repository import ExecutionRepository
from apps.api.app.repositories.policy_repository import PolicyRepository
from apps.api.app.repositories.experiment_repository import ExperimentRepository
from apps.api.app.repositories.audit_repository import AuditRepository
from sandbox_engine.policies.models import DEFAULT_POLICIES


@pytest.fixture
def in_memory_db():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_policy_repository_seed_and_retrieval(in_memory_db):
    repo = PolicyRepository(in_memory_db)
    repo.seed_defaults()
    policies = repo.list_all()
    assert len(policies) == len(DEFAULT_POLICIES)

    standard = repo.get_by_id("standard")
    assert standard is not None
    assert standard.name == "Standard Balanced"


def test_execution_repository_crud(in_memory_db):
    repo = ExecutionRepository(in_memory_db)
    exec_id = str(uuid.uuid4())
    record = ExecutionRecord(
        id=exec_id,
        source_hash="abcd1234efgh5678",
        language="python",
        policy_id="standard",
        policy_snapshot="{}",
        state="QUEUED",
        submitted_at=datetime.now(timezone.utc),
    )
    repo.create(record)

    fetched = repo.get_by_id(exec_id)
    assert fetched is not None
    assert fetched.source_hash == "abcd1234efgh5678"
    assert fetched.state == "QUEUED"

    items, total = repo.list_executions(skip=0, limit=10)
    assert total == 1
    assert len(items) == 1


def test_execution_summary_counts(in_memory_db):
    repo = ExecutionRepository(in_memory_db)
    for state in ["COMPLETED", "COMPLETED", "FAILED", "TIMED_OUT", "CANCELLED"]:
        rec = ExecutionRecord(
            id=str(uuid.uuid4()),
            source_hash="hash",
            language="python",
            policy_id="standard",
            policy_snapshot="{}",
            state=state,
            submitted_at=datetime.now(timezone.utc),
        )
        repo.create(rec)

    counts = repo.get_summary_counts()
    assert counts["total"] == 5
    assert counts["COMPLETED"] == 2
    assert counts["FAILED"] == 1
    assert counts["TIMED_OUT"] == 1
    assert counts["CANCELLED"] == 1


def test_experiment_repository_with_runs(in_memory_db):
    repo = ExperimentRepository(in_memory_db)
    exp_id = str(uuid.uuid4())
    experiment = ExperimentRecord(
        id=exp_id,
        name="DB Persistence Exp",
        description="Testing relations",
        source_code="print(1)",
        status="CREATED",
        created_at=datetime.now(timezone.utc),
    )
    runs = [
        ExperimentRunRecord(
            id=str(uuid.uuid4()),
            experiment_id=exp_id,
            policy_id="standard",
            policy_name="Standard",
            run_order=0,
            status="PENDING",
        ),
        ExperimentRunRecord(
            id=str(uuid.uuid4()),
            experiment_id=exp_id,
            policy_id="strict",
            policy_name="Strict",
            run_order=1,
            status="PENDING",
        ),
    ]
    repo.create(experiment, runs)

    fetched = repo.get_by_id(exp_id)
    assert fetched is not None
    assert len(fetched.runs) == 2


def test_audit_event_logging(in_memory_db):
    repo = AuditRepository(in_memory_db)
    evt = repo.log_event(
        event_type="TEST_SECURITY_EVENT",
        execution_id="exec-123",
        details={"reason": "test"},
    )
    assert evt.id is not None
    assert evt.event_type == "TEST_SECURITY_EVENT"

    events = repo.list_events()
    assert len(events) == 1
    assert events[0].execution_id == "exec-123"
