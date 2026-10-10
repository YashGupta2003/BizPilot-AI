"""
AI Psychographic Client Profiler — API routes.

POST /api/profiler/analyze          -> analyze client text, return profile
GET  /api/profiler/history          -> list past profiles for this user
GET  /api/profiler/history/{id}     -> get one saved profile
DELETE /api/profiler/history/{id}   -> delete a saved profile
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime

from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list
from app.schemas.profiler_schema import ProfileClientRequest
from app.agents.profiler_agent import analyze_client_profile, ProfilerError

router = APIRouter(prefix="/api/profiler", tags=["Client Profiler"])


@router.post("/analyze")
async def analyze_client(
    payload: ProfileClientRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Analyzes client text and returns a psychographic profile.
    Also saves the result to MongoDB so the user can review it later.
    """
    if len(payload.client_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Please provide more text to analyze (at least a sentence).")

    try:
        profile = await analyze_client_profile(payload.client_text)
    except ProfilerError as exc:
        raise HTTPException(status_code=502, detail="Internal server error")

    client_id_obj = None
    if payload.client_id:
        try:
            client_id_obj = ObjectId(payload.client_id)
        except (InvalidId, Exception):
            raise HTTPException(status_code=400, detail="Invalid ID format")
        client_doc = await db.clients.find_one({"_id": client_id_obj, "owner_id": current_user["_id"]})
        if not client_doc:
            raise HTTPException(status_code=404, detail="Client not found")

    # Save to DB for history
    record = {
        "owner_id": current_user["_id"],
        "client_text": payload.client_text[:2000],  # cap stored text length
        "client_id": client_id_obj,
        "profile": profile,
        "analyzed_at": datetime.utcnow(),
    }
    result = await db.client_profiles.insert_one(record)
    record["_id"] = result.inserted_id

    return {**serialize_doc(record), **profile}


@router.get("/history")
async def get_profile_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    cursor = db.client_profiles.find(
        {"owner_id": current_user["_id"]}
    ).sort("analyzed_at", -1)
    records = await cursor.to_list(length=100)
    return serialize_list(records)


@router.get("/history/{profile_id}")
async def get_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    try:
        pid = ObjectId(profile_id)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    record = await db.client_profiles.find_one({
        "_id": pid,
        "owner_id": current_user["_id"],
    })
    if not record:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return serialize_doc(record)


@router.delete("/history/{profile_id}")
async def delete_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    try:
        pid = ObjectId(profile_id)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.client_profiles.delete_one({
        "_id": pid,
        "owner_id": current_user["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return {"message": "Profile deleted."}