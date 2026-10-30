import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class InstitutionStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    CORRECTION_REQUIRED = "correction_required"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CLOSED = "closed"


class InstitutionType(str, enum.Enum):
    ENGINEERING = "engineering"
    PHARMACY = "pharmacy"
    MBA = "mba"
    MCA = "mca"
    ARCHITECTURE = "architecture"
    HOTEL_MANAGEMENT = "hotel_management"
    APPLIED_ARTS = "applied_arts"
    OTHER = "other"


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    institution_code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(500), nullable=False)
    aicte_permanent_id = Column(String(100), nullable=True, unique=True, index=True)
    institution_type = Column(Enum(InstitutionType), nullable=False)
    address_line1 = Column(String(500), nullable=False)
    address_line2 = Column(String(500), nullable=True)
    city = Column(String(200), nullable=False)
    district = Column(String(200), nullable=False)
    state = Column(String(200), nullable=False)
    pincode = Column(String(10), nullable=False)
    contact_person = Column(String(255), nullable=False)
    official_email = Column(String(255), nullable=False)
    contact_number = Column(String(20), nullable=False)
    alternate_contact = Column(String(20), nullable=True)
    website = Column(String(500), nullable=True)
    status = Column(Enum(InstitutionStatus), default=InstitutionStatus.DRAFT, nullable=False)
    registered_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text, nullable=True)
    review_date = Column(DateTime, nullable=True)
    activation_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_demo = Column(Boolean, default=False)

    documents = relationship("InstitutionDocument", back_populates="institution", cascade="all, delete-orphan")
    fdrs = relationship("FDR", back_populates="institution")
    registrar = relationship("User", foreign_keys=[registered_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class InstitutionDocument(Base):
    __tablename__ = "institution_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String(100), nullable=False)
    original_filename = Column(String(500), nullable=False)
    stored_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(String(50), nullable=True)
    mime_type = Column(String(100), nullable=True)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    institution = relationship("Institution", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])
