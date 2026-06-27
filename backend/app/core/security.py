"""
Security utilities: password hashing + JWT tokens.

CONCEPT: Never store plain text passwords in MongoDB. We hash them with bcrypt.
JWT (JSON Web Token) is how the user stays "logged in" — after login, the server
gives the frontend a signed token. The frontend sends it back on every request,
and we verify the signature instead of re-checking the password every time.
"""
from datetime import datetime, timedelta
import bcrypt
from jose import jwt, JWTError
from app.core.config import settings


def hash_password(password: str) -> str:
    # bcrypt works on bytes, and has a hard 72-byte limit on input length
    password_bytes = password.encode("utf-8")[:72]
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


def create_access_token(data: dict) -> str:
    """
    data usually looks like {"sub": user_id}
    'sub' (subject) is the JWT-standard field for "who this token belongs to"
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None