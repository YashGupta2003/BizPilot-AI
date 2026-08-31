"""
Client 360 — Unified Data Pipeline Route.

This is the integration backbone of BizPilot AI. Instead of each feature
working in isolation, this endpoint aggregates EVERYTHING about one client:
- Their invoices (paid, pending, overdue)
- Their contracts
- Their meeting notes
- Their risk profile (from client profiler)
- Their WhatsApp reminder history
- Their burnout contribution (how much they affect your income stability)
- Recommended next action (AI-generated based on full context)

This is what makes BizPilot a PLATFORM, not just a collection of tools.
One API call. One client. Complete picture.
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timedelta
from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list

router = APIRouter(prefix="/api/client360", tags=["Client 360"])


@router.get("/summary/all")
async def get_all_clients_summary(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Lightweight summary of ALL clients with their health score.
    Used by the Clients page to show which clients need attention.
    """
    owner_id = current_user["_id"]
    cursor = db.clients.find({"owner_id": owner_id})
    clients = await cursor.to_list(length=200)

    summaries = []
    for client in clients:
        client_id = client["_id"]

        # Quick invoice stats
        invoice_pipeline = [
            {"$match": {"client_id": client_id, "owner_id": owner_id}},
            {"$group": {
                "_id": "$status",
                "total": {"$sum": "$total"},
                "count": {"$sum": 1},
            }},
        ]
        inv_stats = await db.invoices.aggregate(invoice_pipeline).to_list(length=10)
        stats_map = {r["_id"]: r for r in inv_stats}

        total_invoiced = sum(r["total"] for r in inv_stats)
        total_paid = stats_map.get("paid", {}).get("total", 0)
        overdue_count = stats_map.get("overdue", {}).get("count", 0)

        # Quick health score
        health = 70
        if overdue_count > 0:
            health -= overdue_count * 15
        if total_paid > 0:
            health += 10
        health = max(0, min(100, health))

        has_contract = await db.contracts.find_one({"client_id": client_id, "owner_id": owner_id}) is not None

        summaries.append({
            "id": str(client["_id"]),
            "name": client.get("name", ""),
            "company": client.get("company", ""),
            "email": client.get("email", ""),
            "total_invoiced": round(total_invoiced, 2),
            "total_paid": round(total_paid, 2),
            "overdue_count": overdue_count,
            "health_score": health,
            "health_label": "Healthy" if health >= 70 else "Caution" if health >= 40 else "At Risk",
            "has_contract": has_contract,
        })

    summaries.sort(key=lambda x: x["total_invoiced"], reverse=True)
    return summaries


