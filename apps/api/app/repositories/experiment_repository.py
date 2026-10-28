"""
Sandboxed - Experiment Repository
Handles multi-policy experiment records and runs in Policy Lab.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from apps.api.app.models.entities import ExperimentRecord, ExperimentRunRecord


class ExperimentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, experiment: ExperimentRecord, runs: List[ExperimentRunRecord]) -> ExperimentRecord:
        self.db.add(experiment)
        for run in runs:
            self.db.add(run)
        self.db.commit()
        self.db.refresh(experiment)
        return experiment

    def get_by_id(self, experiment_id: str) -> Optional[ExperimentRecord]:
        return self.db.query(ExperimentRecord).filter(ExperimentRecord.id == experiment_id).first()

    def list_all(self, limit: int = 50) -> List[ExperimentRecord]:
        return self.db.query(ExperimentRecord).order_by(ExperimentRecord.created_at.desc()).limit(limit).all()

    def update_status(self, experiment_id: str, status: str) -> None:
        record = self.get_by_id(experiment_id)
        if record:
            record.status = status
            self.db.commit()

    def update_run_execution(self, run_id: str, execution_id: str, status: str) -> None:
        run = self.db.query(ExperimentRunRecord).filter(ExperimentRunRecord.id == run_id).first()
        if run:
            run.execution_id = execution_id
            run.status = status
            self.db.commit()
