from sqlalchemy.orm import Session
from app.models.audit import AuditLog, Notification
from app.models.user import User
from datetime import datetime
from typing import Optional


def log_action(
    db: Session,
    actor: Optional[User],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    previous_value: Optional[str] = None,
    new_value: Optional[str] = None,
    reason: Optional[str] = None,
    module: Optional[str] = None,
    ip_address: Optional[str] = None,
    correlation_id: Optional[str] = None,
):
    log = AuditLog(
        actor_id=actor.id if actor else None,
        actor_role=actor.role if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        previous_value=previous_value,
        new_value=new_value,
        reason=reason,
        module=module,
        ip_address=ip_address,
        correlation_id=correlation_id,
    )
    db.add(log)
    db.flush()
    return log


def send_notification(
    db: Session,
    user_id: str,
    category: str,
    title: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
):
    notif = Notification(
        user_id=user_id,
        category=category,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        email_status="not_configured",
    )
    db.add(notif)
    db.flush()
    return notif


def notify_role_users(
    db: Session,
    role: str,
    category: str,
    title: str,
    message: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
):
    from app.models.user import User
    officers = db.query(User).filter(User.role == role, User.is_active == True).all()
    for officer in officers:
        send_notification(db, officer.id, category, title, message, entity_type, entity_id)
