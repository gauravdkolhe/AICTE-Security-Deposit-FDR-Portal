import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    SYSTEM_ADMIN = "system_admin"
    AICTE_OFFICER = "aicte_officer"
    BANK_OFFICER = "bank_officer"
    INSTITUTION_ADMIN = "institution_admin"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    phone = Column(String(20), nullable=True)
    institution_id = Column(String(36), nullable=True, index=True)
    designation = Column(String(200), nullable=True)
    department = Column(String(200), nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text, nullable=True)

    audit_logs = relationship("AuditLog", back_populates="actor", foreign_keys="AuditLog.actor_id")
    notifications = relationship("Notification", back_populates="user")
