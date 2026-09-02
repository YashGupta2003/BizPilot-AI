"""
Client Health Score Service.

SYNCHRONIZATION — reads from ALL existing collections:
- invoices          → payment speed, overdue count, repeat business
- whatsapp_reminders → how many times payment was chased
- disputes          → dispute history (major red flag)
- scope_projects    → scope drift = bad client signal
- meetings          → engagement level
- contracts         → professional relationship signal
- client_profiles   → psychographic risk score
- negotiations      → negotiation practice data
- escalation_logs   → escalation history = serious red flag

HEALTH SCORE FORMULA (0-100, higher = healthier):
- Payment Score    (30 pts): pays on time, no reminders needed
- Loyalty Score    (20 pts): repeat business, long relationship
- Professional     (20 pts): has contract, had meetings, no disputes
- Communication    (15 pts): no escalations, no aggressive reminders
- Growth Score     (15 pts): spending increasing over time

Score interpretation:
80-100: 🟢 Champion — prioritize, pitch retainer
60-79:  🟡 Healthy — good client, maintain relationship
40-59:  🟠 Caution — watch closely, protect yourself
20-39:  🔴 At Risk — consider declining new work
0-19:   ⚫ Avoid — high risk of loss, disputes, non-payment
"""
import numpy as np
from datetime import datetime, timedelta
from typing import Optional


