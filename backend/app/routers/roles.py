from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Role, RolePermission
from app.schemas import PermissionOut, RoleDetailOut

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RoleDetailOut])
def list_roles(db: Session = Depends(get_db)) -> list[RoleDetailOut]:
    rows = (
        db.query(Role)
        .options(joinedload(Role.permissions).joinedload(RolePermission.permission))
        .order_by(Role.id)
        .all()
    )
    out: list[RoleDetailOut] = []
    for r in rows:
        perms = [
            PermissionOut.model_validate(rp.permission)
            for rp in r.permissions
            if rp.permission is not None
        ]
        out.append(
            RoleDetailOut(
                id=r.id,
                name=r.name,
                description=r.description,
                permissions=perms,
            )
        )
    return out
