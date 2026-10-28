"""
Sandboxed - Policies Router
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from apps.api.app.models.db import get_db
from apps.api.app.schemas.policy import PolicyCreateRequest, PolicyUpdateRequest, PolicyResponse
from apps.api.app.services.policy_service import PolicyService

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.get("", response_model=List[PolicyResponse])
def list_policies(db: Session = Depends(get_db)):
    return PolicyService.list_policies(db)


@router.post("", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
def create_policy(req: PolicyCreateRequest, db: Session = Depends(get_db)):
    try:
        return PolicyService.create_policy(req, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{policy_id}", response_model=PolicyResponse)
def get_policy(policy_id: str, db: Session = Depends(get_db)):
    p = PolicyService.get_policy(policy_id, db)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Policy '{policy_id}' not found.")
    return p


@router.patch("/{policy_id}", response_model=PolicyResponse)
def update_policy(policy_id: str, req: PolicyUpdateRequest, db: Session = Depends(get_db)):
    try:
        return PolicyService.update_policy(policy_id, req, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_policy(policy_id: str, db: Session = Depends(get_db)):
    try:
        success = PolicyService.delete_policy(policy_id, db)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Policy '{policy_id}' not found.")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
