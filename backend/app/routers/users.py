from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import require_permissions
from app.models import Role, User, UserRole
from app.rbac import USERS_ASSIGN_ROLE, USERS_CREATE, USERS_READ, USERS_UPDATE
from app.schemas import UserActivePatch, UserCreate, UserOut, UserRoleUpdate
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _to_out(u: User) -> UserOut:
    ur = u.roles[0] if u.roles else None
    return UserOut(
        id=u.id,
        name=u.name,
        email=u.email,
        is_active=u.is_active,
        role_id=ur.role_id if ur else None,
        role_name=ur.role.name if ur and ur.role else None,
        created_at=u.created_at,
    )


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(USERS_READ)),
) -> list[UserOut]:
    rows = db.query(User).options(joinedload(User.roles).joinedload(UserRole.role)).order_by(User.id).all()
    return [_to_out(u) for u in rows]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(USERS_CREATE)),
) -> UserOut:
    role = db.query(Role).filter(Role.id == body.role_id).first()
    if role is None:
        raise HTTPException(status_code=400, detail="Invalid role_id")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="Email already in use")
    u = User(
        name=body.name,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
    )
    db.add(u)
    db.flush()
    db.add(UserRole(user_id=u.id, role_id=body.role_id))
    db.commit()
    db.refresh(u)
    u = db.query(User).options(joinedload(User.roles).joinedload(UserRole.role)).filter(User.id == u.id).first()
    assert u is not None
    return _to_out(u)


@router.put("/{user_id}/role", response_model=UserOut)
def assign_role(
    user_id: int,
    body: UserRoleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(USERS_ASSIGN_ROLE)),
) -> UserOut:
    u = db.query(User).options(joinedload(User.roles)).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    role = db.query(Role).filter(Role.id == body.role_id).first()
    if role is None:
        raise HTTPException(status_code=400, detail="Invalid role_id")
    # Direct query to ensure we find any existing role link
    ur = db.query(UserRole).filter(UserRole.user_id == user_id).first()
    if ur:
        ur.role_id = body.role_id
    else:
        db.add(UserRole(user_id=user_id, role_id=body.role_id))
    db.commit()
    u = db.query(User).options(joinedload(User.roles).joinedload(UserRole.role)).filter(User.id == user_id).first()
    assert u is not None
    return _to_out(u)


@router.patch("/{user_id}/active", response_model=UserOut)
def set_active(
    user_id: int,
    body: UserActivePatch,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(USERS_UPDATE)),
) -> UserOut:
    u = db.query(User).options(joinedload(User.roles).joinedload(UserRole.role)).filter(User.id == user_id).first()
    if u is None:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_active = body.is_active
    db.commit()
    db.refresh(u)
    return _to_out(u)
