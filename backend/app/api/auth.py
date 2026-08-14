from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import create_access_token
from ..schemas.auth import RegisterIn, LoginOut, UserOut, TokenOut
from ..services.auth_service import get_user_by_email, create_user, authenticate
from .deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

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
    token = create_access_token(str(user.id))
    return LoginOut(user=UserOut(id=user.id, email=user.email, name=user.name), access_token=token)

@router.get("/me", response_model=UserOut)
def me(current_user=Depends(get_current_user)):
    return UserOut(id=current_user.id, email=current_user.email, name=current_user.name)
