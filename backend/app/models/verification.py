import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    VERIFIED_AUTHORIZED = "verified_authorized"
    MANUALLY_REVIEWED = "manually_reviewed"
    DISCREPANCY_FOUND = "discrepancy_found"
    MORE_INFO_REQUIRED = "more_info_required"
    VERIFICATION_UNAVAILABLE = "verification_unavailable"
    REJECTED = "rejected"


class VerificationMethod(str, enum.Enum):
    AUTHORIZED_SOURCE = "authorized_source"
    MANUAL_REVIEW = "manual_review"
    DEMO_SIMULATION = "demo_simulation"
    PENDING = "pending"


class VerificationCase(Base):
    __tablename__ = "verification_cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_number = Column(String(30), unique=True, nullable=False, index=True)
    fdr_id = Column(String(36), ForeignKey("fdrs.id"), nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING, nullable=False, index=True)
    method = Column(Enum(VerificationMethod), nullable=True)
    findings = Column(Text, nullable=True)
    decision_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    verification_reference = Column(String(200), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    assigned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_simulated = Column(Boolean, default=False)

    fdr = relationship("FDR", back_populates="verification_cases")
    institution = relationship("Institution", foreign_keys=[institution_id])
    officer = relationship("User", foreign_keys=[assigned_to])
    evidence_list = relationship("VerificationEvidence", back_populates="verification_case", cascade="all, delete-orphan")


class VerificationEvidence(Base):
    __tablename__ = "verification_evidence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    verification_case_id = Column(String(36), ForeignKey("verification_cases.id", ondelete="CASCADE"), nullable=False)
    evidence_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    reference = Column(String(500), nullable=True)
    added_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)

    verification_case = relationship("VerificationCase", back_populates="evidence_list")
    adder = relationship("User", foreign_keys=[added_by])
