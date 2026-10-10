from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta, timezone

from app.core.database import get_database
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, is_common_password
from app.core.deps import get_current_user
from app.schemas.auth_schema import UserSignup, UserLogin, Token, UserOut
from app.models.serializers import serialize_doc

from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def signup(request: Request, payload: UserSignup, response: Response, db=Depends(get_database)):
    payload.email = payload.email.lower().strip()
    
    if is_common_password(payload.password):
        raise HTTPException(status_code=400, detail="Password is too common. Please choose a stronger password.")

    existing_user = await db.users.find_one({"email": payload.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "business_name": payload.business_name,
        "created_at": datetime.now(timezone.utc),
        "token_version": 0,
        "failed_login_attempts": 0,
        "locked_until": None,
        "email_verified": False,
        "verification_token": None
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token({"sub": str(result.inserted_id), "token_version": 0})
    user_out = serialize_doc(user_doc)

    cookie_samesite = getattr(settings, "COOKIE_SAMESITE", "lax")
    cookie_secure = (settings.ENVIRONMENT != "development") or (cookie_samesite.lower() == "none")

    response.set_cookie(
        key="bizpilot_token",
        value=token,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return {
        "id": user_out["id"],
        "name": user_out["name"],
        "email": user_out["email"],
        "business_name": user_out["business_name"],
    }


@router.post("/login", response_model=UserOut)
@limiter.limit("10/minute")
async def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_database)):
    email = form_data.username.lower().strip()
    user = await db.users.find_one({"email": email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    # Check lockout
    now = datetime.now(timezone.utc)
    locked_until = user.get("locked_until")
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
        
    if locked_until and locked_until > now:
        raise HTTPException(status_code=403, detail="Account locked. Try again later.")

    if not verify_password(form_data.password, user["password_hash"]):
        attempts = user.get("failed_login_attempts", 0) + 1
        update_doc = {"failed_login_attempts": attempts}
        if attempts >= 5:
            update_doc["locked_until"] = now + timedelta(minutes=15)
        await db.users.update_one({"_id": user["_id"]}, {"$set": update_doc})
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # Reset attempts on success
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"failed_login_attempts": 0, "locked_until": None}})

    token_version = user.get("token_version", 0)
    token = create_access_token({"sub": str(user["_id"]), "token_version": token_version})
    user_out = serialize_doc(user)

    cookie_samesite = getattr(settings, "COOKIE_SAMESITE", "lax")
    cookie_secure = (settings.ENVIRONMENT != "development") or (cookie_samesite.lower() == "none")

    response.set_cookie(
        key="bizpilot_token",
        value=token,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

    return {
        "id": user_out["id"],
        "name": user_out["name"],
        "email": user_out["email"],
        "business_name": user_out["business_name"],
    }

@router.post("/logout")
async def logout(response: Response):
    cookie_samesite = getattr(settings, "COOKIE_SAMESITE", "lax")
    cookie_secure = (settings.ENVIRONMENT != "development") or (cookie_samesite.lower() == "none")
    
    response.delete_cookie(
        key="bizpilot_token",
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite
    )
    return {"message": "Logged out successfully"}

@router.post("/logout-all")
async def logout_all(
    response: Response, 
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"token_version": 1}}
    )
    
    cookie_samesite = getattr(settings, "COOKIE_SAMESITE", "lax")
    cookie_secure = (settings.ENVIRONMENT != "development") or (cookie_samesite.lower() == "none")
    
    response.delete_cookie(
        key="bizpilot_token",
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite
    )
    return {"message": "Logged out of all sessions successfully"}

@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_out = serialize_doc(current_user)
    return {
        "id": user_out["id"],
        "name": user_out["name"],
        "email": user_out["email"],
        "business_name": user_out["business_name"],
    }
