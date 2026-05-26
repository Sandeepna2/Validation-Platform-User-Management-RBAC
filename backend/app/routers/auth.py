from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, get_user_permission_codes
from app.models import Role, User, UserRole
from app.schemas import LoginRequest, MeOut, Token, UserCreate, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def perform_login(body: LoginRequest, db: Session) -> Token:
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> Token:
    return perform_login(body, db)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: UserCreate, db: Session = Depends(get_db)) -> UserOut:
    role = db.query(Role).filter(Role.id == body.role_id).first()
    if role is None:
        raise HTTPException(status_code=400, detail="Invalid role_id")
    if role.name == "admin":
        raise HTTPException(status_code=403, detail="Cannot self-register as admin")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=409, detail="Email already registered")
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
    return _user_to_out(db, u)


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MeOut:
    u = (
        db.query(User)
        .options(joinedload(User.roles).joinedload(UserRole.role))
        .filter(User.id == user.id)
        .first()
    )
    assert u is not None
    perms = sorted(get_user_permission_codes(u))
    role_name = u.roles[0].role.name if u.roles else None
    return MeOut(id=u.id, name=u.name, email=u.email, permissions=perms, role_name=role_name)


def _user_to_out(db: Session, u: User) -> UserOut:
    u = (
        db.query(User)
        .options(joinedload(User.roles).joinedload(UserRole.role))
        .filter(User.id == u.id)
        .first()
    )
    assert u is not None
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