@router.get("/{client_id}")
async def get_client_360(
    client_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    THE INTEGRATION ENDPOINT.
    Returns complete 360-degree view of one client across all features.
    """
    owner_id = current_user["_id"]
    try:
        client_obj_id = ObjectId(client_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid client ID.")

    # 1. Base client record
    client = await db.clients.find_one({
        "_id": client_obj_id,
        "owner_id": owner_id,
    })
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    # 2. All invoices for this client
    invoice_cursor = db.invoices.find({
        "client_id": client_obj_id,
        "owner_id": owner_id,
    }).sort("created_at", -1)
    invoices = await invoice_cursor.to_list(length=100)

    # 3. Invoice analytics
    total_invoiced = sum(inv.get("total", 0) for inv in invoices)
    total_paid = sum(inv.get("total", 0) for inv in invoices if inv.get("status") == "paid")
    total_pending = sum(inv.get("total", 0) for inv in invoices if inv.get("status") in ("sent", "draft"))
    total_overdue = sum(inv.get("total", 0) for inv in invoices if inv.get("status") == "overdue")
    paid_invoices = [inv for inv in invoices if inv.get("status") == "paid"]
    overdue_invoices = [inv for inv in invoices if inv.get("status") == "overdue"]

    # 4. Contracts for this client
    contract_cursor = db.contracts.find({
        "client_id": client_obj_id,
        "owner_id": owner_id,
    }).sort("created_at", -1)
    contracts = await contract_cursor.to_list(length=10)

    # 5. Meeting notes for this client
    meeting_cursor = db.meetings.find({
        "client_id": client_obj_id,
        "owner_id": owner_id,
    }).sort("created_at", -1)
    meetings = await meeting_cursor.to_list(length=20)

    # 6. Risk reports (contract risk analyzer)
    risk_cursor = db.contract_risk_reports.find({
        "owner_id": owner_id,
        "client_id": client_obj_id,
    }).sort("analyzed_at", -1)
    risk_reports = await risk_cursor.to_list(length=5)

    # 7. Client profiler history
    profile_cursor = db.client_profiles.find({
        "owner_id": owner_id,
        "client_id": client_obj_id,
    }).sort("analyzed_at", -1)
    profiles = await profile_cursor.to_list(length=5)

    # 8. WhatsApp reminder history for this client's invoices
    client_invoice_ids = [inv["_id"] for inv in invoices]
    reminder_cursor = db.whatsapp_reminders.find({
        "owner_id": owner_id,
        "invoice_id": {"$in": client_invoice_ids},
    }).sort("sent_at", -1)
    reminders = await reminder_cursor.to_list(length=20)

    # 9. Payment behavior analysis
    payment_behavior = _analyze_payment_behavior(invoices)

    # 10. Relationship health score (0-100, higher is better)
    health_score = _calculate_relationship_health(
        invoices, contracts, meetings, reminders, profiles
    )

    # 11. Recommended next action
    next_action = _recommend_next_action(
        invoices, contracts, meetings, reminders, overdue_invoices, health_score
    )

    # 12. Tone analysis history for this client
    tone_cursor = db.tone_analyses.find({
        "owner_id": owner_id,
        "client_id": str(client_obj_id),
    }).sort("created_at", -1)
    tone_analyses = await tone_cursor.to_list(length=10)

    # Extract latest tone sentiment for quick view
    latest_tone = None
    if tone_analyses:
        latest = tone_analyses[0]
        analysis = latest.get("analysis", {})
        latest_tone = {
            "sentiment": analysis.get("overall_sentiment", "unknown"),
            "relationship_health": analysis.get("relationship_health", "unknown"),
            "communication_style": analysis.get("communication_style", "unknown"),
            "analyzed_at": latest.get("created_at", datetime.utcnow()).isoformat() if isinstance(latest.get("created_at"), datetime) else str(latest.get("created_at", "")),
        }

    # 13. Timeline — all events across all features, sorted by date
    timeline = _build_timeline(invoices, contracts, meetings, reminders, risk_reports)

    return {
        "client": serialize_doc(client),
        "summary": {
            "total_invoiced": round(total_invoiced, 2),
            "total_paid": round(total_paid, 2),
            "total_pending": round(total_pending, 2),
            "total_overdue": round(total_overdue, 2),
            "invoice_count": len(invoices),
            "paid_count": len(paid_invoices),
            "overdue_count": len(overdue_invoices),
            "contract_count": len(contracts),
            "meeting_count": len(meetings),
            "reminder_count": len(reminders),
        },
        "payment_behavior": payment_behavior,
        "health_score": health_score,
        "next_action": next_action,
        "invoices": [serialize_doc(inv) for inv in invoices[:5]],
        "contracts": [serialize_doc(c) for c in contracts[:3]],
        "meetings": [serialize_doc(m) for m in meetings[:3]],
        "risk_reports": [serialize_doc(r) for r in risk_reports[:2]],
        "profiles": [serialize_doc(p) for p in profiles[:1]],
        "reminders": [serialize_doc(r) for r in reminders[:5]],
        "tone_analyses": [serialize_doc(t) for t in tone_analyses[:5]],
        "latest_tone": latest_tone,
        "timeline": timeline[:20],
    }


def _analyze_payment_behavior(invoices: list) -> dict:
    if not invoices:
        return {"label": "No data", "score": 50, "details": "No invoices yet"}

    paid = [inv for inv in invoices if inv.get("status") == "paid"]
    overdue = [inv for inv in invoices if inv.get("status") == "overdue"]
    total = len(invoices)

    if not paid:
        return {"label": "Unknown", "score": 50, "details": "No paid invoices yet"}

    overdue_rate = len(overdue) / total if total > 0 else 0

    if overdue_rate == 0:
        return {"label": "Excellent Payer", "score": 95, "details": "All invoices paid on time"}
    elif overdue_rate < 0.2:
        return {"label": "Good Payer", "score": 75, "details": "Occasional late payments"}
    elif overdue_rate < 0.5:
        return {"label": "Slow Payer", "score": 45, "details": "Frequently pays late"}
    else:
        return {"label": "High Risk", "score": 20, "details": "More than half of invoices were overdue"}


def _calculate_relationship_health(
    invoices, contracts, meetings, reminders, profiles
) -> dict:
    score = 50  # base score

    # Payment history
    if invoices:
        paid = sum(1 for inv in invoices if inv.get("status") == "paid")
        overdue = sum(1 for inv in invoices if inv.get("status") == "overdue")
        payment_rate = paid / len(invoices)
        score += int(payment_rate * 25) - int((overdue / len(invoices)) * 20)

    # Has contract = more professional relationship
    if contracts:
        score += 10

    # Has meeting notes = active engagement
    if meetings:
        score += 5

    # Profiler risk score (invert it — high risk = low health)
    if profiles:
        latest_profile = profiles[0]
        profile_data = latest_profile.get("profile", {})
        risk_score = profile_data.get("overall_risk_score", 5)
        score -= int((risk_score - 5) * 3)

    # Has overdue reminders = relationship strain
    if reminders:
        score -= min(15, len(reminders) * 5)

    score = max(0, min(100, score))

    if score >= 75:
        label = "Healthy"
        color = "green"
        recommendation = "Strong relationship. Consider pitching a retainer."
    elif score >= 50:
        label = "Fair"
        color = "yellow"
        recommendation = "Relationship is okay. Monitor payment behavior closely."
    elif score >= 25:
        label = "At Risk"
        color = "orange"
        recommendation = "Relationship needs attention. Resolve outstanding issues."
    else:
        label = "Critical"
        color = "red"
        recommendation = "High-risk client. Consider pausing new work until payments clear."

    return {
        "score": score,
        "label": label,
        "color": color,
        "recommendation": recommendation,
    }


def _recommend_next_action(
    invoices, contracts, meetings, reminders, overdue_invoices, health_score
) -> dict:
    """Single most important next action for this client right now."""
    if overdue_invoices:
        total_overdue = sum(inv.get("total", 0) for inv in overdue_invoices)
        return {
            "priority": "URGENT",
            "action": f"Follow up on {len(overdue_invoices)} overdue invoice(s) — ₹{total_overdue:,.0f} outstanding",
            "icon": "alert",
            "link": "/reminders",
        }

    unpaid = [inv for inv in invoices if inv.get("status") in ("sent", "draft")]
    if unpaid:
        return {
            "priority": "HIGH",
            "action": f"You have {len(unpaid)} pending invoice(s). Follow up if payment is due.",
            "icon": "invoice",
            "link": "/invoices",
        }

    if not contracts:
        return {
            "priority": "MEDIUM",
            "action": "No contract on file for this client. Generate one to protect yourself.",
            "icon": "contract",
            "link": "/contracts",
        }

    if invoices and len(invoices) >= 3:
        return {
            "priority": "MEDIUM",
            "action": f"This client has hired you {len(invoices)} times. Consider pitching a monthly retainer.",
            "icon": "star",
            "link": "/negotiate",
        }

    return {
        "priority": "LOW",
        "action": "Relationship looks good. Keep delivering great work!",
        "icon": "check",
        "link": "/clients",
    }


def _build_timeline(invoices, contracts, meetings, reminders, risk_reports) -> list:
    """Unified timeline across all features — the data flow made visual."""
    events = []

    for inv in invoices:
        events.append({
            "date": inv.get("created_at", datetime.utcnow()).isoformat() if isinstance(inv.get("created_at"), datetime) else str(inv.get("created_at", "")),
            "type": "invoice",
            "title": f"Invoice {inv.get('invoice_number', '')} — ₹{inv.get('total', 0):,.0f}",
            "subtitle": f"Status: {inv.get('status', 'unknown')}",
            "color": "#4f46e5",
        })

    for c in contracts:
        events.append({
            "date": c.get("created_at", datetime.utcnow()).isoformat() if isinstance(c.get("created_at"), datetime) else str(c.get("created_at", "")),
            "type": "contract",
            "title": f"Contract generated — {c.get('project_type', '')}",
            "subtitle": f"{c.get('currency', 'INR')} {c.get('amount', 0):,.0f}",
            "color": "#15803d",
        })

    for m in meetings:
        events.append({
            "date": m.get("created_at", datetime.utcnow()).isoformat() if isinstance(m.get("created_at"), datetime) else str(m.get("created_at", "")),
            "type": "meeting",
            "title": f"Meeting notes extracted",
            "subtitle": m.get("extracted", {}).get("project_name", "Meeting"),
            "color": "#7c3aed",
        })

    for r in reminders:
        events.append({
            "date": r.get("sent_at", datetime.utcnow()).isoformat() if isinstance(r.get("sent_at"), datetime) else str(r.get("sent_at", "")),
            "type": "reminder",
            "title": f"WhatsApp reminder sent",
            "subtitle": f"To: {r.get('client_phone', '')}",
            "color": "#d97706",
        })

    for rr in risk_reports:
        events.append({
            "date": rr.get("analyzed_at", datetime.utcnow()).isoformat() if isinstance(rr.get("analyzed_at"), datetime) else str(rr.get("analyzed_at", "")),
            "type": "risk",
            "title": f"Contract risk analyzed — {rr.get('overall_risk_level', '').upper()} risk",
            "subtitle": rr.get("filename", ""),
            "color": "#dc2626",
        })

    events.sort(key=lambda e: e["date"], reverse=True)
    return events