from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import Optional
import csv, io

from fastapi.responses import StreamingResponse

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.fdr import FDR, FDRStatus
from app.models.institution import Institution, InstitutionStatus
from app.models.verification import VerificationCase, VerificationStatus
from app.models.lifecycle import RenewalRequest, ReplacementRequest, ReleaseRefundRequest
from app.models.audit import AuditLog, ValidationIssue, Notification
from app.services.audit_service import log_action

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Reports"])


@router.get("/summary")
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    base_fdr = db.query(FDR)
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        base_fdr = base_fdr.filter(FDR.institution_id == current_user.institution_id)

    total_institutions = db.query(Institution).filter(Institution.status == InstitutionStatus.ACTIVE).count()
    total_fdrs = base_fdr.count()
    active_fdrs = base_fdr.filter(FDR.status.in_([FDRStatus.ACTIVE, FDRStatus.VERIFIED, FDRStatus.MANUALLY_REVIEWED])).count()
    pending_verification = base_fdr.filter(FDR.status == FDRStatus.PENDING_VERIFICATION).count()
    approaching_maturity = base_fdr.filter(
        FDR.maturity_date.between(today, today + timedelta(days=90)),
        FDR.status.in_([FDRStatus.ACTIVE, FDRStatus.VERIFIED, FDRStatus.MANUALLY_REVIEWED])
    ).count()
    past_maturity = base_fdr.filter(
        FDR.maturity_date < today,
        FDR.status.in_([FDRStatus.ACTIVE, FDRStatus.VERIFIED, FDRStatus.MANUALLY_REVIEWED, FDRStatus.MATURED])
    ).count()
    renewal_pending = base_fdr.filter(FDR.status.in_([FDRStatus.RENEWAL_PENDING, FDRStatus.RENEWAL_SUBMITTED])).count()
    replacement_pending = base_fdr.filter(FDR.status == FDRStatus.REPLACEMENT_PENDING).count()
    release_pending = db.query(ReleaseRefundRequest).filter(
        ReleaseRefundRequest.status.in_(["submitted", "under_review", "awaiting_approval"])
    ).count()
    discrepancies = db.query(ValidationIssue).filter(ValidationIssue.status == "open").count()

    return {
        "total_institutions": total_institutions,
        "total_fdrs": total_fdrs,
        "active_fdrs": active_fdrs,
        "pending_verification": pending_verification,
        "approaching_maturity": approaching_maturity,
        "past_maturity": past_maturity,
        "renewal_pending": renewal_pending,
        "replacement_pending": replacement_pending,
        "release_pending": release_pending,
        "open_discrepancies": discrepancies,
        "cases_requiring_attention": pending_verification + past_maturity + discrepancies,
    }


@router.get("/fdr-status-distribution")
def fdr_status_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(FDR.status, func.count(FDR.id).label("count")).group_by(FDR.status)
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(FDR.institution_id == current_user.institution_id)
    rows = query.all()
    return [{"status": r.status, "count": r.count} for r in rows]


@router.get("/institution-fdr-distribution")
def institution_fdr_distribution(
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.BANK_OFFICER)),
    db: Session = Depends(get_db),
):
    rows = db.query(Institution.name, func.count(FDR.id).label("fdr_count")).join(
        FDR, FDR.institution_id == Institution.id, isouter=True
    ).group_by(Institution.name).order_by(func.count(FDR.id).desc()).limit(10).all()
    return [{"institution": r.name, "fdr_count": r.fdr_count} for r in rows]


@router.get("/maturity-timeline")
def maturity_timeline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    brackets = [
        ("0-30 days", today, today + timedelta(days=30)),
        ("31-60 days", today + timedelta(days=31), today + timedelta(days=60)),
        ("61-90 days", today + timedelta(days=61), today + timedelta(days=90)),
    ]
    result = []
    for label, start, end in brackets:
        query = db.query(func.count(FDR.id)).filter(
            FDR.maturity_date.between(start, end),
            FDR.status.in_([FDRStatus.ACTIVE, FDRStatus.VERIFIED, FDRStatus.MANUALLY_REVIEWED])
        )
        if current_user.role == UserRole.INSTITUTION_ADMIN:
            query = query.filter(FDR.institution_id == current_user.institution_id)
        result.append({"range": label, "count": query.scalar() or 0})
    return result


@router.get("/verification-queue-status")
def verification_queue_status(
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.BANK_OFFICER)),
    db: Session = Depends(get_db),
):
    rows = db.query(VerificationCase.status, func.count(VerificationCase.id).label("count")).group_by(VerificationCase.status).all()
    return [{"status": r.status, "count": r.count} for r in rows]


