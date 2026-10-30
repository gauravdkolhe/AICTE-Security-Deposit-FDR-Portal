import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class IssueSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IssueStatus(str, enum.Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    IGNORED = "ignored"


class ValidationIssue(Base):
    __tablename__ = "validation_issues"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fdr_id = Column(String(36), ForeignKey("fdrs.id"), nullable=False, index=True)
    issue_type = Column(String(100), nullable=False)
    severity = Column(Enum(IssueSeverity), nullable=False)
    affected_field = Column(String(200), nullable=True)
    description = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=True)
    status = Column(Enum(IssueStatus), default=IssueStatus.OPEN, nullable=False)
    resolved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fdr = relationship("FDR", back_populates="validation_issues")
    resolver = relationship("User", foreign_keys=[resolved_by])


class LifecycleEvent(Base):
    __tablename__ = "lifecycle_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fdr_id = Column(String(36), ForeignKey("fdrs.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    previous_status = Column(String(100), nullable=True)
    new_status = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    performed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    fdr = relationship("FDR", back_populates="lifecycle_events")
    actor = relationship("User", foreign_keys=[performed_by])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(100), nullable=True)
    action = Column(String(200), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(36), nullable=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    correlation_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    module = Column(String(100), nullable=True)

    actor = relationship("User", back_populates="audit_logs", foreign_keys=[actor_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(36), nullable=True)
    is_read = Column(Boolean, default=False)
    email_sent = Column(Boolean, default=False)
    email_status = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="notifications")


class SLAConfiguration(Base):
    __tablename__ = "sla_configurations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    event_type = Column(String(100), nullable=False)
    days_threshold = Column(String(20), nullable=False)
    severity = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(200), nullable=False, unique=True)
    value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    updated_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    updater = relationship("User", foreign_keys=[updated_by])
