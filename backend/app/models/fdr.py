import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Enum, ForeignKey, Numeric, Boolean, Date
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class FDRStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PENDING_VERIFICATION = "pending_verification"
    IN_REVIEW = "in_review"
    VERIFIED = "verified"
    MANUALLY_REVIEWED = "manually_reviewed"
    DISCREPANCY_FOUND = "discrepancy_found"
    CORRECTION_REQUIRED = "correction_required"
    REJECTED = "rejected"
    ACTIVE = "active"
    APPROACHING_MATURITY = "approaching_maturity"
    MATURED = "matured"
    RENEWAL_PENDING = "renewal_pending"
    RENEWAL_SUBMITTED = "renewal_submitted"
    RENEWED = "renewed"
    REPLACEMENT_PENDING = "replacement_pending"
    REPLACED = "replaced"
    RELEASE_REQUESTED = "release_requested"
    RELEASED = "released"
    CLOSED = "closed"


class DepositType(str, enum.Enum):
    FIXED_DEPOSIT = "fixed_deposit"
    RECURRING_DEPOSIT = "recurring_deposit"
    TERM_DEPOSIT = "term_deposit"


class FDR(Base):
    __tablename__ = "fdrs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fdr_record_id = Column(String(30), unique=True, nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    fdr_number = Column(String(200), nullable=False)
    deposit_reference_number = Column(String(200), nullable=True)
    approval_reference = Column(String(200), nullable=True)

    # Financial details
    deposit_amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    issuing_bank = Column(String(300), nullable=False)
    bank_branch = Column(String(300), nullable=False)
    ifsc_code = Column(String(20), nullable=True)
    issue_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=False)
    deposit_type = Column(Enum(DepositType), default=DepositType.FIXED_DEPOSIT)
    interest_rate = Column(Numeric(5, 2), nullable=True)
    auto_renewal = Column(Boolean, default=False)
    renewal_tenure_months = Column(String(20), nullable=True)

    # Status and lifecycle
    status = Column(Enum(FDRStatus), default=FDRStatus.DRAFT, nullable=False, index=True)
    submission_date = Column(DateTime, nullable=True)
    verification_status = Column(String(100), nullable=True)
    lifecycle_status = Column(String(100), nullable=True)

    # Relationships
    parent_fdr_id = Column(String(36), ForeignKey("fdrs.id"), nullable=True)

    # Meta
    submitted_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)

    institution = relationship("Institution", back_populates="fdrs")
    documents = relationship("FDRDocument", back_populates="fdr", cascade="all, delete-orphan")
    submitter = relationship("User", foreign_keys=[submitted_by])
    verification_cases = relationship("VerificationCase", back_populates="fdr")
    lifecycle_events = relationship("LifecycleEvent", back_populates="fdr")
    renewal_requests = relationship("RenewalRequest", back_populates="fdr", foreign_keys="RenewalRequest.fdr_id")
    replacement_requests = relationship("ReplacementRequest", back_populates="original_fdr", foreign_keys="ReplacementRequest.original_fdr_id")
    release_requests = relationship("ReleaseRefundRequest", back_populates="fdr")
    validation_issues = relationship("ValidationIssue", back_populates="fdr")
    parent_fdr = relationship("FDR", remote_side=[id], foreign_keys=[parent_fdr_id], backref="child_fdrs")


class FDRDocument(Base):
    __tablename__ = "fdr_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fdr_id = Column(String(36), ForeignKey("fdrs.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(100), nullable=False)
    original_filename = Column(String(500), nullable=False)
    stored_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(String(50), nullable=True)
    mime_type = Column(String(100), nullable=True)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    fdr = relationship("FDR", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])
