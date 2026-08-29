from pydantic import BaseModel, EmailStr, Field, field_validator


def validate_password(value: str):
    if len(value.encode("utf-8")) > 72:
        raise ValueError(
            "Password terlalu panjang (maks 72 bytes). "
            "Hindari password terlalu panjang atau emoji."
        )
    return value


class RegisterIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6)

    @field_validator("password")
    @classmethod
    def password_max_72_bytes(cls, v: str):
        return validate_password(v)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)

    @field_validator("password")
    @classmethod
    def password_max_72_bytes(cls, value: str):
        return validate_password(value)


class MessageOut(BaseModel):
    message: str
    reset_url: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str


class LoginOut(BaseModel):
    user: UserOut
    access_token: str
    token_type: str = "bearer"
