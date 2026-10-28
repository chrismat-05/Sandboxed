"""
Sandboxed - Experiments Router for Policy Lab
Supports multi-policy comparative evaluation and telemetry analysis.
"""

import asyncio
from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from apps.api.app.models.db import get_db, SessionLocal
from apps.api.app.repositories.experiment_repository import ExperimentRepository
from apps.api.app.schemas.experiment import (
    ExperimentCreateRequest,
    ExperimentDetailResponse,
    ExperimentResultsResponse,
)
from apps.api.app.services.experiment_service import ExperimentService
from apps.api.app.api.deps import get_execution_service

router = APIRouter(prefix="/experiments", tags=["Policy Lab Experiments"])


def get_experiment_service(service=Depends(get_execution_service)) -> ExperimentService:
    return ExperimentService(service)


@router.post("", response_model=ExperimentDetailResponse, status_code=status.HTTP_201_CREATED)
def create_experiment(
    req: ExperimentCreateRequest,
    db: Session = Depends(get_db),
    service: ExperimentService = Depends(get_experiment_service),
):
    try:
        return service.create_experiment(req, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("", response_model=List[ExperimentDetailResponse])
def list_experiments(
    db: Session = Depends(get_db),
    service: ExperimentService = Depends(get_experiment_service),
):
    repo = ExperimentRepository(db)
    experiments = repo.list_all()
    results = []
    for exp in experiments:
        details = service.get_experiment_details(exp.id, db)
        if details:
            results.append(details)
    return results


@router.get("/{experiment_id}", response_model=ExperimentDetailResponse)
def get_experiment(
    experiment_id: str,
    db: Session = Depends(get_db),
    service: ExperimentService = Depends(get_experiment_service),
):
    details = service.get_experiment_details(experiment_id, db)
    if not details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Experiment '{experiment_id}' not found.")
    return details


async def _run_experiment_bg(experiment_id: str, service: ExperimentService):
    db = SessionLocal()
    try:
        await service.run_experiment(experiment_id, db)
    finally:
        db.close()


@router.post("/{experiment_id}/run")
async def run_experiment(
    experiment_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    service: ExperimentService = Depends(get_experiment_service),
):
    exp_repo = ExperimentRepository(db)
    exp = exp_repo.get_by_id(experiment_id)
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Experiment '{experiment_id}' not found.")

    background_tasks.add_task(_run_experiment_bg, experiment_id, service)
    return {"status": "experiment_started", "experiment_id": experiment_id}


@router.get("/{experiment_id}/results", response_model=ExperimentResultsResponse)
def get_experiment_results(
    experiment_id: str,
    db: Session = Depends(get_db),
    service: ExperimentService = Depends(get_experiment_service),
):
    results = service.get_results(experiment_id, db)
    if not results:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Experiment '{experiment_id}' not found.")
    return results
