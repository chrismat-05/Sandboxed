"""
Sandboxed - Executions Router
Handles job submission, status polling, cancellation, output streaming, and telemetry retrieval.
"""

import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from apps.api.app.models.db import get_db
from apps.api.app.repositories.execution_repository import ExecutionRepository
from apps.api.app.schemas.execution import (
    ExecutionCreateRequest,
    ExecutionDetailResponse,
    ExecutionSummaryResponse,
    ExecutionOutputResponse,
    ExecutionMetricsResponse,
)
from apps.api.app.services.execution_service import ExecutionService
from apps.api.app.api.deps import get_execution_service

router = APIRouter(prefix="/executions", tags=["Executions"])


@router.post("", response_model=ExecutionDetailResponse, status_code=status.HTTP_201_CREATED)
async def submit_execution(
    req: ExecutionCreateRequest,
    db: Session = Depends(get_db),
    service: ExecutionService = Depends(get_execution_service),
):
    try:
        record = await service.submit_execution(
            source_code=req.source_code,
            policy_id=req.policy_id,
            custom_policy=req.custom_policy,
            language=req.language,
            db=db,
        )
        return _to_detail_response(record)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@router.get("", response_model=List[ExecutionSummaryResponse])
def list_executions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    repo = ExecutionRepository(db)
    records, _ = repo.list_executions(skip=skip, limit=limit, state=state)
    return [
        ExecutionSummaryResponse(
            id=r.id,
            language=r.language,
            policy_id=r.policy_id,
            state=r.state,
            exit_code=r.exit_code,
            termination_reason=r.termination_reason,
            wall_time_sec=r.wall_time_sec,
            peak_memory_mb=r.peak_memory_mb,
            submitted_at=r.submitted_at,
            finished_at=r.finished_at,
        )
        for r in records
    ]


@router.get("/{execution_id}", response_model=ExecutionDetailResponse)
def get_execution(execution_id: str, db: Session = Depends(get_db)):
    repo = ExecutionRepository(db)
    record = repo.get_by_id(execution_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Execution '{execution_id}' not found.")
    return _to_detail_response(record)


@router.post("/{execution_id}/cancel")
def cancel_execution(
    execution_id: str,
    db: Session = Depends(get_db),
    service: ExecutionService = Depends(get_execution_service),
):
    cancelled = service.cancel_execution(execution_id, db)
    if not cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Execution '{execution_id}' cannot be cancelled (not found or already finished).",
        )
    return {"status": "cancellation_requested", "execution_id": execution_id}


@router.get("/{execution_id}/output", response_model=ExecutionOutputResponse)
def get_execution_output(execution_id: str, db: Session = Depends(get_db)):
    repo = ExecutionRepository(db)
    record = repo.get_by_id(execution_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Execution '{execution_id}' not found.")
    return ExecutionOutputResponse(
        id=record.id,
        stdout=record.stdout or "",
        stderr=record.stderr or "",
        output_bytes=record.output_bytes or 0,
        truncated=False,
    )


@router.get("/{execution_id}/metrics", response_model=ExecutionMetricsResponse)
def get_execution_metrics(execution_id: str, db: Session = Depends(get_db)):
    repo = ExecutionRepository(db)
    record = repo.get_by_id(execution_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Execution '{execution_id}' not found.")
    return ExecutionMetricsResponse(
        id=record.id,
        wall_time_sec=record.wall_time_sec,
        cpu_total_sec=record.cpu_total_sec,
        cpu_user_sec=record.cpu_user_sec,
        cpu_system_sec=record.cpu_system_sec,
        peak_memory_mb=record.peak_memory_mb,
        oom_killed=record.oom_killed,
        output_bytes=record.output_bytes,
    )


def _to_detail_response(record) -> ExecutionDetailResponse:
    snapshot = {}
    try:
        snapshot = json.loads(record.policy_snapshot)
    except Exception:
        pass
    return ExecutionDetailResponse(
        id=record.id,
        source_hash=record.source_hash,
        language=record.language,
        policy_id=record.policy_id,
        policy_snapshot=snapshot,
        state=record.state,
        exit_code=record.exit_code,
        termination_reason=record.termination_reason,
        stdout=record.stdout or "",
        stderr=record.stderr or "",
        error_summary=record.error_summary,
        wall_time_sec=record.wall_time_sec,
        cpu_total_sec=record.cpu_total_sec,
        cpu_user_sec=record.cpu_user_sec,
        cpu_system_sec=record.cpu_system_sec,
        peak_memory_mb=record.peak_memory_mb,
        oom_killed=record.oom_killed,
        output_bytes=record.output_bytes,
        submitted_at=record.submitted_at,
        started_at=record.started_at,
        finished_at=record.finished_at,
    )
