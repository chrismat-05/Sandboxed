"""
Sandboxed - Policy Service
Business logic and security enforcement for execution policies.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from apps.api.app.models.entities import PolicyRecord
from apps.api.app.repositories.policy_repository import PolicyRepository
from apps.api.app.repositories.audit_repository import AuditRepository
from apps.api.app.schemas.policy import PolicyCreateRequest, PolicyUpdateRequest, PolicyResponse
from sandbox_engine.policies.models import ExecutionPolicy


class PolicyService:
    @staticmethod
    def list_policies(db: Session) -> List[PolicyResponse]:
        repo = PolicyRepository(db)
        repo.seed_defaults()
        records = repo.list_all()
        results = []
        for r in records:
            p = ExecutionPolicy.model_validate_json(r.config_json)
            results.append(
                PolicyResponse(
                    id=p.id,
                    name=p.name,
                    description=p.description,
                    wall_time_limit_sec=p.wall_time_limit_sec,
                    memory_limit_mb=p.memory_limit_mb,
                    cpu_quota_pct=p.cpu_quota_pct,
                    max_processes=p.max_processes,
                    max_output_bytes=p.max_output_bytes,
                    temp_storage_mb=p.temp_storage_mb,
                    network_enabled=p.network_enabled,
                    filesystem_policy=p.filesystem_policy.value,
                    syscall_policy=p.syscall_policy.value,
                    created_at=r.created_at,
                    updated_at=r.updated_at,
                )
            )
        return results

    @staticmethod
    def get_policy(policy_id: str, db: Session) -> Optional[PolicyResponse]:
        repo = PolicyRepository(db)
        r = repo.get_by_id(policy_id)
        if not r:
            return None
        p = ExecutionPolicy.model_validate_json(r.config_json)
        return PolicyResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            wall_time_limit_sec=p.wall_time_limit_sec,
            memory_limit_mb=p.memory_limit_mb,
            cpu_quota_pct=p.cpu_quota_pct,
            max_processes=p.max_processes,
            max_output_bytes=p.max_output_bytes,
            temp_storage_mb=p.temp_storage_mb,
            network_enabled=p.network_enabled,
            filesystem_policy=p.filesystem_policy.value,
            syscall_policy=p.syscall_policy.value,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )

    @staticmethod
    def create_policy(req: PolicyCreateRequest, db: Session) -> PolicyResponse:
        repo = PolicyRepository(db)
        audit_repo = AuditRepository(db)

        existing = repo.get_by_id(req.id)
        if existing:
            raise ValueError(f"Policy with id '{req.id}' already exists.")

        policy = ExecutionPolicy(
            id=req.id,
            name=req.name,
            description=req.description,
            wall_time_limit_sec=req.wall_time_limit_sec,
            memory_limit_mb=req.memory_limit_mb,
            cpu_quota_pct=req.cpu_quota_pct,
            max_processes=req.max_processes,
            max_output_bytes=req.max_output_bytes,
            temp_storage_mb=req.temp_storage_mb,
            network_enabled=req.network_enabled,
            filesystem_policy=req.filesystem_policy,
            syscall_policy=req.syscall_policy,
        )

        record = repo.save(policy)
        audit_repo.log_event("POLICY_CREATED", details={"policy_id": policy.id, "name": policy.name})

        return PolicyResponse(
            id=policy.id,
            name=policy.name,
            description=policy.description,
            wall_time_limit_sec=policy.wall_time_limit_sec,
            memory_limit_mb=policy.memory_limit_mb,
            cpu_quota_pct=policy.cpu_quota_pct,
            max_processes=policy.max_processes,
            max_output_bytes=policy.max_output_bytes,
            temp_storage_mb=policy.temp_storage_mb,
            network_enabled=policy.network_enabled,
            filesystem_policy=policy.filesystem_policy.value,
            syscall_policy=policy.syscall_policy.value,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    @staticmethod
    def update_policy(policy_id: str, req: PolicyUpdateRequest, db: Session) -> PolicyResponse:
        repo = PolicyRepository(db)
        audit_repo = AuditRepository(db)

        record = repo.get_by_id(policy_id)
        if not record:
            raise ValueError(f"Policy '{policy_id}' not found.")

        current = ExecutionPolicy.model_validate_json(record.config_json)
        update_data = req.model_dump(exclude_unset=True)

        updated_dict = current.model_dump()
        updated_dict.update(update_data)
        updated_policy = ExecutionPolicy.model_validate(updated_dict)

        record = repo.save(updated_policy)
        audit_repo.log_event("POLICY_UPDATED", details={"policy_id": policy_id})

        return PolicyResponse(
            id=updated_policy.id,
            name=updated_policy.name,
            description=updated_policy.description,
            wall_time_limit_sec=updated_policy.wall_time_limit_sec,
            memory_limit_mb=updated_policy.memory_limit_mb,
            cpu_quota_pct=updated_policy.cpu_quota_pct,
            max_processes=updated_policy.max_processes,
            max_output_bytes=updated_policy.max_output_bytes,
            temp_storage_mb=updated_policy.temp_storage_mb,
            network_enabled=updated_policy.network_enabled,
            filesystem_policy=updated_policy.filesystem_policy.value,
            syscall_policy=updated_policy.syscall_policy.value,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    @staticmethod
    def delete_policy(policy_id: str, db: Session) -> bool:
        repo = PolicyRepository(db)
        audit_repo = AuditRepository(db)
        deleted = repo.delete(policy_id)
        if deleted:
            audit_repo.log_event("POLICY_DELETED", details={"policy_id": policy_id})
        return deleted
