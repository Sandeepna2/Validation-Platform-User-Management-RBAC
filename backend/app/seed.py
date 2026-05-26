from sqlalchemy.orm import Session

from app.models import Permission, Role, RolePermission, User, UserRole
from app.rbac import ALL_PERMISSIONS, ROLE_DEFINITIONS
from app.security import hash_password


def seed_rbac(db: Session) -> None:
    for code, desc in ALL_PERMISSIONS:
        if db.query(Permission).filter(Permission.code == code).first() is None:
            db.add(Permission(code=code, description=desc))
    db.commit()

    perm_by_code = {p.code: p for p in db.query(Permission).all()}

    for role_name, desc, codes in ROLE_DEFINITIONS:
        role = db.query(Role).filter(Role.name == role_name).first()
        if role is None:
            role = Role(name=role_name, description=desc)
            db.add(role)
            db.flush()
        else:
            role.description = desc
        existing = {rp.permission_id for rp in role.permissions}
        for code in codes:
            pid = perm_by_code[code].id
            if pid not in existing:
                db.add(RolePermission(role_id=role.id, permission_id=pid))
    db.commit()


def _ensure_user_with_role(
    db: Session,
    *,
    email: str,
    name: str,
    password: str,
    role_name: str,
) -> None:
    if db.query(User).filter(User.email == email).first():
        return
    role = db.query(Role).filter(Role.name == role_name).first()
    if role is None:
        return
    u = User(name=name, email=email, password_hash=hash_password(password))
    db.add(u)
    db.flush()
    db.add(UserRole(user_id=u.id, role_id=role.id))
    db.commit()


def seed_demo_users(db: Session) -> None:
    """Idempotent demo accounts for local evaluation (change passwords in production)."""
    _ensure_user_with_role(
        db,
        email="admin@example.com",
        name="Demo Admin",
        password="Admin12345!",
        role_name="admin",
    )
    _ensure_user_with_role(
        db,
        email="engineer@example.com",
        name="Demo Engineer",
        password="Demo12345!",
        role_name="validation_engineer",
    )
    _ensure_user_with_role(
        db,
        email="reviewer@example.com",
        name="Demo Reviewer",
        password="Demo12345!",
        role_name="reviewer",
    )
    _ensure_user_with_role(
        db,
        email="viewer@example.com",
        name="Demo Viewer",
        password="Demo12345!",
        role_name="viewer",
    )
