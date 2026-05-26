from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Role, RolePermission, User, UserRole
from app.security import decode_token 

bearer_scheme = HTTPBearer(auto_error=False)

 
def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_token(creds.credentials)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = (
        db.query(User)
        .options(joinedload(User.roles).joinedload(UserRole.role).joinedload(Role.permissions).joinedload(RolePermission.permission))  # noqa: E501
        .filter(User.id == user_id)
        .first()
    )
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def get_user_permission_codes(user: User) -> set[str]:
    codes: set[str] = set()
    for ur in user.roles:
        for rp in ur.role.permissions:
            if rp.permission and rp.permission.code:
                codes.add(rp.permission.code)
    return codes


def require_permissions(*needed: str) -> Callable[..., User]:
    """Require the current user to hold at least one of the given permission codes (OR)."""

    def checker(user: User = Depends(get_current_user)) -> User:
        held = get_user_permission_codes(user)
        if "admin:full" in held:
            return user
        if any(n in held for n in needed):
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    return checker
