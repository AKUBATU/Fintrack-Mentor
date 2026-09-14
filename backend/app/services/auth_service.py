from sqlalchemy.orm import Session
from ..models.user import User
from ..core.security import hash_password, verify_password
from ..core.config import settings

def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.strip().lower()).first()

def create_user(db: Session, name: str, email: str, password: str) -> User:
    user = User(
        name=" ".join(name.split()), email=email.strip().lower(), password_hash=hash_password(password),
        email_verified=not bool(settings.SMTP_HOST),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
