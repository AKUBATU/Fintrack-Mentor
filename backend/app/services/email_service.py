from email.message import EmailMessage
import logging
import smtplib

from ..core.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(recipient: str, token: str) -> bool:
    if not settings.SMTP_HOST:
        logger.warning("Password reset email skipped: SMTP_HOST is not configured")
        return False

    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
    message = EmailMessage()
    message["Subject"] = "Reset password FinTrack Mentor"
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = recipient
    message.set_content(
        "Kami menerima permintaan reset password akun FinTrack Mentor Anda.\n\n"
        f"Buka link berikut untuk membuat password baru:\n{reset_url}\n\n"
        f"Link berlaku selama {settings.PASSWORD_RESET_EXPIRE_MINUTES} menit. "
        "Abaikan email ini jika Anda tidak meminta reset password."
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USERNAME:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
        server.send_message(message)
    return True
