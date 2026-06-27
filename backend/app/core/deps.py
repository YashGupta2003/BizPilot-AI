"""
FastAPI dependency that protects routes.

CONCEPT: Add `current_user: dict = Depends(get_current_user)` to any route,
and FastAPI will automatically run this function first. If the token is
missing/invalid, the user gets a 401 error before your route code even runs.
"""
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from bson import ObjectId
from app.core.security import decode_access_token
from app.core.database import get_database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


async def _resolve_user_from_token(token: str | None, db) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception

    return user


async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_database)) -> dict:
    """Standard auth: reads the token from the Authorization: Bearer header."""
    return await _resolve_user_from_token(token, db)


async def get_current_user_from_header_or_query(
    header_token: Optional[str] = Depends(oauth2_scheme),
    query_token: Optional[str] = Query(None, alias="token"),
    db=Depends(get_database),
) -> dict:
    """
    Auth for direct-link downloads (e.g. PDF). A plain <a href> click can't
    attach a custom header, so for these specific routes we also accept
    ?token=... in the URL as a fallback.
    """
    token = header_token or query_token
    return await _resolve_user_from_token(token, db)