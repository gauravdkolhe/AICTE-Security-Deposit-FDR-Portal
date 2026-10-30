from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.fdr import FDR, FDRStatus
from app.models.verification import VerificationCase, VerificationEvidence, VerificationStatus, VerificationMethod
from app.models.audit import LifecycleEvent
from app.services.audit_service import log_action, send_notification

router = APIRouter(prefix="/verification", tags=["Verification"])


class VerificationDecisionPayload(BaseModel):
    status: VerificationStatus
    method: VerificationMethod
    findings: str
    decision_notes: str
    rejection_reason: Optional[str] = None
    verification_reference: Optional[str] = None
    is_simulated: bool = False


class AddEvidencePayload(BaseModel):
    evidence_type: str
    description: str
    reference: Optional[str] = None


def vc_to_dict(vc: VerificationCase) -> dict:
    return {
        "id": vc.id,
        "case_number": vc.case_number,
        "fdr_id": vc.fdr_id,
        "institution_id": vc.institution_id,
        "assigned_to": vc.assigned_to,
        "status": vc.status,
        "method": vc.method,
        "findings": vc.findings,
        "decision_notes": vc.decision_notes,
        "rejection_reason": vc.rejection_reason,
        "verification_reference": vc.verification_reference,
        "verified_at": vc.verified_at,
        "assigned_at": vc.assigned_at,
        "created_at": vc.created_at,
        "updated_at": vc.updated_at,
        "is_simulated": vc.is_simulated,
        "fdr": {
            "fdr_record_id": vc.fdr.fdr_record_id,
            "fdr_number": vc.fdr.fdr_number,
            "institution_name": vc.fdr.institution.name if vc.fdr and vc.fdr.institution else None,
            "issuing_bank": vc.fdr.issuing_bank,
            "deposit_amount": float(vc.fdr.deposit_amount) if vc.fdr and vc.fdr.deposit_amount else None,
            "issue_date": str(vc.fdr.issue_date) if vc.fdr and vc.fdr.issue_date else None,
            "maturity_date": str(vc.fdr.maturity_date) if vc.fdr and vc.fdr.maturity_date else None,
            "status": vc.fdr.status,
        } if vc.fdr else None,
        "evidence": [{"id": e.id, "evidence_type": e.evidence_type, "description": e.description,
                      "reference": e.reference, "added_at": e.added_at} for e in vc.evidence_list] if vc.evidence_list else [],
    }


@router.get("")
def list_verification_queue(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(VerificationCase).options(
        joinedload(VerificationCase.fdr).joinedload(FDR.institution),
        joinedload(VerificationCase.evidence_list),
    )

    if current_user.role == UserRole.BANK_OFFICER:
        query = query.filter(VerificationCase.assigned_to == current_user.id)

    if status:
        query = query.filter(VerificationCase.status == status)
    if assigned_to:
        query = query.filter(VerificationCase.assigned_to == assigned_to)

    total = query.count()
    items = query.order_by(VerificationCase.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "items": [vc_to_dict(vc) for vc in items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/{case_id}")
def get_verification_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    vc = db.query(VerificationCase).options(
        joinedload(VerificationCase.fdr).joinedload(FDR.institution),
        joinedload(VerificationCase.fdr).joinedload(FDR.documents),
        joinedload(VerificationCase.evidence_list),
    ).filter(VerificationCase.id == case_id).first()
    if not vc:
        raise HTTPException(status_code=404, detail="Verification case not found")
    return vc_to_dict(vc)


@router.post("/{case_id}/assign")
def assign_case(
    case_id: str,
    officer_id: str,
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    vc = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not vc:
        raise HTTPException(status_code=404, detail="Case not found")
    officer = db.query(User).filter(User.id == officer_id,
                                    User.role.in_([UserRole.BANK_OFFICER, UserRole.AICTE_OFFICER])).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")

    vc.assigned_to = officer_id
    vc.assigned_at = datetime.utcnow()
    vc.status = VerificationStatus.IN_REVIEW
    log_action(db, current_user, "CASE_ASSIGNED", "verification_case", case_id, module="verification")
    send_notification(db, officer_id, "verification_pending", f"Verification Case Assigned: {vc.case_number}",
                      f"Case {vc.case_number} has been assigned to you for verification.", "verification_case", case_id)
    db.commit()
    return {"message": "Case assigned", "officer": officer.full_name}


@router.post("/{case_id}/decision")
def record_decision(
    case_id: str,
    payload: VerificationDecisionPayload,
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.BANK_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    vc = db.query(VerificationCase).options(
        joinedload(VerificationCase.fdr).joinedload(FDR.institution)
    ).filter(VerificationCase.id == case_id).first()
    if not vc:
        raise HTTPException(status_code=404, detail="Case not found")

    old_status = vc.status
    vc.status = payload.status
    vc.method = payload.method
    vc.findings = payload.findings
    vc.decision_notes = payload.decision_notes
    vc.rejection_reason = payload.rejection_reason
    vc.verification_reference = payload.verification_reference
    vc.is_simulated = payload.is_simulated
    vc.verified_at = datetime.utcnow()
    vc.assigned_to = current_user.id

    # Update FDR status based on verification decision
    fdr = vc.fdr
    old_fdr_status = fdr.status
    if payload.status == VerificationStatus.VERIFIED_AUTHORIZED:
        fdr.status = FDRStatus.VERIFIED
    elif payload.status == VerificationStatus.MANUALLY_REVIEWED:
        fdr.status = FDRStatus.MANUALLY_REVIEWED
    elif payload.status == VerificationStatus.DISCREPANCY_FOUND:
        fdr.status = FDRStatus.DISCREPANCY_FOUND
    elif payload.status == VerificationStatus.MORE_INFO_REQUIRED:
        fdr.status = FDRStatus.CORRECTION_REQUIRED
    elif payload.status == VerificationStatus.REJECTED:
        fdr.status = FDRStatus.REJECTED

    le = LifecycleEvent(fdr_id=fdr.id, event_type=f"VERIFICATION_{payload.status.upper()}",
                        previous_status=old_fdr_status, new_status=fdr.status, performed_by=current_user.id,
                        notes=payload.decision_notes)
    db.add(le)
    log_action(db, current_user, "VERIFICATION_DECISION", "verification_case", case_id,
               previous_value=old_status, new_value=payload.status,
               reason=payload.decision_notes, module="verification")

    # Notify institution users
    inst_users = db.query(User).filter(User.institution_id == fdr.institution_id).all()
    for u in inst_users:
        send_notification(db, u.id, "verification_completed",
                          f"FDR Verification Update: {fdr.fdr_record_id}",
                          f"Verification status: {payload.status.replace('_', ' ').title()}. {payload.decision_notes}",
                          "fdr", fdr.id)
    db.commit()
    return {"message": "Decision recorded", "case_status": vc.status, "fdr_status": fdr.status}


@router.post("/{case_id}/evidence")
def add_evidence(
    case_id: str,
    payload: AddEvidencePayload,
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.BANK_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    vc = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not vc:
        raise HTTPException(status_code=404, detail="Case not found")
    ev = VerificationEvidence(
        verification_case_id=case_id,
        evidence_type=payload.evidence_type,
        description=payload.description,
        reference=payload.reference,
        added_by=current_user.id,
    )
    db.add(ev)
    log_action(db, current_user, "EVIDENCE_ADDED", "verification_case", case_id, module="verification")
    db.commit()
    db.refresh(ev)
    return {"id": ev.id, "evidence_type": ev.evidence_type, "description": ev.description, "added_at": ev.added_at}
