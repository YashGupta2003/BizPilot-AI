"""
Dashboard route — pulls everything together using MongoDB's aggregation framework.

CONCEPT: Aggregation pipelines are MongoDB's version of SQL's GROUP BY + SUM + JOIN,
but expressed as a sequence of stages. This is one of the most powerful and
most-asked-about MongoDB features in interviews.
"""
from fastapi import APIRouter, Depends
from app.core.database import get_database
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def get_dashboard_summary(current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    owner_id = current_user["_id"]

    # Pipeline: match this user's invoices, then group by status, summing totals
    pipeline = [
        {"$match": {"owner_id": owner_id}},
        {"$group": {"_id": "$status", "total": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]
    status_breakdown = await db.invoices.aggregate(pipeline).to_list(length=20)

    totals = {row["_id"]: {"total": row["total"], "count": row["count"]} for row in status_breakdown}

    total_earned = totals.get("paid", {}).get("total", 0)
    total_pending = sum(totals.get(s, {}).get("total", 0) for s in ["sent", "overdue", "draft"])
    total_overdue = totals.get("overdue", {}).get("total", 0)

    total_clients = await db.clients.count_documents({"owner_id": owner_id})
    total_invoices = await db.invoices.count_documents({"owner_id": owner_id})

    # Top 5 clients by total invoiced amount — another aggregation pipeline
    top_clients_pipeline = [
        {"$match": {"owner_id": owner_id}},
        {"$group": {"_id": "$client_id", "client_name": {"$first": "$client_name"}, "total": {"$sum": "$total"}}},
        {"$sort": {"total": -1}},
        {"$limit": 5}
    ]
    top_clients_raw = await db.invoices.aggregate(top_clients_pipeline).to_list(length=5)
    top_clients = [{"name": c["client_name"], "total": c["total"]} for c in top_clients_raw]

    return {
        "total_earned": total_earned,
        "total_pending": total_pending,
        "total_overdue": total_overdue,
        "total_clients": total_clients,
        "total_invoices": total_invoices,
        "status_breakdown": totals,
        "top_clients": top_clients,
    }
