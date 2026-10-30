from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, get_current_user, decode_token
from app.models.user import User, UserRole
from app.services.audit_service import log_action

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive. Contact administrator.")

    user.last_login = datetime.utcnow()
    log_action(db, user, "USER_LOGIN", "user", user.id, module="auth")
    db.commit()

    access_token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "institution_id": user.institution_id,
            "designation": user.designation,
        }
    }


@router.post("/refresh")
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == data["sub"], User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access_token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "institution_id": current_user.institution_id,
        "designation": current_user.designation,
        "department": current_user.department,
        "phone": current_user.phone,
        "last_login": current_user.last_login,
        "is_active": current_user.is_active,
    }


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_action(db, current_user, "USER_LOGOUT", "user", current_user.id, module="auth")
    db.commit()
    return {"message": "Logged out successfully"}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(payload.new_password)
    log_action(db, current_user, "PASSWORD_CHANGED", "user", current_user.id, module="auth")
    db.commit()
    return {"message": "Password changed successfully"}
