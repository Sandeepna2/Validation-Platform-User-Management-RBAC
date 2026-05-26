from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_user_permission_codes
from app.models import User, ValidationProject
from app.rbac import (
    can_access_project_read,
    can_create_project,
    can_delete_project,
    can_update_project_body,
    can_update_review,
)
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


def _to_out(p: ValidationProject) -> ProjectOut:
    return ProjectOut(
        id=p.id,
        name=p.name,
        vehicle_platform=p.vehicle_platform,
        odd_type=p.odd_type,
        status=p.status,
        review_status=p.review_status,
        created_by_id=p.created_by_id,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProjectOut]:
    perms = get_user_permission_codes(user)
    rows = db.query(ValidationProject).order_by(ValidationProject.id.desc()).all()
    out = [p for p in rows if can_access_project_read(perms, user.id, p.created_by_id)]
    return [_to_out(p) for p in out]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectOut:
    perms = get_user_permission_codes(user)
    if not can_create_project(perms):
        raise HTTPException(status_code=403, detail="Cannot create projects")
    p = ValidationProject(
        name=body.name,
        vehicle_platform=body.vehicle_platform,
        odd_type=body.odd_type,
        status=body.status,
        review_status="pending",
        created_by_id=user.id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    body: ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectOut:
    p = db.query(ValidationProject).filter(ValidationProject.id == project_id).first()
    if p is None:
        raise HTTPException(status_code=404, detail="Project not found")
    perms = get_user_permission_codes(user)
    if not can_access_project_read(perms, user.id, p.created_by_id):
        raise HTTPException(status_code=404, detail="Project not found")

    review_fields = body.review_status is not None
    core_fields = any(
        x is not None for x in (body.name, body.vehicle_platform, body.odd_type, body.status)
    )

    if review_fields and not can_update_review(perms):
        raise HTTPException(status_code=403, detail="Cannot update review status")

    if core_fields and not can_update_project_body(perms, user.id, p.created_by_id):
        raise HTTPException(status_code=403, detail="Cannot update this project")

    # Reviewer without body update rights: only review_status
    if can_update_review(perms) and not can_update_project_body(perms, user.id, p.created_by_id):
        if core_fields:
            raise HTTPException(
                status_code=403,
                detail="Reviewers may only update review_status",
            )
        if body.review_status is not None:
            p.review_status = body.review_status
        db.commit()
        db.refresh(p)
        return _to_out(p)

    if body.name is not None:
        p.name = body.name
    if body.vehicle_platform is not None:
        p.vehicle_platform = body.vehicle_platform
    if body.odd_type is not None:
        p.odd_type = body.odd_type
    if body.status is not None:
        p.status = body.status
    if body.review_status is not None and can_update_review(perms):
        p.review_status = body.review_status

    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    p = db.query(ValidationProject).filter(ValidationProject.id == project_id).first()
    if p is None:
        raise HTTPException(status_code=404, detail="Project not found")
    perms = get_user_permission_codes(user)
    if not can_delete_project(perms):
        raise HTTPException(status_code=403, detail="Cannot delete projects")
    db.delete(p)
    db.commit()
