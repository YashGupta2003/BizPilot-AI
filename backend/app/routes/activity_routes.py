"""
Unified Activity Feed — cross-feature event stream.

This is the "heartbeat" of the platform. Every significant action
across all features gets logged here and surfaced in the UI as a
live feed. This is what makes BizPilot feel like a real product,
not a collection of tools.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timedelta
from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc

router = APIRouter(prefix="/api/activity", tags=["Activity Feed"])


@router.get("/feed")
async def get_activity_feed(
    limit: int = Query(50, le=100),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Unified feed of all recent actions across all features.
    Pulls from: invoices, contracts, meetings, reminders,
                client_profiles, contract_risk_reports, negotiations.
    """
    owner_id = current_user["_id"]
    events = []

    # Recent invoices
    inv_cursor = db.invoices.find({"owner_id": owner_id}).sort("created_at", -1)
    recent_invoices = await inv_cursor.to_list(length=10)
    for inv in recent_invoices:
        status_emoji = {"paid": "✅", "sent": "📤", "draft": "📝", "overdue": "🔴"}.get(inv.get("status", ""), "📄")
        events.append({
            "type": "invoice",
            "title": f"{status_emoji} Invoice {inv.get('invoice_number', '')}",
            "subtitle": f"{inv.get('client_name', '')} — ₹{inv.get('total', 0):,.0f} ({inv.get('status', '')})",
            "date": inv.get("created_at", datetime.utcnow()),
            "link": "/invoices",
            "color": "#4f46e5",
            "client_name": inv.get("client_name", ""),
        })

    # Recent contracts
    con_cursor = db.contracts.find({"owner_id": owner_id}).sort("created_at", -1)
    recent_contracts = await con_cursor.to_list(length=5)
    for c in recent_contracts:
        events.append({
            "type": "contract",
            "title": f"📜 Contract generated",
            "subtitle": f"{c.get('client_name', '')} — {c.get('project_type', '')} — {c.get('currency', 'INR')} {c.get('amount', 0):,.0f}",
            "date": c.get("created_at", datetime.utcnow()),
            "link": "/contracts",
            "color": "#15803d",
            "client_name": c.get("client_name", ""),
        })

    # Recent meetings
    meet_cursor = db.meetings.find({"owner_id": owner_id}).sort("created_at", -1)
    recent_meetings = await meet_cursor.to_list(length=5)
    for m in recent_meetings:
        inv_created = f" → Invoice {m['invoice_number']} created" if m.get("invoice_number") else ""
        events.append({
            "type": "meeting",
            "title": f"🎯 Meeting notes extracted{inv_created}",
            "subtitle": f"{m.get('client_name', '')} — {m.get('extracted', {}).get('project_name', 'Meeting')}",
            "date": m.get("created_at", datetime.utcnow()),
            "link": "/meetings",
            "color": "#7c3aed",
            "client_name": m.get("client_name", ""),
        })

    # Recent reminders sent
    rem_cursor = db.whatsapp_reminders.find({"owner_id": owner_id}).sort("sent_at", -1)
    recent_reminders = await rem_cursor.to_list(length=5)
    for r in recent_reminders:
        events.append({
            "type": "reminder",
            "title": f"💬 WhatsApp reminder sent",
            "subtitle": f"To: {r.get('client_phone', '')}",
            "date": r.get("sent_at", datetime.utcnow()),
            "link": "/reminders",
            "color": "#d97706",
            "client_name": "",
        })

    # Recent risk reports
    risk_cursor = db.contract_risk_reports.find({"owner_id": owner_id}).sort("analyzed_at", -1)
    recent_risks = await risk_cursor.to_list(length=5)
    for rr in recent_risks:
        risk_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(rr.get("overall_risk_level", "medium"), "⚠️")
        events.append({
            "type": "risk",
            "title": f"{risk_emoji} Contract risk analyzed",
            "subtitle": f"{rr.get('filename', '')} — {rr.get('overall_risk_level', '').upper()} risk",
            "date": rr.get("analyzed_at", datetime.utcnow()),
            "link": "/assistant",
            "color": "#dc2626",
            "client_name": "",
        })

    # Recent client profiles
    prof_cursor = db.client_profiles.find({"owner_id": owner_id}).sort("analyzed_at", -1)
    recent_profiles = await prof_cursor.to_list(length=5)
    for p in recent_profiles:
        profile = p.get("profile", {})
        events.append({
            "type": "profile",
            "title": f"🧠 Client profiled",
            "subtitle": f"{profile.get('client_type', 'Unknown type')} — Risk: {profile.get('overall_risk_score', 5)}/10",
            "date": p.get("analyzed_at", datetime.utcnow()),
            "link": "/profiler",
            "color": "#0891b2",
            "client_name": "",
        })

    # Recent negotiation sessions
    neg_cursor = db.negotiation_sessions.find({"owner_id": owner_id}).sort("created_at", -1)
    recent_negs = await neg_cursor.to_list(length=5)
    for n in recent_negs:
        score_text = f" — Grade: {n['score']['grade']}" if n.get("score") else ""
        events.append({
            "type": "negotiation",
            "title": f"⚔️ Negotiation practice{score_text}",
            "subtitle": f"{n.get('scenario_name', '')} — {n.get('service_type', '')}",
            "date": n.get("created_at", datetime.utcnow()),
            "link": "/negotiate",
            "color": "#be185d",
            "client_name": "",
        })

    # Sort all events by date, newest first
    events.sort(key=lambda e: e["date"] if isinstance(e["date"], datetime) else datetime.min, reverse=True)

    # Convert datetime to ISO string for JSON
    for event in events:
        if isinstance(event["date"], datetime):
            event["date"] = event["date"].isoformat()

    return events[:limit]


