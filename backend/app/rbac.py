"""Permission codes used across the API."""

ADMIN_FULL = "admin:full"
USERS_READ = "users:read"
USERS_CREATE = "users:create"
USERS_UPDATE = "users:update"
USERS_ASSIGN_ROLE = "users:assign_role"
PROJECTS_CREATE = "projects:create"
PROJECTS_READ_ALL = "projects:read_all"
PROJECTS_READ_OWN = "projects:read_own"
PROJECTS_UPDATE_OWN = "projects:update_own"
PROJECTS_UPDATE_REVIEW = "projects:update_review"
PROJECTS_DELETE = "projects:delete"

ALL_PERMISSIONS: list[tuple[str, str]] = [
    (ADMIN_FULL, "Bypass all checks (admin)"),
    (USERS_READ, "List and view users"),
    (USERS_CREATE, "Create users"),
    (USERS_UPDATE, "Update user profile / active flag"),
    (USERS_ASSIGN_ROLE, "Assign role to user"),
    (PROJECTS_CREATE, "Create validation projects"),
    (PROJECTS_READ_ALL, "View all projects"),
    (PROJECTS_READ_OWN, "View own projects only"),
    (PROJECTS_UPDATE_OWN, "Edit own projects (non-review fields)"),
    (PROJECTS_UPDATE_REVIEW, "Update project review status"),
    (PROJECTS_DELETE, "Delete any project"),
]

ROLE_DEFINITIONS: list[tuple[str, str | None, list[str]]] = [
    (
        "admin",
        "Full platform access",
        [code for code, _ in ALL_PERMISSIONS],
    ),
    (
        "validation_engineer",
        "Create and edit own validation projects",
        [
            PROJECTS_CREATE,
            PROJECTS_READ_ALL,
            PROJECTS_UPDATE_OWN,
        ],
    ),
    (
        "reviewer",
        "View all projects and approve/reject results",
        [
            PROJECTS_READ_ALL,
            PROJECTS_UPDATE_REVIEW,
        ],
    ),
    (
        "viewer",
        "Read-only access to projects",
        [PROJECTS_READ_ALL],
    ),
]


def user_effective_permissions(permission_codes: set[str]) -> set[str]:
    """Expand admin full to mean every permission code (for display and broad checks)."""
    if ADMIN_FULL in permission_codes:
        return {code for code, _ in ALL_PERMISSIONS}
    return permission_codes


def can_access_project_read(
    permissions: set[str], user_id: int, project_owner_id: int
) -> bool:
    p = user_effective_permissions(permissions)
    if PROJECTS_READ_ALL in p:
        return True
    if PROJECTS_READ_OWN in p and user_id == project_owner_id:
        return True
    return False


def can_update_project_body(permissions: set[str], user_id: int, project_owner_id: int) -> bool:
    if ADMIN_FULL in permissions:
        return True
    p = user_effective_permissions(permissions)
    return PROJECTS_UPDATE_OWN in p and user_id == project_owner_id


def can_update_review(permissions: set[str]) -> bool:
    if ADMIN_FULL in permissions:
        return True
    p = user_effective_permissions(permissions)
    return PROJECTS_UPDATE_REVIEW in p


def can_delete_project(permissions: set[str]) -> bool:
    if ADMIN_FULL in permissions:
        return True
    p = user_effective_permissions(permissions)
    return PROJECTS_DELETE in p


def can_create_project(permissions: set[str]) -> bool:
    if ADMIN_FULL in permissions:
        return True
    p = user_effective_permissions(permissions)
    return PROJECTS_CREATE in p
