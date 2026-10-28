"""
Sandboxed - Policy Repository
Persists security policy configurations in SQLite.
"""

import json
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from apps.api.app.models.entities import PolicyRecord
from sandbox_engine.policies.models import DEFAULT_POLICIES, ExecutionPolicy


class PolicyRepository:
    def __init__(self, db: Session):
        self.db = db

    def seed_defaults(self) -> None:
        """Seeds built-in policies if database is newly initialized."""
        for policy in DEFAULT_POLICIES.values():
            existing = self.db.query(PolicyRecord).filter(PolicyRecord.id == policy.id).first()
            if not existing:
                record = PolicyRecord(
                    id=policy.id,
                    name=policy.name,
                    description=policy.description,
                    config_json=policy.model_dump_json(),
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                self.db.add(record)
        self.db.commit()

    def list_all(self) -> List[PolicyRecord]:
        return self.db.query(PolicyRecord).order_by(PolicyRecord.id).all()

    def get_by_id(self, policy_id: str) -> Optional[PolicyRecord]:
        return self.db.query(PolicyRecord).filter(PolicyRecord.id == policy_id).first()

    def save(self, policy: ExecutionPolicy) -> PolicyRecord:
        record = self.get_by_id(policy.id)
        if not record:
            record = PolicyRecord(
                id=policy.id,
                name=policy.name,
                description=policy.description,
                config_json=policy.model_dump_json(),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            self.db.add(record)
        else:
            record.name = policy.name
            record.description = policy.description
            record.config_json = policy.model_dump_json()
            record.updated_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(record)
        return record

    def delete(self, policy_id: str) -> bool:
        # Protect default standard and strict policies from deletion
        if policy_id in ("standard", "strict"):
            raise ValueError(f"Core built-in policy '{policy_id}' cannot be deleted.")

        record = self.get_by_id(policy_id)
        if not record:
            return False

        self.db.delete(record)
        self.db.commit()
        return True
