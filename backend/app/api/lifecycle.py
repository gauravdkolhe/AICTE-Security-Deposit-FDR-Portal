from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, date, timedelta
from typing import Optional
from pydantic import BaseModel
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.fdr import FDR, FDRStatus
from app.models.institution import Institution
from app.models.lifecycle import (
    RenewalRequest, RenewalStatus,
    ReplacementRequest, ReplacementStatus,
    ReleaseRefundRequest, ReleaseRefundStatus,
)
from app.models.audit import LifecycleEvent
from app.services.audit_service import log_action, send_notification, notify_role_users

router = APIRouter(prefix="/lifecycle", tags=["Lifecycle Management"])


class RenewalCreatePayload(BaseModel):
    fdr_id: str
    new_maturity_date: Optional[str] = None
    new_amount: Optional[float] = None
    renewal_reason: Optional[str] = None


class ReplacementCreatePayload(BaseModel):
    original_fdr_id: str
    replacement_reason: str


class ReviewPayload(BaseModel):
    action: str  # approve, reject
    notes: str


class ReleaseRefundCreatePayload(BaseModel):
    fdr_id: str
    request_type: str  # release or refund
    reason: str


class ReleaseRefundDecisionPayload(BaseModel):
    action: str  # approve, reject, defer, request_info
    notes: str
    processing_reference: Optional[str] = None


# ==================== RENEWAL ====================

