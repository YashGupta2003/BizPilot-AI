"""
Proposal Win Rate Optimizer — API routes.

POST /api/winrate/proposals/log      → log a proposal outcome (won/lost)
GET  /api/winrate/insights           → full win rate analytics
POST /api/winrate/predict            → predict win probability for new proposal
GET  /api/winrate/proposals          → list all logged proposals
DELETE /api/winrate/proposals/{id}   → delete a proposal record
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list
from app.services.winrate_service import (
    get_win_rate_insights, predict_win_probability,
    _classify_client_type, _get_price_range
)

router = APIRouter(prefix="/api/winrate", tags=["Proposal Win Rate"])


class LogProposalRequest(BaseModel):
    service_type: str
    amount: float
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    client_type: Optional[str] = None
    outcome: str                    # "won" | "lost" | "pending"
    days_to_close: Optional[int] = None
    win_factors: Optional[List[str]] = []
    loss_reasons: Optional[List[str]] = []
    notes: Optional[str] = ""
    invoice_id: Optional[str] = None  # SYNC: link to existing invoice


class PredictWinRequest(BaseModel):
    service_type: str
    amount: float
    client_type: str = "Unknown"
    client_id: Optional[str] = None


@router.post("/proposals/log")
async def log_proposal(
    payload: LogProposalRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Logs a proposal outcome. SYNC: resolves client details
    from clients collection and psychographic profile.
    """
    owner_id = current_user["_id"]
    client_name = payload.client_name or "Unknown"
    client_type = payload.client_type or "Unknown"

    # Verify invoice if provided
    inv_id_obj = None
    if payload.invoice_id:
        try:
            inv_id_obj = ObjectId(payload.invoice_id)
        except (InvalidId, Exception):
            raise HTTPException(status_code=400, detail="Invalid ID format")
        inv_doc = await db.invoices.find_one({"_id": inv_id_obj, "owner_id": owner_id})
        if not inv_doc:
            raise HTTPException(status_code=404, detail="Invoice not found")

    client_id_obj = None
    # SYNC: auto-fill client info from clients + profiles collections
    if payload.client_id:
        try:
            client_id_obj = ObjectId(payload.client_id)
        except (InvalidId, Exception):
            raise HTTPException(status_code=400, detail="Invalid ID format")
        
        client_doc = await db.clients.find_one({
            "_id": client_id_obj, "owner_id": owner_id
        })
        if client_doc:
            client_name = client_doc.get("name", client_name)
            profile = await db.client_profiles.find_one(
                {"client_id": client_doc["_id"], "owner_id": owner_id},
                sort=[("analyzed_at", -1)],
            )
            client_type = _classify_client_type(client_doc, dict(profile) if profile else None)

    record = {
        "owner_id": owner_id,
        "client_id": client_id_obj,
        "client_name": client_name,
        "client_type": client_type,
        "service_type": payload.service_type,
        "amount": payload.amount,
        "price_range": _get_price_range(payload.amount),
        "outcome": payload.outcome,
        "days_to_close": payload.days_to_close,
        "win_factors": payload.win_factors or [],
        "loss_reasons": payload.loss_reasons or [],
        "notes": payload.notes or "",
        "invoice_id": inv_id_obj,
        "created_at": datetime.utcnow(),
    }

    result = await db.proposals.insert_one(record)
    record["_id"] = result.inserted_id
    return serialize_doc(record)


@router.get("/insights")
async def get_insights(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Full win rate analytics — the complete ML insights dashboard."""
    try:
        insights = await get_win_rate_insights(db, current_user["_id"])
        return insights
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/predict")
async def predict_win(
    payload: PredictWinRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Predicts win probability for a new proposal.
    SYNC: if client_id given, auto-detects client type from
    clients + profiles collections.
    """
    client_type = payload.client_type

    if payload.client_id:
        try:
            client_id_obj = ObjectId(payload.client_id)
        except (InvalidId, Exception):
            raise HTTPException(status_code=400, detail="Invalid ID format")

        try:
            client_doc = await db.clients.find_one({
                "_id": client_id_obj,
                "owner_id": current_user["_id"],
            })
            if client_doc:
                profile = await db.client_profiles.find_one(
                    {"client_id": client_doc["_id"], "owner_id": current_user["_id"]},
                    sort=[("analyzed_at", -1)],
                )
                client_type = _classify_client_type(
                    client_doc, dict(profile) if profile else None
                )
        except Exception:
            pass

    try:
        prediction = await predict_win_probability(
            db, current_user["_id"],
            payload.service_type, payload.amount, client_type,
        )
        prediction["client_type_used"] = client_type
        return prediction
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/proposals")
async def list_proposals(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    cursor = db.proposals.find(
        {"owner_id": current_user["_id"]}
    ).sort("created_at", -1)
    records = await cursor.to_list(length=500)
    return serialize_list(records)


@router.delete("/proposals/{proposal_id}")
async def delete_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    try:
        pid = ObjectId(proposal_id)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    result = await db.proposals.delete_one({
        "_id": pid,
        "owner_id": current_user["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found.")
    return {"message": "Proposal deleted."}