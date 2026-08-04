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

    # Recent networking analyses
    net_cursor = db.networking_analyses.find({"owner_id": owner_id}).sort("created_at", -1)
    recent_nets = await net_cursor.to_list(length=3)
    for na in recent_nets:
        gap_count = len(na.get("service_gaps", []))
        events.append({
            "type": "networking",
            "title": f"🤝 Networking analysis completed",
            "subtitle": f"{gap_count} service gap(s) identified — partnership opportunities found",
            "date": na.get("created_at", datetime.utcnow()),
            "link": "/networking",
            "color": "#6366f1",
            "client_name": na.get("client_name", ""),
        })

    # Recent income goals
    goal_cursor = db.income_goals.find({"owner_id": owner_id}).sort("created_at", -1)
    recent_goals = await goal_cursor.to_list(length=3)
    for g in recent_goals:
        target = g.get("monthly_target", 0)
        month = g.get("month", "")
        events.append({
            "type": "goal",
            "title": f"🎯 Income goal set — ₹{target:,.0f}",
            "subtitle": f"Target month: {month}",
            "date": g.get("created_at", datetime.utcnow()),
            "link": "/goals",
            "color": "#059669",
            "client_name": "",
        })

    # Recent tone analyses
    tone_cursor = db.tone_analyses.find({"owner_id": owner_id}).sort("created_at", -1)
    recent_tones = await tone_cursor.to_list(length=5)
    for t in recent_tones:
        analysis = t.get("analysis", {})
        sentiment = analysis.get("overall_sentiment", "neutral")
        sentiment_emoji = {"positive": "😊", "neutral": "😐", "negative": "😟", "mixed": "🤔"}.get(sentiment, "🎭")
        events.append({
            "type": "tone",
            "title": f"{sentiment_emoji} Tone analyzed — {sentiment.title()}",
            "subtitle": f"{t.get('client_name', 'Unknown')} — {t.get('communication_type', 'email')}",
            "date": t.get("created_at", datetime.utcnow()),
            "link": "/tone",
            "color": "#8b5cf6",
            "client_name": t.get("client_name", ""),
        })

    # ── NEW FEATURE 13: Mental Load snapshots ────────────────────────
    ml_cursor = db.mental_load_snapshots.find({"owner_id": owner_id}).sort("created_at", -1)
    recent_ml = await ml_cursor.to_list(length=3)
    for ml in recent_ml:
        zone = ml.get("zone", "Green Zone")
        score = ml.get("score", 0)
        zone_emoji = {"Green Zone": "🟢", "Yellow Zone": "🟡", "Orange Zone": "🟠", "Red Zone": "🔴"}.get(zone, "🧠")
        events.append({
            "type": "mental_load",
            "title": f"{zone_emoji} Mental Load: {score}/100 — {zone}",
            "subtitle": f"Open items: {ml.get('total_open_items', sum(ml.get('breakdown', {}).values()))}",
            "date": ml.get("created_at", datetime.utcnow()),
            "link": "/mental-load",
            "color": "#7c3aed",
            "client_name": "",
        })

    # ── NEW FEATURE 14: Contract comparisons ─────────────────────────
    cc_cursor = db.contract_comparisons.find({"owner_id": owner_id}).sort("created_at", -1)
    recent_cc = await cc_cursor.to_list(length=3)
    for cc in recent_cc:
        analysis = cc.get("analysis", {})
        risk = analysis.get("risk_level", "unknown")
        changes = analysis.get("changes_found", 0)
        risk_emoji = {"low": "🟢", "medium": "🟡", "high": "🟠", "critical": "🔴"}.get(risk, "📜")
        events.append({
            "type": "contract_comparison",
            "title": f"{risk_emoji} Contract compared — {risk.upper()} risk",
            "subtitle": f"{changes} changes found",
            "date": cc.get("created_at", datetime.utcnow()),
            "link": "/contract-compare",
            "color": "#dc2626",
            "client_name": "",
        })

    # ── NEW FEATURE 15: Seasonal plans ───────────────────────────────
    sp_cursor = db.seasonal_plans.find({"owner_id": owner_id}).sort("created_at", -1)
    recent_sp = await sp_cursor.to_list(length=2)
    for sp in recent_sp:
        events.append({
            "type": "seasonal_plan",
            "title": "📅 Seasonal revenue plan updated",
            "subtitle": sp.get("notes", "12-month revenue forecast generated")[:50],
            "date": sp.get("created_at", datetime.utcnow()),
            "link": "/seasonal",
            "color": "#059669",
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


    # Alert 5: Income goal at risk (< 50% progress past mid-month)
    current_month = today.strftime("%Y-%m")
    active_goal = await db.income_goals.find_one({
        "owner_id": owner_id,
        "month": current_month,
    })
    if active_goal:
        day_of_month = today.day
        if day_of_month >= 15:
            # Check progress
            month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_invoices = await db.invoices.find({
                "owner_id": owner_id,
                "status": "paid",
                "created_at": {"$gte": month_start},
            }).to_list(length=200)
            earned = sum(inv.get("total", 0) for inv in month_invoices)
            target = active_goal.get("monthly_target", 0)
            if target > 0:
                progress = (earned / target) * 100
                if progress < 50:
                    gap = target - earned
                    alerts.append({
                        "level": "HIGH",
                        "icon": "🎯",
                        "message": f"Income goal alert: Only {progress:.0f}% of ₹{target:,.0f} target reached with {30 - day_of_month} days left. Gap: ₹{gap:,.0f}",
                        "action": "View Goal Tracker",
                        "link": "/goals",
                        "feature": "goals",
                    })

    # Alert 6: Client tone cooling (negative/critical tone detected recently)
    recent_negative_tones = await db.tone_analyses.find({
        "owner_id": owner_id,
        "analysis.overall_sentiment": {"$in": ["negative", "mixed"]},
        "created_at": {"$gte": today - timedelta(days=7)},
    }).to_list(length=5)
    for tone in recent_negative_tones:
        client_name = tone.get("client_name", "A client")
        analysis = tone.get("analysis", {})
        relationship = analysis.get("relationship_health", "unknown")
        if relationship in ("cooling", "strained", "critical"):
            alerts.append({
                "level": "MEDIUM" if relationship == "cooling" else "HIGH",
                "icon": "🎭",
                "message": f"{client_name}'s communication tone is {relationship}. Relationship may need personal attention.",
                "action": "View Tone Analysis",
                "link": "/tone",
                "feature": "tone",
            })

    # ── Alert 7: Mental Load overload (Feature 13) ───────────────────
    latest_ml = await db.mental_load_snapshots.find_one(
        {"owner_id": owner_id},
        sort=[("created_at", -1)],
    )
    if latest_ml and latest_ml.get("score", 0) >= 60:
        zone = latest_ml.get("zone", "Orange Zone")
        score = latest_ml.get("score", 0)
        total = latest_ml.get("total_open_items", sum(latest_ml.get("breakdown", {}).values()))
        alerts.append({
            "level": "HIGH" if score >= 70 else "MEDIUM",
            "icon": "🧠",
            "message": f"Mental Load is in {zone} ({score}/100) with {total} open items. "
                       f"Research shows error rates increase significantly above 7 active items.",
            "action": "View Mental Load",
            "link": "/mental-load",
            "feature": "mental_load",
        })

    # ── Alert 8: Unsafe contract comparison (Feature 14) ─────────────
    recent_comparison = await db.contract_comparisons.find_one(
        {"owner_id": owner_id, "analysis.safe_to_sign": False},
        sort=[("created_at", -1)],
    )
    if recent_comparison:
        risk = recent_comparison.get("analysis", {}).get("risk_level", "unknown")
        flags = len(recent_comparison.get("analysis", {}).get("red_flags", []))
        if risk in ("high", "critical"):
            alerts.append({
                "level": "HIGH",
                "icon": "🚩",
                "message": f"A recent contract comparison flagged {flags} red flag(s) — {risk.upper()} risk. "
                           f"Do NOT sign without addressing these issues.",
                "action": "View Contract Diff",
                "link": "/contract-compare",
                "feature": "contract_compare",
            })

    # ── Alert 9: Seasonal slowdown warning (Feature 15) ──────────────
    current_month_num = today.month
    # Warn about upcoming slow months (January, May, December)
    slow_months = {12: "January", 4: "May", 11: "December"}
    if current_month_num in slow_months:
        upcoming = slow_months[current_month_num]
        alerts.append({
            "level": "MEDIUM",
            "icon": "📅",
            "message": f"{upcoming} is historically a slow month. "
                       f"Build your emergency fund now and front-load proposals.",
            "action": "View Seasonal Planner",
            "link": "/seasonal",
            "feature": "seasonal",
        })

    return alerts[:15]