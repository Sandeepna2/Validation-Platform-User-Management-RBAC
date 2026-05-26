from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import models  # noqa: F401 - register SQLAlchemy mappers
from app.config import settings
from app.database import Base, SessionLocal, engine, get_db
from app.routers import auth, projects, roles, users
from app.routers.auth import perform_login
from app.schemas import LoginRequest, Token
from app.seed import seed_demo_users, seed_rbac


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_rbac(db)
        seed_demo_users(db)
    yield


app = FastAPI(
    title="ADAS Validation Platform - RBAC API",
    description="User management, JWT auth, and role-based access for validation projects.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(roles.router, prefix="/api")


@app.post("/login", response_model=Token, tags=["auth"])
def login_assignment_alias(body: LoginRequest, db: Session = Depends(get_db)) -> Token:
    """Assignment-compatible path; same behavior as POST /api/auth/login."""
    return perform_login(body, db)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
