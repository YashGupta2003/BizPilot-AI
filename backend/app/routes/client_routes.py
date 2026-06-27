"""
Client management routes.

CONCEPT — more MongoDB operations:
- db.clients.find({"owner_id": ...})        → find MANY documents, returns a cursor
- cursor.to_list(length=100)                → convert cursor to an actual Python list
- db.clients.find_one_and_update(...)       → update and return the updated doc in one call
- db.clients.delete_one({...})              → delete a document
- db.invoices.aggregate([...])              → MongoDB's powerful analytics pipeline
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId

from app.core.database import get_database
from app.core.deps import get_current_user
from app.schemas.client_schema import ClientCreate, ClientUpdate, ClientOut
from app.models.serializers import serialize_doc, serialize_list

router = APIRouter(prefix="/api/clients", tags=["Clients"])


def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid ID format")


@router.post("", response_model=dict)
async def create_client(payload: ClientCreate, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    client_doc = payload.model_dump()
    client_doc["owner_id"] = current_user["_id"]  # ties this client to the logged-in user

    result = await db.clients.insert_one(client_doc)
    client_doc["_id"] = result.inserted_id
    return serialize_doc(client_doc)


@router.get("", response_model=list)
async def list_clients(current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    # find() returns a cursor (lazy iterator) — to_list() actually fetches the documents
    cursor = db.clients.find({"owner_id": current_user["_id"]})
    clients = await cursor.to_list(length=500)

    # For each client, compute totals from their invoices using an aggregation pipeline.
    # CONCEPT: an aggregation pipeline is a list of stages MongoDB runs in sequence,
    # similar to chaining .filter().groupBy().sum() in pandas.
    enriched = []
    for client in clients:
        pipeline = [
            {"$match": {"client_id": client["_id"]}},
            {"$group": {
                "_id": "$status",
                "total": {"$sum": "$total"}
            }}
        ]
        agg_result = await db.invoices.aggregate(pipeline).to_list(length=20)

        total_invoiced = sum(r["total"] for r in agg_result)
        total_paid = sum(r["total"] for r in agg_result if r["_id"] == "paid")
        total_pending = sum(r["total"] for r in agg_result if r["_id"] in ("sent", "overdue", "draft"))

        client_out = serialize_doc(client)
        client_out["total_invoiced"] = total_invoiced
        client_out["total_paid"] = total_paid
        client_out["total_pending"] = total_pending
        enriched.append(client_out)

    return enriched


@router.get("/{client_id}", response_model=dict)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    client = await db.clients.find_one({"_id": to_object_id(client_id), "owner_id": current_user["_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return serialize_doc(client)


@router.put("/{client_id}", response_model=dict)
async def update_client(client_id: str, payload: ClientUpdate, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # find_one_and_update does the update AND returns the new document — saves a second query
    updated = await db.clients.find_one_and_update(
        {"_id": to_object_id(client_id), "owner_id": current_user["_id"]},
        {"$set": update_data},
        return_document=True
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Client not found")
    return serialize_doc(updated)


@router.delete("/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    result = await db.clients.delete_one({"_id": to_object_id(client_id), "owner_id": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}
