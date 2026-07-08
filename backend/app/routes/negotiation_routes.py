from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc
from app.schemas.negotiation_schema import StartSessionRequest, SendMessageRequest
from app.agents.negotiation_agent import (
    CLIENT_SCENARIOS, get_scenario,
    get_client_response, get_coach_feedback,
    score_negotiation,
)

router = APIRouter(prefix="/api/negotiate", tags=["Negotiation Simulator"])

MAX_TURNS = 12


@router.get("/scenarios")
async def list_scenarios(current_user: dict = Depends(get_current_user)):
    return {"scenarios": CLIENT_SCENARIOS}


@router.post("/start")
async def start_session(
    payload: StartSessionRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    scenario = get_scenario(payload.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{payload.scenario_id}' not found.")

    now = datetime.utcnow().isoformat()
    system_message = {
        "role": "system",
        "content": (
            f"Practice session started! You are negotiating with: {scenario['name']}.\n"
            f"Your service: {payload.service_type} | Your rate: {payload.currency} {payload.asking_rate:,.0f}\n"
            f"Difficulty: {scenario['difficulty'].upper()} | Tactics: {', '.join(scenario['tactics'])}\n"
            "Type your response to begin the negotiation."
        ),
        "timestamp": now,
        "coach_triggered": False,
    }
    opening_message = {
        "role": "client",
        "content": scenario["opening_line"],
        "timestamp": now,
        "coach_triggered": False,
    }

    session_doc = {
        "owner_id": current_user["_id"],
        "scenario_id": payload.scenario_id,
        "scenario_name": scenario["name"],
        "scenario_difficulty": scenario["difficulty"],
        "service_type": payload.service_type,
        "asking_rate": payload.asking_rate,
        "currency": payload.currency,
        "status": "active",
        "messages": [system_message, opening_message],
        "turn_count": 0,
        "score": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.negotiation_sessions.insert_one(session_doc)
    session_doc["_id"] = result.inserted_id
    return serialize_doc(session_doc)


@router.post("/message")
async def send_message(
    payload: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    session = await db.negotiation_sessions.find_one({
        "_id": ObjectId(payload.session_id),
        "owner_id": current_user["_id"],
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session["status"] != "active":
        raise HTTPException(status_code=400, detail="This session has already ended.")

    scenario = get_scenario(session["scenario_id"])
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    now = datetime.utcnow().isoformat()
    new_messages = []

    freelancer_msg = {
        "role": "freelancer", "content": payload.message,
        "timestamp": now, "coach_triggered": False,
    }
    new_messages.append(freelancer_msg)

    existing_messages = session.get("messages", [])
    coach_tip = await get_coach_feedback(payload.message, existing_messages)
    if coach_tip:
        new_messages.append({
            "role": "coach", "content": coach_tip,
            "timestamp": now, "coach_triggered": True,
        })

    all_messages_so_far = existing_messages + new_messages
    client_response = await get_client_response(
        scenario, session["service_type"],
        session["asking_rate"], session["currency"],
        all_messages_so_far,
    )
    new_messages.append({
        "role": "client", "content": client_response,
        "timestamp": now, "coach_triggered": False,
    })

    new_turn_count = session["turn_count"] + 1
    updated_messages = existing_messages + new_messages
    new_status = "active"
    score = None

    if new_turn_count >= MAX_TURNS:
        new_status = "completed"
        score = await score_negotiation(updated_messages, scenario, session["asking_rate"])
        new_messages.append({
            "role": "system",
            "content": f"Session ended after {MAX_TURNS} rounds. See your score below!",
            "timestamp": now, "coach_triggered": False,
        })

    update_data = {
        "messages": updated_messages,
        "turn_count": new_turn_count,
        "status": new_status,
        "updated_at": datetime.utcnow(),
    }
    if score:
        update_data["score"] = score

    await db.negotiation_sessions.update_one(
        {"_id": ObjectId(payload.session_id)},
        {"$set": update_data},
    )

    return {
        "new_messages": new_messages,
        "turn_count": new_turn_count,
        "status": new_status,
        "score": score,
        "turns_remaining": max(0, MAX_TURNS - new_turn_count),
    }


@router.post("/end/{session_id}")
async def end_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    session = await db.negotiation_sessions.find_one({
        "_id": ObjectId(session_id),
        "owner_id": current_user["_id"],
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session["status"] == "completed":
        return serialize_doc(session)

    scenario = get_scenario(session["scenario_id"])
    messages = session.get("messages", [])
    score = await score_negotiation(messages, scenario, session["asking_rate"])

    await db.negotiation_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"status": "completed", "score": score, "updated_at": datetime.utcnow()}},
    )
    session["status"] = "completed"
    session["score"] = score
    return serialize_doc(session)


@router.get("/sessions")
async def list_sessions(current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    cursor = db.negotiation_sessions.find(
        {"owner_id": current_user["_id"]}
    ).sort("created_at", -1)
    sessions = await cursor.to_list(length=50)
    return [
        {
            "id": str(s["_id"]),
            "scenario_name": s.get("scenario_name", ""),
            "scenario_difficulty": s.get("scenario_difficulty", ""),
            "service_type": s.get("service_type", ""),
            "asking_rate": s.get("asking_rate", 0),
            "currency": s.get("currency", "INR"),
            "status": s.get("status", ""),
            "turn_count": s.get("turn_count", 0),
            "score": s.get("score"),
            "created_at": s.get("created_at", "").isoformat() if s.get("created_at") else "",
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    session = await db.negotiation_sessions.find_one({
        "_id": ObjectId(session_id),
        "owner_id": current_user["_id"],
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return serialize_doc(session)