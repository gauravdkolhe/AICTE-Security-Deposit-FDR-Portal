from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
import uuid, os, shutil

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.config import get_settings
from app.models.user import User, UserRole
from app.models.institution import Institution, InstitutionDocument, InstitutionStatus, InstitutionType
from app.services.audit_service import log_action, send_notification, notify_role_users

settings = get_settings()
router = APIRouter(prefix="/institutions", tags=["Institutions"])


def generate_institution_code(db: Session) -> str:
    count = db.query(Institution).count()
    return f"INST{str(count + 1).zfill(5)}"


class InstitutionCreate(BaseModel):
    name: str
    aicte_permanent_id: Optional[str] = None
    institution_type: InstitutionType
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    district: str
    state: str
    pincode: str
    contact_person: str
    official_email: str
    contact_number: str
    alternate_contact: Optional[str] = None
    website: Optional[str] = None


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    official_email: Optional[str] = None
    contact_number: Optional[str] = None
    alternate_contact: Optional[str] = None
    website: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


class ReviewPayload(BaseModel):
    action: str  # approve, reject, correction_required
    notes: str


def institution_to_dict(inst: Institution) -> dict:
    return {
        "id": inst.id,
        "institution_code": inst.institution_code,
        "name": inst.name,
        "aicte_permanent_id": inst.aicte_permanent_id,
        "institution_type": inst.institution_type,
        "address_line1": inst.address_line1,
        "address_line2": inst.address_line2,
        "city": inst.city,
        "district": inst.district,
        "state": inst.state,
        "pincode": inst.pincode,
        "contact_person": inst.contact_person,
        "official_email": inst.official_email,
        "contact_number": inst.contact_number,
        "alternate_contact": inst.alternate_contact,
        "website": inst.website,
        "status": inst.status,
        "review_notes": inst.review_notes,
        "review_date": inst.review_date,
        "activation_date": inst.activation_date,
        "created_at": inst.created_at,
        "updated_at": inst.updated_at,
        "is_demo": inst.is_demo,
        "fdr_count": len(inst.fdrs) if inst.fdrs else 0,
    }


