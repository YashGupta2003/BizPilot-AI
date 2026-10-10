"""
FastAPI dependency that protects routes.

CONCEPT: Add `current_user: dict = Depends(get_current_user)` to any route,
and FastAPI will automatically run this function first. If the token is
missing/invalid, the user gets a 401 error before your route code even runs.
"""
from fastapi import Depends, HTTPException, status, Query, Request
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
from bson import ObjectId
from bson.errors import InvalidId
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

    token_version = payload.get("token_version", 0)
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    except InvalidId:
        raise credentials_exception
        
    if user is None:
        raise credentials_exception
        
    if user.get("token_version", 0) != token_version:
        raise credentials_exception

    return user


async def get_current_user(request: Request, db=Depends(get_database)) -> dict:
    """Standard auth: reads the token from the Authorization header or HttpOnly cookie."""
    auth_header = request.headers.get("authorization")
    token = None
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
    if not token:
        token = request.cookies.get("bizpilot_token")
    return await _resolve_user_from_token(token, db)


async def get_current_user_or_signed_url(
    request: Request,
    invoice_id: str,
    query_token: Optional[str] = Query(None, alias="token"),
    db=Depends(get_database),
) -> dict:
    from app.core.security import verify_signed_url
    
    # Try signed URL first if token is in query
    if query_token:
        payload = verify_signed_url(query_token, invoice_id)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                try:
                    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
                    if user:
                        return user
                except InvalidId:
                    pass
    
    # Fallback to standard auth
    return await get_current_user(request, db)