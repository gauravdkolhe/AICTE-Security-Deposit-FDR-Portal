"""
DEVELOPMENT ONLY SEED SCRIPT
Run: python seed.py
Creates demo users, institutions, and FDR records.
These are FICTIONAL records for demonstration purposes only.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date, datetime, timedelta
from decimal import Decimal
import uuid

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.institution import Institution, InstitutionStatus, InstitutionType
from app.models.fdr import FDR, FDRStatus, DepositType
from app.models.verification import VerificationCase, VerificationStatus, VerificationMethod
from app.models.lifecycle import RenewalRequest, RenewalStatus, ReplacementRequest, ReplacementStatus, ReleaseRefundRequest, ReleaseRefundStatus
from app.models.audit import AuditLog, Notification, SLAConfiguration, SystemSetting, ValidationIssue, IssueStatus, IssueSeverity, LifecycleEvent

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def clear_demo_data():
    print("Clearing existing demo data...")
    db.query(ValidationIssue).delete()
    db.query(LifecycleEvent).delete()
    db.query(ReleaseRefundRequest).delete()
    db.query(ReplacementRequest).delete()
    db.query(RenewalRequest).delete()
    db.query(VerificationCase).delete()
    db.query(FDR).filter(FDR.is_demo == True).delete()
    db.query(Institution).filter(Institution.is_demo == True).delete()
    db.query(User).filter(User.notes == "DEMO_SEED").delete()
    db.query(Notification).delete()
    db.query(AuditLog).delete()
    db.commit()
    print("Demo data cleared.")


def seed_users():
    users = [
        {"email": "admin@aicte.gov.in", "full_name": "System Administrator", "role": UserRole.SYSTEM_ADMIN, "password": "Admin@12345", "designation": "System Administrator", "department": "IT"},
        {"email": "officer@aicte.gov.in", "full_name": "Rajesh Kumar Sharma", "role": UserRole.AICTE_OFFICER, "password": "Officer@12345", "designation": "Deputy Director", "department": "Regulation Bureau"},
        {"email": "officer2@aicte.gov.in", "full_name": "Priya Nair", "role": UserRole.AICTE_OFFICER, "password": "Officer@12345", "designation": "Assistant Director", "department": "Finance"},
        {"email": "bank@sbi.co.in", "full_name": "Amit Verma", "role": UserRole.BANK_OFFICER, "password": "Bank@12345", "designation": "Branch Manager", "department": "FD Operations"},
        {"email": "inst@mit.edu.in", "full_name": "Dr. Suresh Patel", "role": UserRole.INSTITUTION_ADMIN, "password": "Inst@12345", "designation": "Finance Officer"},
        {"email": "inst2@vit.edu.in", "full_name": "Ms. Kavitha Reddy", "role": UserRole.INSTITUTION_ADMIN, "password": "Inst@12345", "designation": "CFO"},
        {"email": "inst3@bits.edu.in", "full_name": "Mr. Arun Singh", "role": UserRole.INSTITUTION_ADMIN, "password": "Inst@12345", "designation": "Accounts Head"},
    ]
    created_users = {}
    for u in users:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            created_users[u["email"]] = existing
            continue
        user = User(
            id=str(uuid.uuid4()),
            email=u["email"],
            full_name=u["full_name"],
            hashed_password=get_password_hash(u["password"]),
            role=u["role"],
            designation=u.get("designation"),
            department=u.get("department"),
            is_active=True,
            notes="DEMO_SEED",
        )
        db.add(user)
        created_users[u["email"]] = user
    db.commit()
    print(f"Created/found {len(created_users)} users")
    return created_users


def seed_institutions(users):
    institutions_data = [
        {
            "name": "Maharashtra Institute of Technology, Pune",
            "aicte_permanent_id": "1-123456789",
            "type": InstitutionType.ENGINEERING,
            "state": "Maharashtra", "district": "Pune", "city": "Pune",
            "address": "MIT Campus, Paud Road, Kothrud", "pincode": "411038",
            "contact": "Dr. Suresh Patel", "email": "finance@mit.edu.in",
            "phone": "02025671234", "status": InstitutionStatus.ACTIVE,
            "user_email": "inst@mit.edu.in",
        },
        {
            "name": "Vellore Institute of Technology, Chennai",
            "aicte_permanent_id": "1-987654321",
            "type": InstitutionType.ENGINEERING,
            "state": "Tamil Nadu", "district": "Chennai", "city": "Chennai",
            "address": "VIT Campus, Vandalore Road", "pincode": "600127",
            "contact": "Ms. Kavitha Reddy", "email": "finance@vit.edu.in",
            "phone": "04422157777", "status": InstitutionStatus.ACTIVE,
            "user_email": "inst2@vit.edu.in",
        },
        {
            "name": "BITS Pilani, Rajasthan",
            "aicte_permanent_id": "1-456789123",
            "type": InstitutionType.ENGINEERING,
            "state": "Rajasthan", "district": "Jhunjhunu", "city": "Pilani",
            "address": "BITS Pilani Main Campus", "pincode": "333031",
            "contact": "Mr. Arun Singh", "email": "finance@bits.edu.in",
            "phone": "01596242192", "status": InstitutionStatus.ACTIVE,
            "user_email": "inst3@bits.edu.in",
        },
        {
            "name": "Delhi College of Pharmacy",
            "aicte_permanent_id": "1-111222333",
            "type": InstitutionType.PHARMACY,
            "state": "Delhi", "district": "New Delhi", "city": "New Delhi",
            "address": "Sector 14, Dwarka", "pincode": "110078",
            "contact": "Dr. Meena Gupta", "email": "admin@dcp.edu.in",
            "phone": "01129564200", "status": InstitutionStatus.SUBMITTED,
            "user_email": None,
        },
        {
            "name": "Mumbai Business School",
            "aicte_permanent_id": None,
            "type": InstitutionType.MBA,
            "state": "Maharashtra", "district": "Mumbai", "city": "Mumbai",
            "address": "BKC Complex, Bandra East", "pincode": "400051",
            "contact": "Mr. Rahul Shah", "email": "admin@mbs.edu.in",
            "phone": "02226543210", "status": InstitutionStatus.CORRECTION_REQUIRED,
            "user_email": None,
        },
    ]

    created = {}
    for idx, d in enumerate(institutions_data):
        existing = db.query(Institution).filter(Institution.official_email == d["email"]).first()
        if existing:
            created[d["name"]] = existing
            continue

        count = db.query(Institution).count()
        inst = Institution(
            id=str(uuid.uuid4()),
            institution_code=f"INST{str(count + 1).zfill(5)}",
            name=d["name"],
            aicte_permanent_id=d["aicte_permanent_id"],
            institution_type=d["type"],
            address_line1=d["address"],
            city=d["city"],
            district=d["district"],
            state=d["state"],
            pincode=d["pincode"],
            contact_person=d["contact"],
            official_email=d["email"],
            contact_number=d["phone"],
            status=d["status"],
            activation_date=datetime.utcnow() if d["status"] == InstitutionStatus.ACTIVE else None,
            is_demo=True,
        )
        db.add(inst)
        db.flush()
        created[d["name"]] = inst

        # Link institution admin user
        if d.get("user_email") and d["user_email"] in users:
            u = users[d["user_email"]]
            u.institution_id = inst.id
    db.commit()
    print(f"Created {len(created)} institutions")
    return created


def seed_fdrs(institutions, users):
    officer = users.get("officer@aicte.gov.in")
    bank_officer = users.get("bank@sbi.co.in")
    today = date.today()

    mit = institutions.get("Maharashtra Institute of Technology, Pune")
    vit = institutions.get("Vellore Institute of Technology, Chennai")
    bits = institutions.get("BITS Pilani, Rajasthan")

    fdr_data = [
        # MIT FDRs
        {"inst": mit, "fdr_no": "SBI/FD/2022/001234", "bank": "State Bank of India", "branch": "Kothrud Branch, Pune",
         "ifsc": "SBIN0012345", "amount": 2500000, "issue": today - timedelta(days=730),
         "maturity": today + timedelta(days=60), "status": FDRStatus.ACTIVE,  "label": "approaching_maturity"},
        {"inst": mit, "fdr_no": "SBI/FD/2023/005678", "bank": "State Bank of India", "branch": "FC Road Branch, Pune",
         "ifsc": "SBIN0012346", "amount": 3000000, "issue": today - timedelta(days=365),
         "maturity": today + timedelta(days=365), "status": FDRStatus.VERIFIED},
        {"inst": mit, "fdr_no": "HDFC/FD/2021/009912", "bank": "HDFC Bank", "branch": "Kothrud Branch",
         "ifsc": "HDFC0001234", "amount": 1500000, "issue": today - timedelta(days=1095),
         "maturity": today - timedelta(days=30), "status": FDRStatus.MATURED, "label": "overdue"},
        {"inst": mit, "fdr_no": "SBI/FD/2024/011234", "bank": "State Bank of India", "branch": "Paud Road Branch",
         "ifsc": "SBIN0012347", "amount": 2000000, "issue": today - timedelta(days=60),
         "maturity": today + timedelta(days=670), "status": FDRStatus.PENDING_VERIFICATION},
        # VIT FDRs
        {"inst": vit, "fdr_no": "CAN/FD/2022/056789", "bank": "Canara Bank", "branch": "Vandalur Branch, Chennai",
         "ifsc": "CNRB0012345", "amount": 5000000, "issue": today - timedelta(days=548),
         "maturity": today + timedelta(days=182), "status": FDRStatus.VERIFIED},
        {"inst": vit, "fdr_no": "CAN/FD/2023/078901", "bank": "Canara Bank", "branch": "Tambaram Branch",
         "ifsc": "CNRB0012346", "amount": 3500000, "issue": today - timedelta(days=180),
         "maturity": today + timedelta(days=550), "status": FDRStatus.RENEWAL_SUBMITTED},
        {"inst": vit, "fdr_no": "ICICI/FD/2024/034567", "bank": "ICICI Bank", "branch": "Vandalur Branch",
         "ifsc": "ICIC0001234", "amount": 2000000, "issue": today - timedelta(days=30),
         "maturity": today + timedelta(days=700), "status": FDRStatus.DRAFT},
        # BITS FDRs
        {"inst": bits, "fdr_no": "PNB/FD/2022/012345", "bank": "Punjab National Bank", "branch": "Pilani Branch",
         "ifsc": "PUNB0012345", "amount": 1000000, "issue": today - timedelta(days=730),
         "maturity": today + timedelta(days=30), "status": FDRStatus.APPROACHING_MATURITY, "label": "approaching_soon"},
        {"inst": bits, "fdr_no": "SBI/FD/2023/089012", "bank": "State Bank of India", "branch": "Pilani Branch",
         "ifsc": "SBIN0012350", "amount": 750000, "issue": today - timedelta(days=365),
         "maturity": today + timedelta(days=365), "status": FDRStatus.REPLACEMENT_PENDING},
        {"inst": bits, "fdr_no": "UNION/FD/2024/098765", "bank": "Union Bank of India", "branch": "Jhunjhunu Branch",
         "ifsc": "UBIN0012345", "amount": 1200000, "issue": today - timedelta(days=90),
         "maturity": today + timedelta(days=640), "status": FDRStatus.VERIFIED},
        # Released / closed
        {"inst": mit, "fdr_no": "SBI/FD/2019/004321", "bank": "State Bank of India", "branch": "Kothrud Branch, Pune",
         "ifsc": "SBIN0012345", "amount": 1000000, "issue": today - timedelta(days=1825),
         "maturity": today - timedelta(days=460), "status": FDRStatus.RELEASED},
    ]

    created_fdrs = []
    for i, d in enumerate(fdr_data):
        if not d["inst"]:
            continue
        count = db.query(FDR).count()
        fdr = FDR(
            id=str(uuid.uuid4()),
            fdr_record_id=f"FDR{today.year}{str(count + 1).zfill(6)}",
            institution_id=d["inst"].id,
            fdr_number=d["fdr_no"],
            deposit_amount=Decimal(str(d["amount"])),
            currency="INR",
            issuing_bank=d["bank"],
            bank_branch=d["branch"],
            ifsc_code=d.get("ifsc"),
            issue_date=d["issue"],
            maturity_date=d["maturity"],
            deposit_type=DepositType.FIXED_DEPOSIT,
            interest_rate=Decimal("7.25"),
            auto_renewal=False,
            status=d["status"],
            submission_date=datetime.utcnow() - timedelta(days=10) if d["status"] != FDRStatus.DRAFT else None,
            is_demo=True,
        )
        db.add(fdr)
        db.flush()

        # Create lifecycle event
        le = LifecycleEvent(fdr_id=fdr.id, event_type="FDR_CREATED", new_status=d["status"])
        db.add(le)

        # Create verification cases for submitted ones
        if d["status"] in [FDRStatus.PENDING_VERIFICATION, FDRStatus.VERIFIED, FDRStatus.MANUALLY_REVIEWED, FDRStatus.DISCREPANCY_FOUND]:
            vc_count = db.query(VerificationCase).count()
            vc_status = {
                FDRStatus.PENDING_VERIFICATION: VerificationStatus.PENDING,
                FDRStatus.VERIFIED: VerificationStatus.VERIFIED_AUTHORIZED,
                FDRStatus.MANUALLY_REVIEWED: VerificationStatus.MANUALLY_REVIEWED,
                FDRStatus.DISCREPANCY_FOUND: VerificationStatus.DISCREPANCY_FOUND,
            }.get(d["status"], VerificationStatus.PENDING)

            vc = VerificationCase(
                id=str(uuid.uuid4()),
                case_number=f"VC{today.year}{str(vc_count + 1).zfill(5)}",
                fdr_id=fdr.id,
                institution_id=d["inst"].id,
                status=vc_status,
                method=VerificationMethod.DEMO_SIMULATION if vc_status == VerificationStatus.VERIFIED_AUTHORIZED else None,
                findings="[DEMO] FDR details reviewed. Bank confirmation obtained via authorized channel.",
                is_simulated=True,
                verified_at=datetime.utcnow() - timedelta(days=5) if vc_status != VerificationStatus.PENDING else None,
                assigned_to=officer.id if officer else None,
            )
            db.add(vc)

        created_fdrs.append(fdr)

    db.commit()
    print(f"Created {len(created_fdrs)} FDR records")

    # Add renewal request for VIT's renewal_submitted FDR
    renewal_fdr = next((f for f in created_fdrs if f.fdr_number == "CAN/FD/2023/078901"), None)
    if renewal_fdr:
        count = db.query(RenewalRequest).count()
        rr = RenewalRequest(
            id=str(uuid.uuid4()),
            request_number=f"REN{today.year}{str(count + 1).zfill(5)}",
            fdr_id=renewal_fdr.id,
            institution_id=renewal_fdr.institution_id,
            new_maturity_date=date.today() + timedelta(days=915),
            renewal_reason="[DEMO] Annual renewal as per regulatory requirement.",
            status=RenewalStatus.SUBMITTED,
            submitted_at=datetime.utcnow() - timedelta(days=3),
        )
        db.add(rr)

    # Replacement for BITS
    replace_fdr = next((f for f in created_fdrs if f.fdr_number == "SBI/FD/2023/089012"), None)
    if replace_fdr:
        count = db.query(ReplacementRequest).count()
        rep = ReplacementRequest(
            id=str(uuid.uuid4()),
            request_number=f"REP{today.year}{str(count + 1).zfill(5)}",
            original_fdr_id=replace_fdr.id,
            institution_id=replace_fdr.institution_id,
            replacement_reason="[DEMO] Bank branch relocation. FDR to be reissued from new branch.",
            status=ReplacementStatus.SUBMITTED,
            submitted_at=datetime.utcnow() - timedelta(days=7),
        )
        db.add(rep)

    # Release request for MIT's released FDR
    rel_fdr = next((f for f in created_fdrs if f.fdr_number == "SBI/FD/2019/004321"), None)
    if rel_fdr:
        count = db.query(ReleaseRefundRequest).count()
        rlr = ReleaseRefundRequest(
            id=str(uuid.uuid4()),
            request_number=f"RLR{today.year}{str(count + 1).zfill(5)}",
            fdr_id=rel_fdr.id,
            institution_id=rel_fdr.institution_id,
            request_type="release",
            reason="[DEMO] Institution has completed regulatory compliance requirements. Requesting release of security deposit.",
            status=ReleaseRefundStatus.COMPLETED,
            submitted_at=datetime.utcnow() - timedelta(days=90),
            approved_at=datetime.utcnow() - timedelta(days=60),
            completed_at=datetime.utcnow() - timedelta(days=45),
            approval_notes="[DEMO] Approved after verification of compliance status.",
            processing_reference="PROC/2024/001234",
        )
        db.add(rlr)

    db.commit()


def seed_sla_config():
    configs = [
        {"name": "Maturity Alert 90 Days", "event_type": "maturity_approaching", "days_threshold": "90", "severity": "low", "description": "Alert when FDR matures within 90 days"},
        {"name": "Maturity Alert 60 Days", "event_type": "maturity_approaching", "days_threshold": "60", "severity": "medium", "description": "Alert when FDR matures within 60 days"},
        {"name": "Maturity Alert 30 Days", "event_type": "maturity_approaching", "days_threshold": "30", "severity": "high", "description": "Alert when FDR matures within 30 days"},
        {"name": "Maturity Alert 7 Days", "event_type": "maturity_approaching", "days_threshold": "7", "severity": "critical", "description": "Alert when FDR matures within 7 days"},
        {"name": "Verification SLA 5 Days", "event_type": "verification_pending", "days_threshold": "5", "severity": "medium", "description": "Escalate verification pending beyond 5 days"},
    ]
    for c in configs:
        existing = db.query(SLAConfiguration).filter(SLAConfiguration.name == c["name"]).first()
        if not existing:
            db.add(SLAConfiguration(id=str(uuid.uuid4()), **c))
    db.commit()
    print("SLA configurations seeded")


def seed_system_settings():
    settings_data = [
        {"key": "maturity_reminder_days", "value": "90,60,30,7", "category": "notifications", "description": "Comma-separated days before maturity to send reminders"},
        {"key": "max_file_size_mb", "value": "10", "category": "uploads", "description": "Maximum file size in MB for uploads"},
        {"key": "allowed_file_types", "value": "pdf,jpg,jpeg,png,doc,docx", "category": "uploads", "description": "Allowed file extensions"},
        {"key": "verification_sla_days", "value": "5", "category": "sla", "description": "SLA days for verification review"},
    ]
    for s in settings_data:
        existing = db.query(SystemSetting).filter(SystemSetting.key == s["key"]).first()
        if not existing:
            db.add(SystemSetting(id=str(uuid.uuid4()), **s))
    db.commit()
    print("System settings seeded")


def seed_all():
    users = seed_users()
    institutions = seed_institutions(users)
    seed_fdrs(institutions, users)
    seed_sla_config()
    seed_system_settings()
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("AICTE FDR Portal - Development Seed Script")
    print("This creates FICTIONAL demonstration data only.")
    print("=" * 60)

    clear_demo_data()
    seed_all()

    print("\n" + "=" * 60)
    print("Seed complete. Development demo credentials:")
    print("  Admin:       admin@aicte.gov.in     / Admin@12345")
    print("  AICTE Off:   officer@aicte.gov.in   / Officer@12345")
    print("  Bank Off:    bank@sbi.co.in         / Bank@12345")
    print("  Institution: inst@mit.edu.in        / Inst@12345")
    print("  Institution: inst2@vit.edu.in       / Inst@12345")
    print("  Institution: inst3@bits.edu.in      / Inst@12345")
    print("=" * 60)
