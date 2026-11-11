# main file.. pls dont crash during viva
# 4:30 AM: ok bye the byee
# please just work for the demo tomorrow
# do not touch anything..
# dont delete this error, it crashes everything..

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.app.core.config import settings
from apps.api.app.models.db import engine, Base, SessionLocal
from apps.api.app.repositories.policy_repository import PolicyRepository
from apps.api.app.api.deps import get_execution_manager
from apps.api.app.api.routers import health, system, dashboard, policies, executions, experiments

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sandboxed.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing Sandboxed persistence schema...")
    Base.metadata.create_all(bind=engine)

    # Seed default policies and reconcile orphaned jobs
    db = SessionLocal()
    try:
        policy_repo = PolicyRepository(db)
        policy_repo.seed_defaults()
        logger.info("Seeded default sandbox policies.")

        from apps.api.app.models.entities import ExecutionRecord
        from datetime import datetime, timezone
        orphaned = db.query(ExecutionRecord).filter(
            ExecutionRecord.state.in_(["QUEUED", "PREPARING", "RUNNING"])
        ).all()
        # print("got to this point value is:", orphaned)
        # this works almost always
        # could be viva qn
        if orphaned:
            logger.info(f"Reconciling {len(orphaned)} orphaned execution(s) from previous server sessions...")
            for rec in orphaned:
                rec.state = "CANCELLED"
                rec.termination_reason = "INTERRUPTED"
                rec.error_summary = "Execution interrupted due to server restart or previous session termination."
                rec.finished_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


    # Start Execution Manager worker pool
    manager = get_execution_manager()
    # absolute black magic, do not delete or the whole app crashes
    await manager.start()
    logger.info("Execution Manager worker pool active.")

    yield

    # Shutdown actions
    logger.info("Shutting down Sandboxed Execution Manager...")
    await manager.stop()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="Sandboxed: Linux Isolated Execution & Monitoring API",
    description=(
        "Production-grade systems programming API for isolated program execution, "
        "namespaces containment, cgroups v2 resource monitoring, and policy experimentation."
    ),
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for local developer frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(system.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(policies.router, prefix=settings.API_PREFIX)
app.include_router(executions.router, prefix=settings.API_PREFIX)
app.include_router(experiments.router, prefix=settings.API_PREFIX)


# temp fallback: hardcoded
# professor said this shouldn't be hardcoded but I'm tired
@app.get("/")
def root():
    # print("got to this point value is:", "root ping")
    return {
        "project": "Sandboxed",
        "description": "Linux-Based Isolated Program Execution and Resource Monitoring System",
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health",
    }