@router.get("/maturity/upcoming")
def upcoming_maturities(
    days: int = Query(90, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    cutoff = date.today() + timedelta(days=days)
    fdrs = db.query(FDR).options(joinedload(FDR.institution)).filter(
        FDR.maturity_date <= cutoff,
        FDR.maturity_date >= date.today(),
        FDR.status.in_([FDRStatus.ACTIVE, FDRStatus.VERIFIED, FDRStatus.MANUALLY_REVIEWED]),
    ).order_by(FDR.maturity_date).all()
    return [{"id": f.id, "fdr_record_id": f.fdr_record_id, "institution_name": f.institution.name if f.institution else None,
             "issuing_bank": f.issuing_bank, "deposit_amount": float(f.deposit_amount) if f.deposit_amount else None,
             "maturity_date": str(f.maturity_date), "days_to_maturity": (f.maturity_date - date.today()).days,
             "status": f.status} for f in fdrs]


@router.get("/maturity/overdue")
def overdue_fdrs(
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    fdrs = db.query(FDR).options(joinedload(FDR.institution)).filter(
        FDR.maturity_date < date.today(),
        FDR.status.in_([FDRStatus.ACTIVE, FDRStatus.VERIFIED, FDRStatus.MANUALLY_REVIEWED, FDRStatus.MATURED]),
    ).order_by(FDR.maturity_date).all()
    return [{"id": f.id, "fdr_record_id": f.fdr_record_id, "institution_name": f.institution.name if f.institution else None,
             "maturity_date": str(f.maturity_date), "days_overdue": (date.today() - f.maturity_date).days,
             "status": f.status} for f in fdrs]


@router.post("/renewals")
def create_renewal(
    payload: RenewalCreatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fdr = db.query(FDR).filter(FDR.id == payload.fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and fdr.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    count = db.query(RenewalRequest).count()
    req = RenewalRequest(
        id=str(uuid.uuid4()),
        request_number=f"REN{datetime.utcnow().year}{str(count + 1).zfill(5)}",
        fdr_id=payload.fdr_id,
        institution_id=fdr.institution_id,
        new_maturity_date=date.fromisoformat(payload.new_maturity_date) if payload.new_maturity_date else None,
        new_amount=Decimal(str(payload.new_amount)) if payload.new_amount else None,
        renewal_reason=payload.renewal_reason,
        status=RenewalStatus.SUBMITTED,
        submitted_by=current_user.id,
        submitted_at=datetime.utcnow(),
    )
    db.add(req)
    fdr.status = FDRStatus.RENEWAL_SUBMITTED
    le = LifecycleEvent(fdr_id=fdr.id, event_type="RENEWAL_SUBMITTED", performed_by=current_user.id)
    db.add(le)
    log_action(db, current_user, "RENEWAL_CREATED", "renewal_request", req.id, module="lifecycle")
    notify_role_users(db, UserRole.AICTE_OFFICER, "renewal_required",
                      f"Renewal Request: {req.request_number}",
                      f"Renewal submitted for FDR {fdr.fdr_record_id}",
                      "renewal_request", req.id)
    db.commit()
    db.refresh(req)
    return {"id": req.id, "request_number": req.request_number, "status": req.status}


@router.get("/renewals")
def list_renewals(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(RenewalRequest).options(
        joinedload(RenewalRequest.fdr).joinedload(FDR.institution),
    )
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(RenewalRequest.institution_id == current_user.institution_id)
    if status:
        query = query.filter(RenewalRequest.status == status)
    total = query.count()
    items = query.order_by(RenewalRequest.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [{"id": r.id, "request_number": r.request_number, "fdr_id": r.fdr_id,
                       "institution_name": r.fdr.institution.name if r.fdr and r.fdr.institution else None,
                       "fdr_record_id": r.fdr.fdr_record_id if r.fdr else None,
                       "new_maturity_date": str(r.new_maturity_date) if r.new_maturity_date else None,
                       "status": r.status, "submitted_at": r.submitted_at, "renewal_reason": r.renewal_reason} for r in items],
            "total": total, "page": page, "per_page": per_page}


@router.post("/renewals/{req_id}/review")
def review_renewal(
    req_id: str,
    payload: ReviewPayload,
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    req = db.query(RenewalRequest).options(joinedload(RenewalRequest.fdr)).filter(RenewalRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Not found")

    if payload.action == "approve":
        req.status = RenewalStatus.APPROVED
        req.fdr.status = FDRStatus.RENEWED
        if req.new_maturity_date:
            req.fdr.maturity_date = req.new_maturity_date
    elif payload.action == "reject":
        req.status = RenewalStatus.REJECTED
        req.fdr.status = FDRStatus.ACTIVE
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    req.reviewed_by = current_user.id
    req.review_notes = payload.notes
    req.reviewed_at = datetime.utcnow()
    le = LifecycleEvent(fdr_id=req.fdr_id, event_type=f"RENEWAL_{payload.action.upper()}", performed_by=current_user.id, notes=payload.notes)
    db.add(le)
    log_action(db, current_user, f"RENEWAL_{payload.action.upper()}", "renewal_request", req_id, module="lifecycle")

    inst_users = db.query(User).filter(User.institution_id == req.institution_id).all()
    for u in inst_users:
        send_notification(db, u.id, "renewal_decision", f"Renewal Request {payload.action.title()}: {req.request_number}",
                          payload.notes, "renewal_request", req_id)
    db.commit()
    return {"message": f"Renewal {payload.action}", "status": req.status}


# ==================== REPLACEMENT ====================

@router.post("/replacements")
def create_replacement(
    payload: ReplacementCreatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fdr = db.query(FDR).filter(FDR.id == payload.original_fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and fdr.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    count = db.query(ReplacementRequest).count()
    req = ReplacementRequest(
        id=str(uuid.uuid4()),
        request_number=f"REP{datetime.utcnow().year}{str(count + 1).zfill(5)}",
        original_fdr_id=payload.original_fdr_id,
        institution_id=fdr.institution_id,
        replacement_reason=payload.replacement_reason,
        status=ReplacementStatus.SUBMITTED,
        submitted_by=current_user.id,
        submitted_at=datetime.utcnow(),
    )
    db.add(req)
    fdr.status = FDRStatus.REPLACEMENT_PENDING
    le = LifecycleEvent(fdr_id=fdr.id, event_type="REPLACEMENT_REQUESTED", performed_by=current_user.id, notes=payload.replacement_reason)
    db.add(le)
    log_action(db, current_user, "REPLACEMENT_CREATED", "replacement_request", req.id, module="lifecycle")
    notify_role_users(db, UserRole.AICTE_OFFICER, "replacement_pending",
                      f"Replacement Request: {req.request_number}",
                      f"Replacement requested for FDR {fdr.fdr_record_id}",
                      "replacement_request", req.id)
    db.commit()
    db.refresh(req)
    return {"id": req.id, "request_number": req.request_number, "status": req.status}


@router.get("/replacements")
def list_replacements(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(ReplacementRequest).options(
        joinedload(ReplacementRequest.original_fdr).joinedload(FDR.institution),
    )
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(ReplacementRequest.institution_id == current_user.institution_id)
    if status:
        query = query.filter(ReplacementRequest.status == status)
    total = query.count()
    items = query.order_by(ReplacementRequest.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [{"id": r.id, "request_number": r.request_number,
                       "original_fdr_record_id": r.original_fdr.fdr_record_id if r.original_fdr else None,
                       "institution_name": r.original_fdr.institution.name if r.original_fdr and r.original_fdr.institution else None,
                       "replacement_reason": r.replacement_reason, "status": r.status,
                       "submitted_at": r.submitted_at} for r in items],
            "total": total, "page": page, "per_page": per_page}


@router.post("/replacements/{req_id}/review")
def review_replacement(
    req_id: str,
    payload: ReviewPayload,
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    req = db.query(ReplacementRequest).options(
        joinedload(ReplacementRequest.original_fdr)
    ).filter(ReplacementRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Not found")

    if payload.action == "approve":
        req.status = ReplacementStatus.APPROVED
        req.original_fdr.status = FDRStatus.REPLACED
    elif payload.action == "reject":
        req.status = ReplacementStatus.REJECTED
        req.original_fdr.status = FDRStatus.ACTIVE
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    req.reviewed_by = current_user.id
    req.review_notes = payload.notes
    req.reviewed_at = datetime.utcnow()
    le = LifecycleEvent(fdr_id=req.original_fdr_id, event_type=f"REPLACEMENT_{payload.action.upper()}",
                        performed_by=current_user.id, notes=payload.notes)
    db.add(le)
    log_action(db, current_user, f"REPLACEMENT_{payload.action.upper()}", "replacement_request", req_id, module="lifecycle")

    inst_users = db.query(User).filter(User.institution_id == req.institution_id).all()
    for u in inst_users:
        send_notification(db, u.id, "replacement_decision", f"Replacement {payload.action.title()}: {req.request_number}",
                          payload.notes, "replacement_request", req_id)
    db.commit()
    return {"message": f"Replacement {payload.action}", "status": req.status}


# ==================== RELEASE / REFUND ====================

@router.post("/release-refund")
def create_release_refund(
    payload: ReleaseRefundCreatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fdr = db.query(FDR).filter(FDR.id == payload.fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and fdr.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    count = db.query(ReleaseRefundRequest).count()
    req = ReleaseRefundRequest(
        id=str(uuid.uuid4()),
        request_number=f"RLR{datetime.utcnow().year}{str(count + 1).zfill(5)}",
        fdr_id=payload.fdr_id,
        institution_id=fdr.institution_id,
        request_type=payload.request_type,
        reason=payload.reason,
        status=ReleaseRefundStatus.SUBMITTED,
        submitted_by=current_user.id,
        submitted_at=datetime.utcnow(),
    )
    db.add(req)
    fdr.status = FDRStatus.RELEASE_REQUESTED
    le = LifecycleEvent(fdr_id=fdr.id, event_type="RELEASE_REFUND_REQUESTED", performed_by=current_user.id, notes=payload.reason)
    db.add(le)
    log_action(db, current_user, "RELEASE_REFUND_CREATED", "release_refund_request", req.id, module="lifecycle")
    notify_role_users(db, UserRole.AICTE_OFFICER, "release_refund_pending",
                      f"Release/Refund Request: {req.request_number}",
                      f"{payload.request_type.title()} requested for FDR {fdr.fdr_record_id}",
                      "release_refund_request", req.id)
    db.commit()
    db.refresh(req)
    return {"id": req.id, "request_number": req.request_number, "status": req.status}


@router.get("/release-refund")
def list_release_refund(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(ReleaseRefundRequest).options(
        joinedload(ReleaseRefundRequest.fdr).joinedload(FDR.institution),
    )
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        query = query.filter(ReleaseRefundRequest.institution_id == current_user.institution_id)
    if status:
        query = query.filter(ReleaseRefundRequest.status == status)
    total = query.count()
    items = query.order_by(ReleaseRefundRequest.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [{"id": r.id, "request_number": r.request_number, "fdr_id": r.fdr_id,
                       "fdr_record_id": r.fdr.fdr_record_id if r.fdr else None,
                       "institution_name": r.fdr.institution.name if r.fdr and r.fdr.institution else None,
                       "request_type": r.request_type, "reason": r.reason, "status": r.status,
                       "submitted_at": r.submitted_at, "approved_at": r.approved_at,
                       "completed_at": r.completed_at} for r in items],
            "total": total, "page": page, "per_page": per_page}


@router.get("/release-refund/{req_id}")
def get_release_refund(
    req_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.query(ReleaseRefundRequest).options(
        joinedload(ReleaseRefundRequest.fdr).joinedload(FDR.institution)
    ).filter(ReleaseRefundRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and req.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return {"id": req.id, "request_number": req.request_number, "fdr_id": req.fdr_id,
            "request_type": req.request_type, "reason": req.reason,
            "status": req.status, "eligibility_findings": req.eligibility_findings,
            "verification_findings": req.verification_findings, "review_notes": req.review_notes,
            "approval_notes": req.approval_notes, "rejection_reason": req.rejection_reason,
            "processing_reference": req.processing_reference,
            "submitted_at": req.submitted_at, "reviewed_at": req.reviewed_at,
            "approved_at": req.approved_at, "completed_at": req.completed_at,
            "fdr": {"fdr_record_id": req.fdr.fdr_record_id, "institution_name": req.fdr.institution.name if req.fdr and req.fdr.institution else None,
                    "deposit_amount": float(req.fdr.deposit_amount) if req.fdr and req.fdr.deposit_amount else None} if req.fdr else None}


@router.post("/release-refund/{req_id}/decision")
def release_refund_decision(
    req_id: str,
    payload: ReleaseRefundDecisionPayload,
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    req = db.query(ReleaseRefundRequest).options(
        joinedload(ReleaseRefundRequest.fdr)
    ).filter(ReleaseRefundRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Not found")
    if req.institution_id == (current_user.institution_id or ""):
        raise HTTPException(status_code=403, detail="Cannot approve own institution's request")

    action_map = {
        "approve": (ReleaseRefundStatus.APPROVED, FDRStatus.RELEASED),
        "reject": (ReleaseRefundStatus.REJECTED, None),
        "defer": (ReleaseRefundStatus.DEFERRED, None),
        "request_info": (ReleaseRefundStatus.INFORMATION_REQUIRED, None),
    }
    if payload.action not in action_map:
        raise HTTPException(status_code=400, detail="Invalid action")

    new_req_status, new_fdr_status = action_map[payload.action]
    req.status = new_req_status
    req.reviewed_by = current_user.id
    req.review_notes = payload.notes
    req.reviewed_at = datetime.utcnow()
    if payload.action == "approve":
        req.approved_by = current_user.id
        req.approved_at = datetime.utcnow()
        req.approval_notes = payload.notes
        req.processing_reference = payload.processing_reference
        req.fdr.status = FDRStatus.RELEASED

    le = LifecycleEvent(fdr_id=req.fdr_id, event_type=f"RELEASE_REFUND_{payload.action.upper()}",
                        performed_by=current_user.id, notes=payload.notes)
    db.add(le)
    log_action(db, current_user, f"RELEASE_REFUND_{payload.action.upper()}", "release_refund_request", req_id,
               reason=payload.notes, module="lifecycle")

    inst_users = db.query(User).filter(User.institution_id == req.institution_id).all()
    for u in inst_users:
        send_notification(db, u.id, "release_refund_status",
                          f"Release/Refund Request {payload.action.title()}: {req.request_number}",
                          payload.notes, "release_refund_request", req_id)
    db.commit()
    return {"message": f"Request {payload.action}", "status": req.status}
