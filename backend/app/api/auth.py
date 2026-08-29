from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging

from ..core.db import get_db
from ..core.config import settings
from ..core.security import (
    create_access_token,
    create_password_reset_token,
    decode_token,
    decode_password_reset_token,
    hash_password,
)
from ..schemas.auth import ForgotPasswordIn, MessageOut, RegisterIn, ResetPasswordIn, LoginOut, UserOut
from ..services.auth_service import get_user_by_email, create_user, authenticate
from ..services.email_service import send_password_reset_email
from ..models.user import User
from .deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=UserOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = create_user(db, payload.name, payload.email, payload.password)
    return UserOut(id=user.id, email=user.email, name=user.name)

@router.post("/login", response_model=LoginOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    token = create_access_token(str(user.id), user.password_hash)
    return LoginOut(user=UserOut(id=user.id, email=user.email, name=user.name), access_token=token)

@router.get("/me", response_model=UserOut)
def me(current_user=Depends(get_current_user)):
    return UserOut(id=current_user.id, email=current_user.email, name=current_user.name)

@router.post("/forgot-password", response_model=MessageOut)
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    if not settings.SMTP_HOST and not settings.PASSWORD_RESET_DEV_MODE:
        raise HTTPException(status_code=503, detail="Layanan email belum dikonfigurasi")
    user = get_user_by_email(db, payload.email)
    reset_url = None
    if user:
        token = create_password_reset_token(user.id, user.password_hash)
        if settings.SMTP_HOST:
            try:
                send_password_reset_email(user.email, token)
            except Exception:
                # Response tetap generik agar status email tidak membocorkan keberadaan akun.
                logger.exception("Failed to send password reset email")
        elif settings.PASSWORD_RESET_DEV_MODE:
            reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    message = (
        "Link reset development siap digunakan."
        if reset_url
        else "Jika email terdaftar, link reset password telah dikirim."
    )
    return MessageOut(message=message, reset_url=reset_url)

@router.post("/reset-password", response_model=MessageOut)
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    try:
        token_payload = decode_token(payload.token)
        user_id = int(token_payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        decode_password_reset_token(payload.token, user.password_hash)
    except Exception:
        raise HTTPException(status_code=400, detail="Link reset password tidak valid atau sudah kedaluwarsa")

    user.password_hash = hash_password(payload.password)
    db.commit()
    return MessageOut(message="Password berhasil diperbarui. Silakan login.")
