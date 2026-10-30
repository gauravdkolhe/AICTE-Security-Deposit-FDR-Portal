from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal
import uuid, os, json

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.config import get_settings
from app.models.user import User, UserRole
from app.models.institution import Institution, InstitutionStatus
from app.models.fdr import FDR, FDRDocument, FDRStatus, DepositType
from app.models.verification import VerificationCase, VerificationStatus
from app.models.audit import ValidationIssue, LifecycleEvent, IssueSeverity, IssueStatus
from app.services.audit_service import log_action, send_notification, notify_role_users

settings = get_settings()
router = APIRouter(prefix="/fdrs", tags=["FDR Management"])


def generate_fdr_record_id(db: Session) -> str:
    count = db.query(FDR).count()
    return f"FDR{datetime.utcnow().year}{str(count + 1).zfill(6)}"


def generate_case_number(db: Session) -> str:
    count = db.query(VerificationCase).count()
    return f"VC{datetime.utcnow().year}{str(count + 1).zfill(5)}"


def detect_duplicates(db: Session, institution_id: str, fdr_number: str, issuing_bank: str, exclude_id: str = None) -> list:
    query = db.query(FDR).filter(
        FDR.institution_id == institution_id,
        FDR.fdr_number == fdr_number,
        FDR.issuing_bank.ilike(f"%{issuing_bank.split()[0]}%"),
    )
    if exclude_id:
        query = query.filter(FDR.id != exclude_id)
    return query.all()


def run_validation(fdr: FDR, db: Session) -> list:
    issues = []
    today = date.today()

    if fdr.maturity_date <= fdr.issue_date:
        issues.append({"type": "INVALID_DATE_SEQUENCE", "severity": IssueSeverity.CRITICAL,
                       "field": "maturity_date", "description": "Maturity date must be after issue date.",
                       "recommendation": "Correct the maturity or issue date."})

    if fdr.issue_date > today:
        issues.append({"type": "FUTURE_ISSUE_DATE", "severity": IssueSeverity.HIGH,
                       "field": "issue_date", "description": "Issue date is in the future.",
                       "recommendation": "Verify the issue date."})

    if fdr.maturity_date < today:
        issues.append({"type": "PAST_MATURITY", "severity": IssueSeverity.MEDIUM,
                       "field": "maturity_date", "description": "FDR has already matured.",
                       "recommendation": "Submit renewal or replacement request."})

    if fdr.deposit_amount <= 0:
        issues.append({"type": "INVALID_AMOUNT", "severity": IssueSeverity.CRITICAL,
                       "field": "deposit_amount", "description": "Deposit amount must be positive.",
                       "recommendation": "Correct the deposit amount."})

    if not fdr.ifsc_code and fdr.issuing_bank:
        issues.append({"type": "MISSING_IFSC", "severity": IssueSeverity.LOW,
                       "field": "ifsc_code", "description": "IFSC code is missing.",
                       "recommendation": "Provide the bank branch IFSC code."})

    duplicates = detect_duplicates(db, fdr.institution_id, fdr.fdr_number, fdr.issuing_bank, exclude_id=fdr.id)
    if duplicates:
        issues.append({"type": "POSSIBLE_DUPLICATE", "severity": IssueSeverity.HIGH,
                       "field": "fdr_number",
                       "description": f"Possible duplicate FDR found: {', '.join(d.fdr_record_id for d in duplicates)}",
                       "recommendation": "Review possible duplicate records before proceeding."})

    return issues


def fdr_to_dict(fdr: FDR, include_details: bool = False) -> dict:
    d = {
        "id": fdr.id,
        "fdr_record_id": fdr.fdr_record_id,
        "institution_id": fdr.institution_id,
        "institution_name": fdr.institution.name if fdr.institution else None,
        "fdr_number": fdr.fdr_number,
        "deposit_reference_number": fdr.deposit_reference_number,
        "approval_reference": fdr.approval_reference,
        "deposit_amount": float(fdr.deposit_amount) if fdr.deposit_amount else None,
        "currency": fdr.currency,
        "issuing_bank": fdr.issuing_bank,
        "bank_branch": fdr.bank_branch,
        "ifsc_code": fdr.ifsc_code,
        "issue_date": str(fdr.issue_date) if fdr.issue_date else None,
        "maturity_date": str(fdr.maturity_date) if fdr.maturity_date else None,
        "deposit_type": fdr.deposit_type,
        "interest_rate": float(fdr.interest_rate) if fdr.interest_rate else None,
        "auto_renewal": fdr.auto_renewal,
        "status": fdr.status,
        "submission_date": fdr.submission_date,
        "created_at": fdr.created_at,
        "updated_at": fdr.updated_at,
        "is_demo": fdr.is_demo,
        "parent_fdr_id": fdr.parent_fdr_id,
        "notes": fdr.notes,
    }
    if include_details:
        d["documents"] = [{"id": doc.id, "document_type": doc.document_type,
                           "original_filename": doc.original_filename,
                           "uploaded_at": doc.uploaded_at, "file_size": doc.file_size} for doc in fdr.documents]
        d["lifecycle_events"] = [{"id": e.id, "event_type": e.event_type, "previous_status": e.previous_status,
                                   "new_status": e.new_status, "notes": e.notes, "created_at": e.created_at} for e in fdr.lifecycle_events]
        d["validation_issues"] = [{"id": vi.id, "issue_type": vi.issue_type, "severity": vi.severity,
                                    "affected_field": vi.affected_field, "description": vi.description,
                                    "status": vi.status, "recommendation": vi.recommendation} for vi in fdr.validation_issues]
        open_cases = [vc for vc in fdr.verification_cases if vc.status != VerificationStatus.REJECTED]
        d["verification_status"] = open_cases[-1].status if open_cases else None
    return d