@router.get("")
def list_institutions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    state: Optional[str] = None,
    institution_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Institution)

    # Institution admin can only see their own institution
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        if current_user.institution_id:
            query = query.filter(Institution.id == current_user.institution_id)
        else:
            return {"items": [], "total": 0, "page": page, "per_page": per_page}

    if search:
        query = query.filter(
            or_(
                Institution.name.ilike(f"%{search}%"),
                Institution.institution_code.ilike(f"%{search}%"),
                Institution.aicte_permanent_id.ilike(f"%{search}%"),
            )
        )
    if status:
        query = query.filter(Institution.status == status)
    if state:
        query = query.filter(Institution.state.ilike(f"%{state}%"))
    if institution_type:
        query = query.filter(Institution.institution_type == institution_type)

    total = query.count()
    items = query.order_by(Institution.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "items": [institution_to_dict(i) for i in items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.post("")
def create_institution(
    payload: InstitutionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check for AICTE ID duplicates
    if payload.aicte_permanent_id:
        existing = db.query(Institution).filter(Institution.aicte_permanent_id == payload.aicte_permanent_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="An institution with this AICTE Permanent ID already exists")

    inst = Institution(
        id=str(uuid.uuid4()),
        institution_code=generate_institution_code(db),
        name=payload.name,
        aicte_permanent_id=payload.aicte_permanent_id,
        institution_type=payload.institution_type,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        city=payload.city,
        district=payload.district,
        state=payload.state,
        pincode=payload.pincode,
        contact_person=payload.contact_person,
        official_email=payload.official_email,
        contact_number=payload.contact_number,
        alternate_contact=payload.alternate_contact,
        website=payload.website,
        status=InstitutionStatus.DRAFT,
        registered_by=current_user.id,
    )
    db.add(inst)
    log_action(db, current_user, "INSTITUTION_CREATED", "institution", inst.id, module="institutions")
    db.commit()
    db.refresh(inst)
    return institution_to_dict(inst)


@router.get("/{institution_id}")
def get_institution(
    institution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and current_user.institution_id != institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return institution_to_dict(inst)


@router.put("/{institution_id}")
def update_institution(
    institution_id: str,
    payload: InstitutionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and current_user.institution_id != institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if inst.status == InstitutionStatus.ACTIVE and current_user.role == UserRole.INSTITUTION_ADMIN:
        # Can only update contact info when active
        allowed_fields = {"contact_person", "official_email", "contact_number", "alternate_contact", "website"}
        update_data = {k: v for k, v in payload.dict(exclude_none=True).items() if k in allowed_fields}
    else:
        update_data = payload.dict(exclude_none=True)

    for k, v in update_data.items():
        setattr(inst, k, v)

    log_action(db, current_user, "INSTITUTION_UPDATED", "institution", institution_id, module="institutions")
    db.commit()
    db.refresh(inst)
    return institution_to_dict(inst)


@router.post("/{institution_id}/submit")
def submit_institution(
    institution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Not found")
    if inst.status not in [InstitutionStatus.DRAFT, InstitutionStatus.CORRECTION_REQUIRED]:
        raise HTTPException(status_code=400, detail="Cannot submit in current status")

    inst.status = InstitutionStatus.SUBMITTED
    log_action(db, current_user, "INSTITUTION_SUBMITTED", "institution", institution_id, module="institutions")
    notify_role_users(db, UserRole.AICTE_OFFICER, "institution_registration",
                      f"New Institution Registration: {inst.name}",
                      f"Institution {inst.name} ({inst.institution_code}) submitted for review.",
                      "institution", institution_id)
    db.commit()
    return {"message": "Submitted for review", "status": inst.status}


@router.post("/{institution_id}/review")
def review_institution(
    institution_id: str,
    payload: ReviewPayload,
    current_user: User = Depends(require_roles(UserRole.AICTE_OFFICER, UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Not found")

    if payload.action == "approve":
        inst.status = InstitutionStatus.ACTIVE
        inst.activation_date = datetime.utcnow()
    elif payload.action == "reject":
        inst.status = InstitutionStatus.CLOSED
    elif payload.action == "correction_required":
        inst.status = InstitutionStatus.CORRECTION_REQUIRED
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    inst.reviewed_by = current_user.id
    inst.review_notes = payload.notes
    inst.review_date = datetime.utcnow()

    log_action(db, current_user, f"INSTITUTION_{payload.action.upper()}", "institution", institution_id,
               reason=payload.notes, module="institutions")

    # Notify institution users
    inst_users = db.query(User).filter(User.institution_id == institution_id).all()
    for u in inst_users:
        send_notification(db, u.id, "institution_review",
                          f"Institution Registration {payload.action.replace('_', ' ').title()}",
                          payload.notes, "institution", institution_id)
    db.commit()
    return {"message": f"Institution {payload.action}", "status": inst.status}


@router.post("/{institution_id}/documents")
async def upload_institution_document(
    institution_id: str,
    document_type: str = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    if current_user.role == UserRole.INSTITUTION_ADMIN and current_user.institution_id != institution_id:
        raise HTTPException(status_code=403, detail="Access denied")

    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    allowed_types = {"application/pdf", "image/jpeg", "image/png", "application/msword",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed. Permitted: PDF, JPEG, PNG, DOC, DOCX")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "institutions", institution_id)
    os.makedirs(upload_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(upload_dir, stored_name)

    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail=f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB allowed.")

    with open(file_path, "wb") as f:
        f.write(content)

    doc = InstitutionDocument(
        institution_id=institution_id,
        document_type=document_type,
        original_filename=file.filename,
        stored_filename=stored_name,
        file_path=file_path,
        file_size=f"{len(content) // 1024}KB",
        mime_type=file.content_type,
        uploaded_by=current_user.id,
        notes=notes,
    )
    db.add(doc)
    log_action(db, current_user, "DOCUMENT_UPLOADED", "institution_document", doc.id, module="institutions")
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "document_type": doc.document_type, "original_filename": doc.original_filename,
            "uploaded_at": doc.uploaded_at, "file_size": doc.file_size}


@router.get("/{institution_id}/documents")
def list_institution_documents(
    institution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.INSTITUTION_ADMIN and current_user.institution_id != institution_id:
        raise HTTPException(status_code=403, detail="Access denied")
    docs = db.query(InstitutionDocument).filter(InstitutionDocument.institution_id == institution_id).all()
    return [{"id": d.id, "document_type": d.document_type, "original_filename": d.original_filename,
             "uploaded_at": d.uploaded_at, "file_size": d.file_size, "notes": d.notes} for d in docs]