@router.get("/alerts")
async def get_smart_alerts(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Smart alerts that fire when cross-feature conditions are met.
    These are the 'data flow' made visible — one feature's data
    triggering an alert based on another feature's state.
    """
    owner_id = current_user["_id"]
    alerts = []
    today = datetime.utcnow()

    # Alert 1: Overdue invoices with no reminder sent today
    overdue_invoices = await db.invoices.find({
        "owner_id": owner_id,
        "status": "overdue",
    }).to_list(length=50)

    for inv in overdue_invoices:
        reminder_today = await db.whatsapp_reminders.find_one({
            "invoice_id": inv["_id"],
            "sent_date": str(today.date()),
        })
        if not reminder_today:
            alerts.append({
                "level": "HIGH",
                "icon": "💰",
                "message": f"Invoice {inv.get('invoice_number')} for {inv.get('client_name')} is overdue — ₹{inv.get('total', 0):,.0f}. No reminder sent today.",
                "action": "Send Reminder",
                "link": "/reminders",
                "feature": "reminders",
            })

    # Alert 2: Clients with paid invoices but no contract
    paid_client_ids = set()
    async for inv in db.invoices.find({"owner_id": owner_id, "status": "paid"}):
        if inv.get("client_id"):
            paid_client_ids.add(inv["client_id"])

    for client_id in list(paid_client_ids)[:5]:
        has_contract = await db.contracts.find_one({
            "client_id": client_id,
            "owner_id": owner_id,
        })
        if not has_contract:
            client = await db.clients.find_one({"_id": client_id})
            if client:
                alerts.append({
                    "level": "MEDIUM",
                    "icon": "📜",
                    "message": f"{client.get('name')} has paid invoices but no contract on file. Generate one to protect future work.",
                    "action": "Generate Contract",
                    "link": "/contracts",
                    "feature": "contracts",
                })

    # Alert 3: High burnout risk (if enough invoice data)
    invoice_count = await db.invoices.count_documents({"owner_id": owner_id})
    if invoice_count >= 3:
        thirty_days_ago = today - timedelta(days=30)
        recent_invoices = await db.invoices.count_documents({
            "owner_id": owner_id,
            "created_at": {"$gte": thirty_days_ago},
        })
        if recent_invoices == 0:
            alerts.append({
                "level": "HIGH",
                "icon": "📉",
                "message": "No invoices created in 30 days. Income gap risk is HIGH. Time to send proposals.",
                "action": "View Income Stability",
                "link": "/burnout",
                "feature": "burnout",
            })

    # Alert 4: Client with high risk profile AND pending invoice
    high_risk_profiles = await db.client_profiles.find({
        "owner_id": owner_id,
        "profile.overall_risk_score": {"$gte": 7},
    }).to_list(length=10)

    for profile in high_risk_profiles:
        if profile.get("client_id"):
            pending = await db.invoices.find_one({
                "client_id": profile["client_id"],
                "owner_id": owner_id,
                "status": {"$in": ["sent", "overdue"]},
            })
            if pending:
                client = await db.clients.find_one({"_id": profile["client_id"]})
                if client:
                    alerts.append({
                        "level": "HIGH",
                        "icon": "⚠️",
                        "message": f"{client.get('name')} was profiled as HIGH RISK and has a pending/overdue invoice. Follow up urgently.",
                        "action": "View Client",
                        "link": f"/clients",
                        "feature": "profiler",
                    })

    return alerts[:10]