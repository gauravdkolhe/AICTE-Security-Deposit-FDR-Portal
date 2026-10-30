from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, get_password_hash
from app.models.user import User, UserRole
from app.models.audit import Notification, AuditLog, SystemSetting
from app.services.audit_service import log_action
import uuid
from datetime import datetime

router = APIRouter(prefix="/users", tags=["User Management"])
notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])
settings_router = APIRouter(prefix="/settings", tags=["System Settings"])


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole
    institution_id: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    institution_id: Optional[str] = None


# ==================== USERS ====================

@router.get("")
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN, UserRole.AICTE_OFFICER)),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        from sqlalchemy import or_
        query = query.filter(or_(User.full_name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role,
                       "institution_id": u.institution_id, "designation": u.designation,
                       "is_active": u.is_active, "last_login": u.last_login, "created_at": u.created_at} for u in users],
            "total": total, "page": page, "per_page": per_page}


@router.post("")
def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")
    user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        institution_id=payload.institution_id,
        phone=payload.phone,
        designation=payload.designation,
        department=payload.department,
        is_active=True,
    )
    db.add(user)
    log_action(db, current_user, "USER_CREATED", "user", user.id, module="users")
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role}


@router.put("/{user_id}")
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in payload.dict(exclude_none=True).items():
        setattr(user, k, v)
    log_action(db, current_user, "USER_UPDATED", "user", user_id, module="users")
    db.commit()
    return {"message": "User updated"}


@router.delete("/{user_id}")
def deactivate_user(
    user_id: str,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user.is_active = False
    log_action(db, current_user, "USER_DEACTIVATED", "user", user_id, module="users")
    db.commit()
    return {"message": "User deactivated"}


# ==================== NOTIFICATIONS ====================

@notifications_router.get("")
def list_notifications(
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    total = query.count()
    items = query.order_by(Notification.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    unread_count = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
    return {"items": [{"id": n.id, "category": n.category, "title": n.title, "message": n.message,
                       "is_read": n.is_read, "entity_type": n.entity_type, "entity_id": n.entity_id,
                       "created_at": n.created_at, "read_at": n.read_at} for n in items],
            "total": total, "unread_count": unread_count, "page": page, "per_page": per_page}


@notifications_router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter(Notification.id == notification_id,
                                          Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.commit()
    return {"message": "Marked as read"}


@notifications_router.post("/mark-all-read")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update(
        {"is_read": True, "read_at": datetime.utcnow()})
    db.commit()
    return {"message": "All notifications marked as read"}


# ==================== SYSTEM SETTINGS ====================

@settings_router.get("")
def list_settings(
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    settings_list = db.query(SystemSetting).all()
    return [{"id": s.id, "key": s.key, "value": s.value, "description": s.description,
             "category": s.category, "updated_at": s.updated_at} for s in settings_list]


@settings_router.put("/{key}")
def update_setting(
    key: str,
    value: str,
    current_user: User = Depends(require_roles(UserRole.SYSTEM_ADMIN)),
    db: Session = Depends(get_db),
):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        setting = SystemSetting(id=str(uuid.uuid4()), key=key, value=value, updated_by=current_user.id)
        db.add(setting)
    else:
        setting.value = value
        setting.updated_by = current_user.id
    log_action(db, current_user, "SETTING_UPDATED", "system_setting", key, new_value=value, module="settings")
    db.commit()
    return {"key": key, "value": value}
