import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Enum, ForeignKey, Boolean, Numeric, Date
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class RenewalStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


class ReplacementStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


class ReleaseRefundStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    INFORMATION_REQUIRED = "information_required"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REJECTED = "rejected"
    DEFERRED = "deferred"


class RenewalRequest(Base):
    __tablename__ = "renewal_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_number = Column(String(30), unique=True, nullable=False, index=True)
    fdr_id = Column(String(36), ForeignKey("fdrs.id"), nullable=False)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    new_maturity_date = Column(Date, nullable=True)
    new_amount = Column(Numeric(18, 2), nullable=True)
    renewal_reason = Column(Text, nullable=True)
    status = Column(Enum(RenewalStatus), default=RenewalStatus.PENDING, nullable=False)
    submitted_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    document_paths = Column(Text, nullable=True)  # JSON array of paths

    fdr = relationship("FDR", back_populates="renewal_requests", foreign_keys=[fdr_id])
    institution = relationship("Institution", foreign_keys=[institution_id])
    submitter = relationship("User", foreign_keys=[submitted_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class ReplacementRequest(Base):
    __tablename__ = "replacement_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_number = Column(String(30), unique=True, nullable=False, index=True)
    original_fdr_id = Column(String(36), ForeignKey("fdrs.id"), nullable=False)
    replacement_fdr_id = Column(String(36), ForeignKey("fdrs.id"), nullable=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    replacement_reason = Column(Text, nullable=False)
    status = Column(Enum(ReplacementStatus), default=ReplacementStatus.PENDING, nullable=False)
    submitted_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    document_paths = Column(Text, nullable=True)

    original_fdr = relationship("FDR", back_populates="replacement_requests", foreign_keys=[original_fdr_id])
    replacement_fdr = relationship("FDR", foreign_keys=[replacement_fdr_id])
    institution = relationship("Institution", foreign_keys=[institution_id])
    submitter = relationship("User", foreign_keys=[submitted_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class ReleaseRefundRequest(Base):
    __tablename__ = "release_refund_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_number = Column(String(30), unique=True, nullable=False, index=True)
    fdr_id = Column(String(36), ForeignKey("fdrs.id"), nullable=False)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False)
    request_type = Column(String(50), nullable=False)  # release or refund
    reason = Column(Text, nullable=False)
    eligibility_findings = Column(Text, nullable=True)
    verification_findings = Column(Text, nullable=True)
    status = Column(Enum(ReleaseRefundStatus), default=ReleaseRefundStatus.DRAFT, nullable=False)
    submitted_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    approval_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    processing_reference = Column(String(200), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    document_paths = Column(Text, nullable=True)

    fdr = relationship("FDR", back_populates="release_requests")
    institution = relationship("Institution", foreign_keys=[institution_id])
    submitter = relationship("User", foreign_keys=[submitted_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    approver = relationship("User", foreign_keys=[approved_by])
