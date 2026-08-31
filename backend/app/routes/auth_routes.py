"""
Auth routes — your first real MongoDB CRUD operations.

CONCEPT — MongoDB operations used here:
- db.users.find_one({"email": ...})   → find ONE document matching a filter
- db.users.insert_one({...})          → insert a new document, returns inserted_id
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime

from app.core.database import get_database
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user
from app.schemas.auth_schema import UserSignup, UserLogin, Token, UserOut
from app.models.serializers import serialize_doc

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserSignup, response: Response, db=Depends(get_database)):
    # Check if email already exists — find_one returns None if nothing matches
    existing_user = await db.users.find_one({"email": payload.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "business_name": payload.business_name,
        "created_at": datetime.utcnow(),
    }

    # insert_one returns a result object; .inserted_id is the new document's _id
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token({"sub": str(result.inserted_id)})
    user_out = serialize_doc(user_doc)

    response.set_cookie(
        key="bizpilot_token",
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=86400 * 7 # 7 days
    )

    return {
        "id": user_out["id"],
        "name": user_out["name"],
        "email": user_out["email"],
        "business_name": user_out["business_name"],
    }


@router.post("/login", response_model=UserOut)
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_database)):
    # OAuth2PasswordRequestForm gives us form_data.username (we treat it as email) + form_data.password
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": str(user["_id"])})
    user_out = serialize_doc(user)

    response.set_cookie(
        key="bizpilot_token",
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=86400 * 7 # 7 days
    )

    return {
        "id": user_out["id"],
        "name": user_out["name"],
        "email": user_out["email"],
        "business_name": user_out["business_name"],
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="bizpilot_token",
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax"
    )
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_out = serialize_doc(current_user)
    return {
        "id": user_out["id"],
        "name": user_out["name"],
        "email": user_out["email"],
        "business_name": user_out["business_name"],
    }
