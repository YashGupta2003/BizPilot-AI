from app.core.exceptions import parse_object_id
"""
Project Scope Drift Detector — API routes.

POST /api/scope/projects              → create a new tracked project with locked scope
GET  /api/scope/projects              → list all tracked projects
GET  /api/scope/projects/{id}         → get one project with full drift history
POST /api/scope/projects/{id}/check   → run a drift check (paste current tasks)
POST /api/scope/projects/{id}/lock    → re-lock scope from meeting/contract data
DELETE /api/scope/projects/{id}       → delete project

SYNC: auto-fills scope from meetings + contracts collections
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list
from app.agents.scope_agent import (
    extract_scope_from_text,
    detect_scope_drift,
    generate_change_order_email,
)

router = APIRouter(prefix="/api/scope", tags=["Scope Drift Detector"])


class CreateProjectRequest(BaseModel):
    project_name: str
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    hourly_rate: float = 1500
    scope_text: Optional[str] = None       # manual scope text
    meeting_id: Optional[str] = None       # SYNC: auto-fill from meeting notes
    contract_id: Optional[str] = None      # SYNC: auto-fill from contract


class DriftCheckRequest(BaseModel):
    current_input: str   # current tasks / client messages to check against scope


class UpdateScopeRequest(BaseModel):
    scope_text: str


@router.post("/projects")
async def create_project(
    payload: CreateProjectRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Creates a new scope-tracked project.
    SYNC: auto-fills scope from meetings OR contracts collections.
    """
    owner_id = current_user["_id"]
    scope_text = payload.scope_text or ""
    client_name = payload.client_name or "Client"
    hourly_rate = payload.hourly_rate

    # SYNC with clients collection
    if payload.client_id:
        client_doc = await db.clients.find_one({
            "_id": parse_object_id(payload.client_id), "owner_id": owner_id
        })
        if client_doc:
            client_name = client_doc.get("name", client_name)
            # Use client's default rate if not specified
            if payload.hourly_rate == 1500 and client_doc.get("default_rate"):
                hourly_rate = client_doc["default_rate"]

    # SYNC: auto-fill scope from meeting notes
    if payload.meeting_id and not scope_text:
        meeting = await db.meetings.find_one({
            "_id": parse_object_id(payload.meeting_id), "owner_id": owner_id
        })
        if meeting:
            extracted = meeting.get("extracted", {})
            deliverables = extracted.get("deliverables", [])
            things_not_included = extracted.get("things_not_included", [])
            scope_text = f"Project: {extracted.get('project_name', payload.project_name)}\n"
            scope_text += "Deliverables:\n"
            for d in deliverables:
                scope_text += f"- {d.get('item', '')}: {d.get('description', '')}\n"
            if things_not_included:
                scope_text += "\nNOT included:\n"
                for t in things_not_included:
                    scope_text += f"- {t}\n"
            scope_text += f"\nRevisions: {extracted.get('revision_count', 2)} rounds\n"
            scope_text += f"Total price: {extracted.get('currency', 'INR')} {extracted.get('total_price_agreed', '')}\n"

    # SYNC: auto-fill scope from contract
    if payload.contract_id and not scope_text:
        contract = await db.contracts.find_one({
            "_id": parse_object_id(payload.contract_id), "owner_id": owner_id
        })
        if contract:
            c = contract.get("contract", {})
            scope_text = f"Project: {c.get('contract_title', payload.project_name)}\n"
            scope_text += f"Scope: {c.get('scope_section', '')}\n"
            scope_text += f"Revisions: {c.get('revisions_section', '')}\n"
            scope_text += f"Payment: {c.get('payment_section', '')}\n"

    # Extract structured scope using AI
    locked_scope = {}
    if scope_text.strip():
        locked_scope = await extract_scope_from_text(scope_text)

    doc = {
        "owner_id": owner_id,
        "project_name": payload.project_name,
        "client_id": parse_object_id(payload.client_id) if payload.client_id else None,
        "client_name": client_name,
        "hourly_rate": hourly_rate,
        "scope_text": scope_text,
        "locked_scope": locked_scope,
        "meeting_id": parse_object_id(payload.meeting_id) if payload.meeting_id else None,
        "contract_id": parse_object_id(payload.contract_id) if payload.contract_id else None,
        "drift_checks": [],           # history of all drift checks
        "total_drift_value": 0,       # accumulated extra value detected
        "status": "active",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.scope_projects.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("/projects")
async def list_projects(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    cursor = db.scope_projects.find(
        {"owner_id": current_user["_id"]}
    ).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return serialize_list(docs)


@router.get("/projects/{project_id}")
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    doc = await db.scope_projects.find_one({
        "_id": parse_object_id(project_id),
        "owner_id": current_user["_id"],
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found.")
    return serialize_doc(doc)


@router.post("/projects/{project_id}/check")
async def check_drift(
    project_id: str,
    payload: DriftCheckRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    THE CORE PIPELINE:
    1. Load locked scope for this project
    2. Run AI drift detection against current input
    3. Generate change order email if drift found
    4. Save check result to drift_checks history
    5. Update total_drift_value accumulator
    """
    doc = await db.scope_projects.find_one({
        "_id": parse_object_id(project_id),
        "owner_id": current_user["_id"],
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found.")

    locked_scope = doc.get("locked_scope", {})
    hourly_rate = doc.get("hourly_rate", 1500)

    # Run drift detection
    drift_result = await detect_scope_drift(
        locked_scope=locked_scope,
        current_input=payload.current_input,
        hourly_rate=hourly_rate,
    )

    # Generate change order email if drift detected
    change_order = None
    if drift_result.get("drift_detected") and drift_result.get("drift_items"):
        freelancer_name = current_user.get("name", "Freelancer")
        change_order = await generate_change_order_email(
            drift_data=drift_result,
            locked_scope=locked_scope,
            client_name=doc.get("client_name", "Client"),
            freelancer_name=freelancer_name,
            project_name=doc.get("project_name", "Project"),
        )

    # Save check record
    check_record = {
        "checked_at": datetime.utcnow().isoformat(),
        "input_text": payload.current_input[:1000],
        "drift_detected": drift_result.get("drift_detected", False),
        "drift_items_count": len(drift_result.get("drift_items", [])),
        "total_extra_value": drift_result.get("total_extra_value", 0),
        "drift_result": drift_result,
        "change_order": change_order,
    }

    # Accumulate total drift value
    new_total = doc.get("total_drift_value", 0) + drift_result.get("total_extra_value", 0)

    await db.scope_projects.update_one(
        {"_id": parse_object_id(project_id)},
        {
            "$push": {"drift_checks": check_record},
            "$set": {
                "total_drift_value": new_total,
                "updated_at": datetime.utcnow(),
            },
        },
    )

    return {
        "drift_result": drift_result,
        "change_order": change_order,
        "total_drift_value_accumulated": new_total,
    }


@router.post("/projects/{project_id}/lock")
async def update_scope(
    project_id: str,
    payload: UpdateScopeRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Re-locks the scope with new text (e.g. after a scope change is approved)."""
    doc = await db.scope_projects.find_one({
        "_id": parse_object_id(project_id),
        "owner_id": current_user["_id"],
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found.")

    new_locked_scope = await extract_scope_from_text(payload.scope_text)

    await db.scope_projects.update_one(
        {"_id": parse_object_id(project_id)},
        {"$set": {
            "scope_text": payload.scope_text,
            "locked_scope": new_locked_scope,
            "updated_at": datetime.utcnow(),
        }},
    )

    return {"locked_scope": new_locked_scope, "message": "Scope re-locked successfully."}


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    result = await db.scope_projects.delete_one({
        "_id": parse_object_id(project_id),
        "owner_id": current_user["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found.")
    return {"message": "Project deleted."}