# audit repository.. prof asked for logging so here it is
# could be viva qn
# this works almost always
# dont delete this error, it crashes everything..

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from apps.api.app.models.entities import AuditEventRecord


class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def log_event(
        self,
        event_type: str,
        execution_id: Optional[str] = None,
        experiment_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditEventRecord:
        record = AuditEventRecord(
            id=str(uuid.uuid4()),
            execution_id=execution_id,
            experiment_id=experiment_id,
            event_type=event_type,
            details_json=json.dumps(details or {}),
            timestamp=datetime.now(timezone.utc),
        )
        self.db.add(record)
        self.db.commit()
        return record

    def list_events(self, limit: int = 100) -> List[AuditEventRecord]:
        return self.db.query(AuditEventRecord).order_by(AuditEventRecord.timestamp.desc()).limit(limit).all()
