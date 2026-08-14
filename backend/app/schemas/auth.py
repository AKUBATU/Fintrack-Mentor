from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6)

    @field_validator("password")
    @classmethod
    def password_max_72_bytes(cls, v: str):
        # bcrypt limit = 72 bytes (UTF-8)
        if len(v.encode("utf-8")) > 72:
            raise ValueError(
                "Password terlalu panjang (maks 72 bytes). "
                "Hindari password terlalu panjang atau emoji."
            )
        return v


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
