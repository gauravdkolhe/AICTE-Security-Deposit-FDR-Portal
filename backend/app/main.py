from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import get_settings
from app.core.database import Base, engine
from app.api.auth import router as auth_router
from app.api.institutions import router as institutions_router
from app.api.fdrs import router as fdrs_router
from app.api.verification import router as verification_router
from app.api.lifecycle import router as lifecycle_router
from app.api.dashboard import router as dashboard_router, reports_router
from app.api.admin import router as users_router, notifications_router, settings_router
import os

settings = get_settings()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CredNex - Centralized Security Deposit / FDR Management Portal",
    description="""
    ## CredNex - Centralized Security Deposit / FDR Management Portal
    
    A comprehensive digital platform for AICTE Regulation Bureau to manage the complete lifecycle 
    of security deposits and Fixed Deposit Receipts (FDRs).
    
    ### Roles
    - **System Administrator**: Full access
    - **AICTE Officer**: Review, verify, approve/reject FDRs
    - **Bank Officer**: Verification queue
    - **Institution Admin**: Submit and track their FDRs
    
    ### Development Demo Credentials
    - Admin: `admin@aicte.gov.in` / `Admin@12345`
    - Officer: `officer@aicte.gov.in` / `Officer@12345`
    - Bank: `bank@example.com` / `Bank@12345`
    - Institution: `inst@demo.edu.in` / `Inst@12345`
    """,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
]
if os.getenv("ADDITIONAL_ORIGINS"):
    origins.extend([o.strip() for o in os.getenv("ADDITIONAL_ORIGINS").split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount upload directory for secure document serving (requires auth - handled by API)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(institutions_router, prefix="/api")
app.include_router(fdrs_router, prefix="/api")
app.include_router(verification_router, prefix="/api")
app.include_router(lifecycle_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.on_event("startup")
def auto_seed_if_empty():
    try:
        from app.models.user import User
        from app.core.database import SessionLocal
        db = SessionLocal()
        if db.query(User).count() == 0:
            import seed
            seed.seed_all()
        db.close()
    except Exception as e:
        print(f"Database auto-seed check: {e}")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "CredNex Portal", "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": "CredNex API. Visit /api/docs for documentation."}