@router.get("/recent-activity")
def recent_activity(
    limit: int = Query(20, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(AuditLog.actor_id == current_user.id)
    logs = query.limit(limit).all()
    return [{"id": l.id, "action": l.action, "entity_type": l.entity_type, "entity_id": l.entity_id,
             "actor_role": l.actor_role, "module": l.module, "created_at": l.created_at} for l in logs]


# ==================== REPORTS ====================

reports_router = APIRouter(prefix="/reports", tags=["Reports"])


@reports_router.get("/institution-wise")
def institution_wise_report(
    state: Optional[str] = None,
    institution_type: Optional[str] = None,
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    query = db.query(Institution)
    if state:
        query = query.filter(Institution.state.ilike(f"%{state}%"))
    if institution_type:
        query = query.filter(Institution.institution_type == institution_type)
    insts = query.all()
    return [{
        "institution_code": i.institution_code, "name": i.name,
        "aicte_permanent_id": i.aicte_permanent_id, "institution_type": i.institution_type,
        "state": i.state, "district": i.district, "status": i.status,
        "fdr_count": len(i.fdrs), "activation_date": i.activation_date,
    } for i in insts]


@reports_router.get("/fdr-status")
def fdr_status_report(
    status: Optional[str] = None,
    institution_id: Optional[str] = None,
    bank: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    from sqlalchemy.orm import joinedload
    query = db.query(FDR).options(joinedload(FDR.institution))
    if status:
        query = query.filter(FDR.status == status)
    if institution_id:
        query = query.filter(FDR.institution_id == institution_id)
    if bank:
        query = query.filter(FDR.issuing_bank.ilike(f"%{bank}%"))
    if date_from:
        query = query.filter(FDR.issue_date >= date_from)
    if date_to:
        query = query.filter(FDR.maturity_date <= date_to)
    fdrs = query.order_by(FDR.created_at.desc()).limit(500).all()
    return [{"fdr_record_id": f.fdr_record_id, "institution_name": f.institution.name if f.institution else None,
             "fdr_number": f.fdr_number, "issuing_bank": f.issuing_bank,
             "deposit_amount": float(f.deposit_amount) if f.deposit_amount else None,
             "issue_date": str(f.issue_date), "maturity_date": str(f.maturity_date), "status": f.status} for f in fdrs]


@reports_router.get("/maturity")
def maturity_report(
    days: int = Query(90, le=365),
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    from sqlalchemy.orm import joinedload
    today = date.today()
    cutoff = today + timedelta(days=days)
    fdrs = db.query(FDR).options(joinedload(FDR.institution)).filter(
        FDR.maturity_date <= cutoff,
        FDR.status.in_([FDRStatus.ACTIVE, FDRStatus.VERIFIED, FDRStatus.MANUALLY_REVIEWED])
    ).order_by(FDR.maturity_date).all()
    return [{"fdr_record_id": f.fdr_record_id, "institution_name": f.institution.name if f.institution else None,
             "deposit_amount": float(f.deposit_amount) if f.deposit_amount else None,
             "maturity_date": str(f.maturity_date),
             "days_to_maturity": (f.maturity_date - today).days, "status": f.status} for f in fdrs]


@reports_router.get("/audit")
def audit_report(
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    module: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, le=200),
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if module:
        query = query.filter(AuditLog.module == module)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [{"id": l.id, "actor_id": l.actor_id, "actor_role": l.actor_role, "action": l.action,
                       "entity_type": l.entity_type, "entity_id": l.entity_id, "module": l.module,
                       "reason": l.reason, "created_at": l.created_at} for l in logs],
            "total": total, "page": page, "per_page": per_page}


@reports_router.get("/export/csv")
def export_csv(
    report_type: str = Query(..., description="fdr_status, maturity, institution_wise"),
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    log_action(db, current_user, "REPORT_EXPORTED", module="reports", new_value=f"type={report_type}")
    db.commit()

    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "fdr_status":
        from sqlalchemy.orm import joinedload
        fdrs = db.query(FDR).options(joinedload(FDR.institution)).limit(500).all()
        writer.writerow(["FDR Record ID", "Institution", "FDR Number", "Bank", "Amount", "Issue Date", "Maturity Date", "Status"])
        for f in fdrs:
            writer.writerow([f.fdr_record_id, f.institution.name if f.institution else "", f.fdr_number,
                             f.issuing_bank, float(f.deposit_amount) if f.deposit_amount else 0,
                             str(f.issue_date), str(f.maturity_date), f.status])
    elif report_type == "institution_wise":
        insts = db.query(Institution).all()
        writer.writerow(["Code", "Name", "AICTE ID", "Type", "State", "Status", "FDR Count"])
        for i in insts:
            writer.writerow([i.institution_code, i.name, i.aicte_permanent_id or "",
                             i.institution_type, i.state, i.status, len(i.fdrs)])

    output.seek(0)
    return StreamingResponse(io.BytesIO(output.read().encode()), media_type="text/csv",
                             headers={"Content-Disposition": f"attachment; filename={report_type}_{date.today()}.csv"})
