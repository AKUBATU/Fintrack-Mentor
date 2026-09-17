from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging

from ..core.db import get_db
from ..core.config import settings
from ..core.security import (
    create_access_token,
    create_password_reset_token,
    create_email_verification_token,
    decode_token,
    decode_email_verification_token,
    decode_password_reset_token,
    hash_password,
    verify_password,
)
from ..schemas.auth import DeleteAccountIn, ForgotPasswordIn, MessageOut, RegisterIn, ResetPasswordIn, LoginOut, UserOut, VerifyEmailIn
from ..services.auth_service import get_user_by_email, create_user, authenticate
from ..services.email_service import send_email_verification, send_password_reset_email
from ..models.user import User
from ..models.expense import Expense
from ..services.receipt_storage import delete_receipt
from ..services.rate_limit_service import enforce_rate_limit
from .deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=UserOut)
def register(payload: RegisterIn, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, db, "register", 5, 3600, payload.email)
    if get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = create_user(db, payload.name, payload.email, payload.password)
    return UserOut(id=user.id, email=user.email, name=user.name)

@router.post("/login", response_model=LoginOut)
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    enforce_rate_limit(request, db, "login", 10, 900, form.username)
    user = authenticate(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    token = create_access_token(str(user.id), user.password_hash)
    return LoginOut(user=UserOut(id=user.id, email=user.email, name=user.name), access_token=token)


@router.post("/verify-email", response_model=MessageOut)
def verify_email(payload: VerifyEmailIn, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, db, "verify-email", 10, 3600)
    try:
        user_id, email = decode_email_verification_token(payload.token)
    except Exception as exc:
        raise HTTPException(400, "Link verifikasi tidak valid atau sudah kedaluwarsa") from exc
    user = db.query(User).filter(User.id == user_id, User.email == email).first()
    if not user:
        raise HTTPException(400, "Akun tidak ditemukan")
    user.email_verified = True
    db.commit()
    return MessageOut(message="Email berhasil diverifikasi. Silakan login.")


@router.post("/resend-verification", response_model=MessageOut)
def resend_verification(payload: ForgotPasswordIn, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, db, "resend-verification", 3, 3600, payload.email)
    user = get_user_by_email(db, payload.email)
    if user and not user.email_verified and settings.SMTP_HOST:
        try:
            send_email_verification(user.email, create_email_verification_token(user.id, user.email))
        except Exception:
            logger.exception("Failed to resend verification email")
    return MessageOut(message="Jika akun belum terverifikasi, email verifikasi telah dikirim ulang.")

@router.get("/me", response_model=UserOut)
def me(current_user=Depends(get_current_user)):
    return UserOut(id=current_user.id, email=current_user.email, name=current_user.name)


@router.delete("/account")
def delete_account(payload: DeleteAccountIn, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Password tidak sesuai")
    receipt_references = [row.receipt_path for row in db.query(Expense).filter(Expense.user_id == current_user.id).all() if row.receipt_path]
    for reference in receipt_references:
        try:
            delete_receipt(reference)
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail="File struk gagal dihapus. Silakan coba lagi.") from exc
    db.delete(current_user)
    db.commit()
    return {"ok": True}

@router.post("/forgot-password", response_model=MessageOut)
def forgot_password(payload: ForgotPasswordIn, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, db, "forgot-password", 3, 3600, payload.email)
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
def reset_password(payload: ResetPasswordIn, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, db, "reset-password", 5, 3600)
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
