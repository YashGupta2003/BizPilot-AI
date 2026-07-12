from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list
from app.agents.contract_agent import generate_contract, ContractError

router = APIRouter(prefix="/api/contracts", tags=["Contract Generator"])


class GenerateContractRequest(BaseModel):
    project_type: str
    client_name: str
    amount: float
    currency: str = "INR"
    duration_weeks: int = 4
    milestones: int = 2
    client_country: str = "India"
    project_description: str = ""
    special_requirements: str = ""
    client_id: Optional[str] = None  # sync with existing client


@router.post("/generate")
async def generate_new_contract(
    payload: GenerateContractRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Generates a complete AI-powered freelance contract.
    SYNC: auto-fills freelancer name from user profile,
          links to client record if client_id provided.
    """
    freelancer_name = current_user.get("name", "Freelancer")
    client_name = payload.client_name

    # SYNC with clients collection — auto-fill client name if client_id given
    if payload.client_id:
        client_doc = await db.clients.find_one({"_id": ObjectId(payload.client_id)})
        if client_doc:
            client_name = client_doc.get("name", payload.client_name)

    try:
        contract_data = await generate_contract(
            project_type=payload.project_type,
            client_name=client_name,
            freelancer_name=freelancer_name,
            amount=payload.amount,
            currency=payload.currency,
            duration_weeks=payload.duration_weeks,
            milestones=payload.milestones,
            client_country=payload.client_country,
            project_description=payload.project_description,
            special_requirements=payload.special_requirements,
        )
    except ContractError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    record = {
        "owner_id": current_user["_id"],
        "client_id": ObjectId(payload.client_id) if payload.client_id else None,
        "client_name": client_name,
        "project_type": payload.project_type,
        "amount": payload.amount,
        "currency": payload.currency,
        "duration_weeks": payload.duration_weeks,
        "milestones": payload.milestones,
        "client_country": payload.client_country,
        "contract": contract_data,
        "status": "draft",
        "created_at": datetime.utcnow(),
    }

    result = await db.contracts.insert_one(record)
    record["_id"] = result.inserted_id
    return serialize_doc(record)


@router.get("/list")
async def list_contracts(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    cursor = db.contracts.find({"owner_id": current_user["_id"]}).sort("created_at", -1)
    records = await cursor.to_list(length=100)
    return serialize_list(records)


@router.get("/{contract_id}")
async def get_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    record = await db.contracts.find_one({
        "_id": ObjectId(contract_id),
        "owner_id": current_user["_id"],
    })
    if not record:
        raise HTTPException(status_code=404, detail="Contract not found.")
    return serialize_doc(record)


@router.delete("/{contract_id}")
async def delete_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    result = await db.contracts.delete_one({
        "_id": ObjectId(contract_id),
        "owner_id": current_user["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found.")
    return {"message": "Contract deleted."}