async def calculate_client_health(db, owner_id, client) -> dict:
    """Calculates comprehensive health score for one client."""
    client_id = client["_id"]
    now = datetime.utcnow()

    # ── GATHER ALL DATA ──────────────────────────────────────────

    # Invoices
    inv_cursor = db.invoices.find({"client_id": client_id, "owner_id": owner_id}).sort("created_at", 1)
    invoices = await inv_cursor.to_list(length=200)

    paid = [inv for inv in invoices if inv.get("status") == "paid"]
    overdue = [inv for inv in invoices if inv.get("status") == "overdue"]
    total_inv = len(invoices)

    # Reminders
    inv_ids = [inv["_id"] for inv in invoices]
    reminder_count = await db.whatsapp_reminders.count_documents(
        {"invoice_id": {"$in": inv_ids}, "owner_id": owner_id}
    ) if inv_ids else 0

    # Disputes
    dispute_count = await db.disputes.count_documents(
        {"client_id": client_id, "owner_id": owner_id}
    )

    # Escalations — check if any escalation is for this client's invoices
    client_escalation_count = 0
    if inv_ids:
        client_escalation_count = await db.escalation_logs.count_documents(
            {"invoice_id": {"$in": inv_ids}, "owner_id": owner_id}
        )

    # Scope drift
    scope_project = await db.scope_projects.find_one(
        {"client_id": client_id, "owner_id": owner_id}
    )
    total_drift_value = scope_project.get("total_drift_value", 0) if scope_project else 0
    drift_check_count = len(scope_project.get("drift_checks", [])) if scope_project else 0
    drift_detected_count = sum(
        1 for check in (scope_project.get("drift_checks", []) if scope_project else [])
        if check.get("drift_detected")
    )

    # Contracts
    contract_count = await db.contracts.count_documents(
        {"client_id": client_id, "owner_id": owner_id}
    )

    # Meetings
    meeting_count = await db.meetings.count_documents(
        {"client_id": client_id, "owner_id": owner_id}
    )

    # Risk profile
    risk_profile = await db.client_profiles.find_one(
        {"client_id": client_id, "owner_id": owner_id},
        sort=[("analyzed_at", -1)],
    )
    psychographic_risk = risk_profile.get("profile", {}).get("overall_risk_score", 5) if risk_profile else 5

    # ── PAYMENT SCORE (30 pts) ───────────────────────────────────
    payment_score = 30
    if total_inv > 0:
        overdue_rate = len(overdue) / total_inv
        payment_score -= int(overdue_rate * 20)
    if reminder_count > 0:
        payment_score -= min(10, reminder_count * 3)
    if client_escalation_count > 0:
        payment_score -= min(15, client_escalation_count * 8)
    payment_score = max(0, payment_score)

    # ── LOYALTY SCORE (20 pts) ───────────────────────────────────
    loyalty_score = 0
    if len(paid) >= 1:
        loyalty_score += 5
    if len(paid) >= 3:
        loyalty_score += 5
    if len(paid) >= 5:
        loyalty_score += 5

    # Revenue growth (spending more over time)
    if len(paid) >= 3:
        early_avg = np.mean([inv.get("total", 0) for inv in paid[:len(paid)//2]])
        late_avg = np.mean([inv.get("total", 0) for inv in paid[len(paid)//2:]])
        if late_avg > early_avg:
            loyalty_score += 5  # growing spend

    loyalty_score = min(20, loyalty_score)

    # ── PROFESSIONAL SCORE (20 pts) ─────────────────────────────
    professional_score = 10  # base
    if contract_count > 0:
        professional_score += 5
    if meeting_count > 0:
        professional_score += 3
    if dispute_count > 0:
        professional_score -= dispute_count * 8
    professional_score = max(0, min(20, professional_score))

    # ── COMMUNICATION SCORE (15 pts) ────────────────────────────
    communication_score = 15
    if reminder_count > 2:
        communication_score -= 5
    if client_escalation_count > 0:
        communication_score -= 8
    if drift_detected_count > 2:
        communication_score -= 5
    communication_score = max(0, communication_score)

    # ── GROWTH SCORE (15 pts) ────────────────────────────────────
    growth_score = 5  # base
    if paid:
        last_invoice = invoices[-1]
        last_date = last_invoice.get("created_at")
        if isinstance(last_date, datetime):
            days_since = (now - last_date).days
            if days_since < 30:
                growth_score += 5
            elif days_since < 90:
                growth_score += 3

    total_paid_amount = sum(inv.get("total", 0) for inv in paid)
    if total_paid_amount > 100000:
        growth_score += 5
    elif total_paid_amount > 50000:
        growth_score += 3

    growth_score = min(15, growth_score)

    # ── PSYCHOGRAPHIC RISK PENALTY ───────────────────────────────
    risk_penalty = max(0, (psychographic_risk - 5) * 2)

    # ── FINAL SCORE ──────────────────────────────────────────────
    raw_score = payment_score + loyalty_score + professional_score + communication_score + growth_score
    final_score = max(0, min(100, raw_score - risk_penalty))

    # ── LABEL + RECOMMENDATIONS ──────────────────────────────────
    if final_score >= 80:
        label = "Champion"
        color = "green"
        emoji = "🟢"
        action = "Pitch a monthly retainer — this is your best client."
        should_take_new_work = True
    elif final_score >= 60:
        label = "Healthy"
        color = "blue"
        emoji = "🟡"
        action = "Good client. Continue building the relationship."
        should_take_new_work = True
    elif final_score >= 40:
        label = "Caution"
        color = "yellow"
        emoji = "🟠"
        action = "Monitor closely. Require 50% advance on next project."
        should_take_new_work = True
    elif final_score >= 20:
        label = "At Risk"
        color = "orange"
        emoji = "🔴"
        action = "Consider declining new work. Resolve outstanding issues first."
        should_take_new_work = False
    else:
        label = "Avoid"
        color = "red"
        emoji = "⚫"
        action = "High risk of loss and disputes. Do not take new work from this client."
        should_take_new_work = False

    # ── RED FLAGS ────────────────────────────────────────────────
    red_flags = []
    if len(overdue) > 0:
        red_flags.append(f"{len(overdue)} overdue invoice(s)")
    if dispute_count > 0:
        red_flags.append(f"{dispute_count} dispute(s) on record")
    if client_escalation_count > 0:
        red_flags.append(f"Required legal escalation {client_escalation_count} time(s)")
    if drift_detected_count >= 2:
        red_flags.append(f"Scope drift detected {drift_detected_count} times — total ₹{total_drift_value:,.0f} extra")
    if reminder_count >= 3:
        red_flags.append(f"Required {reminder_count} payment reminders")
    if psychographic_risk >= 8:
        red_flags.append(f"High psychographic risk score ({psychographic_risk}/10)")

    # ── GREEN FLAGS ──────────────────────────────────────────────
    green_flags = []
    if len(paid) >= 3:
        green_flags.append(f"Repeat client — {len(paid)} paid projects")
    if contract_count > 0:
        green_flags.append("Has a signed contract on file")
    if dispute_count == 0 and len(paid) >= 2:
        green_flags.append("Zero disputes across all projects")
    if reminder_count == 0 and len(paid) >= 1:
        green_flags.append("Pays without needing reminders")
    if total_paid_amount > 100000:
        green_flags.append(f"High-value client — ₹{total_paid_amount:,.0f} total paid")

    return {
        "client_id": str(client["_id"]),
        "client_name": client.get("name", "Unknown"),
        "client_company": client.get("company", ""),
        "health_score": final_score,
        "health_label": label,
        "health_color": color,
        "health_emoji": emoji,
        "action_recommendation": action,
        "should_take_new_work": should_take_new_work,

        # Score breakdown
        "payment_score": payment_score,
        "loyalty_score": loyalty_score,
        "professional_score": professional_score,
        "communication_score": communication_score,
        "growth_score": growth_score,
        "risk_penalty": risk_penalty,

        # Raw metrics
        "total_invoices": total_inv,
        "paid_count": len(paid),
        "overdue_count": len(overdue),
        "reminder_count": reminder_count,
        "dispute_count": dispute_count,
        "escalation_count": client_escalation_count,
        "contract_count": contract_count,
        "meeting_count": meeting_count,
        "scope_drift_detected": drift_detected_count,
        "total_drift_value": total_drift_value,
        "total_paid_amount": round(sum(inv.get("total", 0) for inv in paid), 2),
        "psychographic_risk": psychographic_risk,

        "red_flags": red_flags,
        "green_flags": green_flags,
    }


async def get_all_client_health(db, owner_id) -> list:
    """Returns health scores for ALL clients, sorted by score."""
    cursor = db.clients.find({"owner_id": owner_id})
    clients = await cursor.to_list(length=500)

    import asyncio
    tasks = [calculate_client_health(db, owner_id, client) for client in clients]
    results = list(await asyncio.gather(*tasks))

    results.sort(key=lambda x: x["health_score"], reverse=True)
    return results