@router.get("")
def list_fdrs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    institution_id: Optional[str] = None,
    bank: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(FDR).options(joinedload(FDR.institution))

    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(FDR.institution_id == current_user.institution_id)
    elif institution_id:
        query = query.filter(FDR.institution_id == institution_id)

    if search:
        query = query.filter(
            or_(
                FDR.fdr_record_id.ilike(f"%{search}%"),
                FDR.fdr_number.ilike(f"%{search}%"),
                FDR.issuing_bank.ilike(f"%{search}%"),
            )
        )
    if status:
        query = query.filter(FDR.status == status)
    if bank:
        query = query.filter(FDR.issuing_bank.ilike(f"%{bank}%"))
    if date_from:
        query = query.filter(FDR.issue_date >= date_from)
    if date_to:
        query = query.filter(FDR.maturity_date <= date_to)

    total = query.count()
    items = query.order_by(FDR.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "items": [fdr_to_dict(f) for f in items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.post("")
def create_fdr(
    institution_id: str = Form(...),
    fdr_number: str = Form(...),
    deposit_reference_number: Optional[str] = Form(None),
    approval_reference: Optional[str] = Form(None),
    deposit_amount: float = Form(...),
    currency: str = Form("INR"),
    issuing_bank: str = Form(...),
    bank_branch: str = Form(...),
    ifsc_code: Optional[str] = Form(None),
    issue_date: str = Form(...),
    maturity_date: str = Form(...),
    deposit_type: str = Form(DepositType.FIXED_DEPOSIT),
    interest_rate: Optional[float] = Form(None),
    auto_renewal: bool = Form(False),
    notes: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Authorization check
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        if current_user.institution_id != institution_id:
            raise HTTPException(status_code=403, detail="Access denied")
        # Ensure institution is active
        inst = db.query(Institution).filter(Institution.id == institution_id, Institution.status == InstitutionStatus.ACTIVE).first()
        if not inst:
            raise HTTPException(status_code=400, detail="Institution must be active to submit FDRs")

    try:
        issue = date.fromisoformat(issue_date)
        maturity = date.fromisoformat(maturity_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    if maturity <= issue:
        raise HTTPException(status_code=400, detail="Maturity date must be after issue date")

    fdr = FDR(
        id=str(uuid.uuid4()),
        fdr_record_id=generate_fdr_record_id(db),
        institution_id=institution_id,
        fdr_number=fdr_number,
        deposit_reference_number=deposit_reference_number,
        approval_reference=approval_reference,
        deposit_amount=Decimal(str(deposit_amount)),
        currency=currency,
        issuing_bank=issuing_bank,
        bank_branch=bank_branch,
        ifsc_code=ifsc_code,
        issue_date=issue,
        maturity_date=maturity,
        deposit_type=deposit_type,
        interest_rate=Decimal(str(interest_rate)) if interest_rate else None,
        auto_renewal=auto_renewal,
        status=FDRStatus.DRAFT,
        submitted_by=current_user.id,
        notes=notes,
    )
    db.add(fdr)
    db.flush()

    # Run validation
    issues = run_validation(fdr, db)
    for issue in issues:
        vi = ValidationIssue(
            fdr_id=fdr.id,
            issue_type=issue["type"],
            severity=issue["severity"],
            affected_field=issue["field"],
            description=issue["description"],
            recommendation=issue["recommendation"],
            status=IssueStatus.OPEN,
        )
        db.add(vi)

    # Lifecycle event
    le = LifecycleEvent(fdr_id=fdr.id, event_type="FDR_CREATED", new_status=FDRStatus.DRAFT, performed_by=current_user.id)
    db.add(le)
    log_action(db, current_user, "FDR_CREATED", "fdr", fdr.id, module="fdrs")
    db.commit()
    db.refresh(fdr)
    return fdr_to_dict(fdr)


@router.get("/{fdr_id}")
def get_fdr(
    fdr_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fdr = db.query(FDR).options(
        joinedload(FDR.institution),
        joinedload(FDR.documents),
        joinedload(FDR.lifecycle_events),
        joinedload(FDR.validation_issues),
        joinedload(FDR.verification_cases),
    ).filter(FDR.id == fdr_id).first()

    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and fdr.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return fdr_to_dict(fdr, include_details=True)


@router.post("/{fdr_id}/submit")
def submit_fdr(
    fdr_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fdr = db.query(FDR).options(joinedload(FDR.institution)).filter(FDR.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and fdr.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if fdr.status not in [FDRStatus.DRAFT, FDRStatus.CORRECTION_REQUIRED]:
        raise HTTPException(status_code=400, detail="Cannot submit FDR in current status")

    # Re-run validation
    db.query(ValidationIssue).filter(ValidationIssue.fdr_id == fdr_id, ValidationIssue.status == IssueStatus.OPEN).delete()
    issues = run_validation(fdr, db)
    critical = [i for i in issues if i["severity"] == IssueSeverity.CRITICAL]
    for issue in issues:
        vi = ValidationIssue(fdr_id=fdr.id, issue_type=issue["type"], severity=issue["severity"],
                             affected_field=issue["field"], description=issue["description"],
                             recommendation=issue["recommendation"], status=IssueStatus.OPEN)
        db.add(vi)

    if critical:
        db.commit()
        raise HTTPException(status_code=400, detail={
            "message": "Submission blocked due to critical validation errors",
            "issues": [{"type": i["type"], "field": i["field"], "description": i["description"]} for i in critical]
        })

    old_status = fdr.status
    fdr.status = FDRStatus.PENDING_VERIFICATION
    fdr.submission_date = datetime.utcnow()

    # Create verification case
    vc = VerificationCase(
        id=str(uuid.uuid4()),
        case_number=generate_case_number(db),
        fdr_id=fdr.id,
        institution_id=fdr.institution_id,
        status=VerificationStatus.PENDING,
    )
    db.add(vc)

    le = LifecycleEvent(fdr_id=fdr.id, event_type="FDR_SUBMITTED", previous_status=old_status,
                        new_status=FDRStatus.PENDING_VERIFICATION, performed_by=current_user.id)
    db.add(le)
    log_action(db, current_user, "FDR_SUBMITTED", "fdr", fdr_id, module="fdrs")

    notify_role_users(db, UserRole.AICTE_OFFICER, "verification_pending",
                      f"FDR Submitted for Verification: {fdr.fdr_record_id}",
                      f"FDR {fdr.fdr_record_id} from {fdr.institution.name} submitted for verification.",
                      "fdr", fdr_id)
    db.commit()
    return {"message": "FDR submitted for verification", "status": fdr.status, "warnings": len(issues) - len(critical)}


@router.post("/{fdr_id}/documents")
async def upload_fdr_document(
    fdr_id: str,
    document_type: str = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fdr = db.query(FDR).filter(FDR.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and fdr.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    allowed_types = {"application/pdf", "image/jpeg", "image/png",
                     "application/msword",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "fdrs", fdr_id)
    os.makedirs(upload_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(upload_dir, stored_name)

    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail=f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB")

    with open(file_path, "wb") as f:
        f.write(content)

    doc = FDRDocument(
        fdr_id=fdr_id, document_type=document_type,
        original_filename=file.filename, stored_filename=stored_name,
        file_path=file_path, file_size=f"{len(content) // 1024}KB",
        mime_type=file.content_type, uploaded_by=current_user.id, notes=notes,
    )
    db.add(doc)
    log_action(db, current_user, "FDR_DOCUMENT_UPLOADED", "fdr_document", doc.id, module="fdrs")
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "document_type": doc.document_type, "original_filename": doc.original_filename,
            "uploaded_at": doc.uploaded_at, "file_size": doc.file_size}


@router.get("/{fdr_id}/validate")
def validate_fdr(
    fdr_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fdr = db.query(FDR).filter(FDR.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and fdr.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    issues = run_validation(fdr, db)
    return {"fdr_id": fdr_id, "issues": issues, "is_valid": not any(i["severity"] == IssueSeverity.CRITICAL for i in issues)}
