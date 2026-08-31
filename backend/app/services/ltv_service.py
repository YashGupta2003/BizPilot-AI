"""
Client Lifetime Value (LTV) Predictor Service.

SYNCHRONIZATION — reads from ALL existing collections:
- invoices          → revenue history, payment speed, frequency
- contracts         → professional relationship indicator
- meetings          → engagement depth indicator
- client_profiles   → risk score affects LTV confidence
- disputes          → dispute history reduces LTV score
- whatsapp_reminders → how many times we had to chase payment
- negotiations      → practice data (used for retainer timing)

ML APPROACH:
We use a scoring model (not deep ML — intentionally transparent so
you can explain every score in your viva). Each factor has a weight:

LTV Score = (
    Revenue Score        × 0.30  # how much they've paid
  + Frequency Score      × 0.25  # how often they hire
  + Recency Score        × 0.20  # when did they last hire
  + Payment Score        × 0.15  # do they pay on time
  + Engagement Score     × 0.10  # meetings, contracts, responsiveness
)

Then we project this forward 12 months using:
- Their average project value
- Their hire frequency (avg days between projects)
- Payment reliability factor
- Growth trajectory (is spending going up or down)

This gives a number like: "Raj is predicted to generate ₹1,40,000
in the next 12 months — confidence: HIGH."
"""
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional


async def get_all_client_ltv(db, owner_id) -> list[dict]:
    """
    Main entry point — calculates LTV for ALL clients and returns
    a ranked leaderboard with predictions and recommendations.
    """
    # Step 1: Get all clients
    cursor = db.clients.find({"owner_id": owner_id})
    clients = await cursor.to_list(length=500)

    if not clients:
        return []

    results = []
    for client in clients:
        ltv_data = await _calculate_client_ltv(db, owner_id, client)
        results.append(ltv_data)

    # Sort by predicted 12-month value (highest first)
    results.sort(key=lambda x: x["predicted_12m_value"], reverse=True)

    # Add rank
    for i, r in enumerate(results):
        r["rank"] = i + 1

    return results


async def _calculate_client_ltv(db, owner_id, client: dict) -> dict:
    """Calculates full LTV profile for one client."""
    client_id = client["_id"]
    now = datetime.utcnow()

    # ── GATHER ALL DATA ──────────────────────────────────────────

    # Invoices
    inv_cursor = db.invoices.find(
        {"client_id": client_id, "owner_id": owner_id}
    ).sort("created_at", 1)
    invoices = await inv_cursor.to_list(length=200)

    # Paid invoices only for revenue analysis
    paid_invoices = [inv for inv in invoices if inv.get("status") == "paid"]
    overdue_invoices = [inv for inv in invoices if inv.get("status") == "overdue"]

    # Contracts
    contract_count = await db.contracts.count_documents({
        "client_id": client_id, "owner_id": owner_id
    })

    # Meeting notes
    meeting_count = await db.meetings.count_documents({
        "client_id": client_id, "owner_id": owner_id
    })

    # Disputes
    dispute_count = await db.disputes.count_documents({
        "client_id": client_id, "owner_id": owner_id
    })

    # Reminders sent (payment chasing)
    invoice_ids = [inv["_id"] for inv in invoices]
    reminder_count = await db.whatsapp_reminders.count_documents({
        "invoice_id": {"$in": invoice_ids},
        "owner_id": owner_id,
    }) if invoice_ids else 0

    # Risk profile
    risk_profile = await db.client_profiles.find_one(
        {"client_id": client_id, "owner_id": owner_id},
        sort=[("analyzed_at", -1)],
    )

    # ── BASE METRICS ─────────────────────────────────────────────

    total_paid = sum(inv.get("total", 0) for inv in paid_invoices)
    total_invoiced = sum(inv.get("total", 0) for inv in invoices)
    invoice_count = len(invoices)
    paid_count = len(paid_invoices)

    if not invoices:
        return _empty_ltv(client)

    avg_project_value = total_paid / paid_count if paid_count > 0 else 0
    max_project_value = max((inv.get("total", 0) for inv in paid_invoices), default=0)

    # ── RECENCY ──────────────────────────────────────────────────
    last_invoice = invoices[-1]
    last_invoice_date = last_invoice.get("created_at")
    if isinstance(last_invoice_date, datetime):
        days_since_last = (now - last_invoice_date).days
    else:
        days_since_last = 365

    recency_score = max(0, 100 - days_since_last * 0.5)

    # ── FREQUENCY ────────────────────────────────────────────────
    if len(invoices) >= 2:
        dates = []
        for inv in invoices:
            d = inv.get("created_at")
            if isinstance(d, datetime):
                dates.append(d)
        dates.sort()

        if len(dates) >= 2:
            gaps = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_days_between = np.mean(gaps) if gaps else 365
        else:
            avg_days_between = 365

        # Convert to frequency score: 30-day hire = 100, 365-day = 10
        frequency_score = max(10, min(100, 100 * (30 / max(avg_days_between, 1))))
    else:
        avg_days_between = 365
        frequency_score = 20  # one-time client so far

    # ── REVENUE SCORE ────────────────────────────────────────────
    # Normalize against ₹1,00,000 as a "high value" threshold
    revenue_score = min(100, (total_paid / 100000) * 100)

    # ── PAYMENT RELIABILITY SCORE ────────────────────────────────
    if invoice_count > 0:
        overdue_rate = len(overdue_invoices) / invoice_count
        reminder_rate = reminder_count / invoice_count
        payment_score = max(0, 100 - (overdue_rate * 50) - (reminder_rate * 20))
    else:
        payment_score = 50

    # ── ENGAGEMENT SCORE ─────────────────────────────────────────
    engagement_score = 50  # base
    if contract_count > 0:
        engagement_score += 20  # has a contract = professional
    if meeting_count > 0:
        engagement_score += min(20, meeting_count * 5)  # meetings = engaged
    if dispute_count > 0:
        engagement_score -= dispute_count * 15  # disputes hurt
    if reminder_count > 0:
        engagement_score -= min(20, reminder_count * 5)  # chasing payment hurts
    engagement_score = max(0, min(100, engagement_score))

    # ── RISK PROFILE ADJUSTMENT ───────────────────────────────────
    risk_adjustment = 1.0
    if risk_profile:
        profile_data = risk_profile.get("profile", {})
        risk_score = profile_data.get("overall_risk_score", 5)
        # High risk client → reduce LTV confidence
        risk_adjustment = max(0.5, 1.0 - (risk_score - 5) * 0.05)

    # ── COMPOSITE LTV SCORE (weighted) ────────────────────────────
    ltv_score = (
        revenue_score    * 0.30 +
        frequency_score  * 0.25 +
        recency_score    * 0.20 +
        payment_score    * 0.15 +
        engagement_score * 0.10
    )
    ltv_score = min(100, ltv_score * risk_adjustment)

    # ── 12-MONTH REVENUE PREDICTION ───────────────────────────────
    if avg_days_between > 0 and avg_days_between < 365:
        projected_hires_per_year = min(24.0, 365 / max(avg_days_between, 15))
    elif paid_count == 1:
        projected_hires_per_year = 1.5  # optimistic for 1-time clients
    else:
        projected_hires_per_year = 1

    # Growth trajectory: are they spending more over time?
    growth_factor = 1.0
    if len(paid_invoices) >= 3:
        early_avg = np.mean([inv.get("total", 0) for inv in paid_invoices[:len(paid_invoices)//2]])
        late_avg = np.mean([inv.get("total", 0) for inv in paid_invoices[len(paid_invoices)//2:]])
        if early_avg > 0:
            growth_factor = min(1.5, max(0.7, late_avg / early_avg))

    predicted_12m_value = (
        avg_project_value
        * projected_hires_per_year
        * payment_score / 100
        * growth_factor
        * risk_adjustment
    )
    predicted_12m_value = round(max(0, predicted_12m_value), 2)

    # ── CONFIDENCE LEVEL ──────────────────────────────────────────
    if paid_count >= 4 and days_since_last < 90:
        confidence = "HIGH"
    elif paid_count >= 2 and days_since_last < 180:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    # ── CLIENT SEGMENT ────────────────────────────────────────────
    segment = _determine_segment(ltv_score, paid_count, days_since_last, avg_days_between)

    # ── RETAINER RECOMMENDATION ───────────────────────────────────
    retainer_tip = _retainer_recommendation(
        paid_count, avg_days_between, days_since_last, ltv_score, avg_project_value
    )

    # ── GROWTH TRAJECTORY ─────────────────────────────────────────
    if growth_factor > 1.1:
        trajectory = "growing"
    elif growth_factor < 0.9:
        trajectory = "declining"
    else:
        trajectory = "stable"

    return {
        "client_id": str(client["_id"]),
        "client_name": client.get("name", "Unknown"),
        "client_company": client.get("company", ""),
        "client_email": client.get("email", ""),

        # Historical metrics
        "total_paid": round(total_paid, 2),
        "total_invoiced": round(total_invoiced, 2),
        "invoice_count": invoice_count,
        "paid_count": paid_count,
        "avg_project_value": round(avg_project_value, 2),
        "max_project_value": round(max_project_value, 2),
        "days_since_last_invoice": days_since_last,
        "avg_days_between_projects": round(avg_days_between, 0),
        "contract_count": contract_count,
        "meeting_count": meeting_count,
        "dispute_count": dispute_count,
        "reminder_count": reminder_count,

        # Score breakdown
        "ltv_score": round(ltv_score, 1),
        "revenue_score": round(revenue_score, 1),
        "frequency_score": round(frequency_score, 1),
        "recency_score": round(recency_score, 1),
        "payment_score": round(payment_score, 1),
        "engagement_score": round(engagement_score, 1),

        # Predictions
        "predicted_12m_value": predicted_12m_value,
        "confidence": confidence,
        "growth_trajectory": trajectory,
        "growth_factor": round(growth_factor, 2),
        "projected_hires_per_year": round(projected_hires_per_year, 1),

        # Classification
        "segment": segment["label"],
        "segment_color": segment["color"],
        "segment_description": segment["description"],

        # Recommendations
        "retainer_tip": retainer_tip,
        "has_risk_profile": risk_profile is not None,
    }


def _determine_segment(ltv_score, paid_count, days_since_last, avg_days_between):
    """Classifies client into one of 5 strategic segments."""
    if ltv_score >= 70 and paid_count >= 3 and days_since_last < 90:
        return {
            "label": "Champion",
            "color": "#15803d",
            "description": "High value, frequent, recent. Your most important client.",
        }
    elif ltv_score >= 55 and paid_count >= 2:
        return {
            "label": "Loyal",
            "color": "#1d4ed8",
            "description": "Reliable repeat client. Nurture for upsell/retainer.",
        }
    elif ltv_score >= 40 and days_since_last < 60:
        return {
            "label": "Promising",
            "color": "#7c3aed",
            "description": "Recent, growing potential. Invest in this relationship.",
        }
    elif days_since_last > 180 and paid_count >= 2:
        return {
            "label": "At Risk",
            "color": "#d97706",
            "description": "Used to hire regularly but gone quiet. Re-engage now.",
        }
    elif paid_count == 1 and days_since_last > 90:
        return {
            "label": "One-Time",
            "color": "#6b7280",
            "description": "Single project, no repeat. Low priority unless re-engaged.",
        }
    else:
        return {
            "label": "New",
            "color": "#0891b2",
            "description": "Newer client. Track carefully for repeat signals.",
        }


def _retainer_recommendation(paid_count, avg_days_between, days_since_last, ltv_score, avg_value):
    """Generates a specific, timed retainer pitch recommendation."""
    if paid_count >= 3 and avg_days_between < 60 and days_since_last < 45:
        monthly = round(avg_value * 0.8, -2)
        return {
            "should_pitch": True,
            "urgency": "NOW",
            "message": f"This client hires you every {int(avg_days_between)} days — perfect retainer candidate. Pitch a ₹{monthly:,.0f}/month retainer. They'll likely say yes.",
            "suggested_retainer_amount": monthly,
        }
    elif paid_count >= 2 and ltv_score >= 50 and days_since_last < 90:
        monthly = round(avg_value * 0.7, -2)
        return {
            "should_pitch": True,
            "urgency": "SOON",
            "message": f"After {paid_count} projects, this client is ready for a retainer conversation. Suggest ₹{monthly:,.0f}/month for dedicated availability.",
            "suggested_retainer_amount": monthly,
        }
    elif days_since_last > 180 and paid_count >= 2:
        return {
            "should_pitch": False,
            "urgency": "RE-ENGAGE",
            "message": "Re-engage first. Send a check-in message before pitching a retainer.",
            "suggested_retainer_amount": None,
        }
    else:
        return {
            "should_pitch": False,
            "urgency": "WAIT",
            "message": "Build more project history before pitching a retainer.",
            "suggested_retainer_amount": None,
        }


def _empty_ltv(client: dict) -> dict:
    """Returns a safe empty LTV record for clients with no invoices."""
    return {
        "client_id": str(client["_id"]),
        "client_name": client.get("name", "Unknown"),
        "client_company": client.get("company", ""),
        "client_email": client.get("email", ""),
        "total_paid": 0, "total_invoiced": 0,
        "invoice_count": 0, "paid_count": 0,
        "avg_project_value": 0, "max_project_value": 0,
        "days_since_last_invoice": 999, "avg_days_between_projects": 365,
        "contract_count": 0, "meeting_count": 0,
        "dispute_count": 0, "reminder_count": 0,
        "ltv_score": 0, "revenue_score": 0, "frequency_score": 0,
        "recency_score": 0, "payment_score": 50, "engagement_score": 50,
        "predicted_12m_value": 0, "confidence": "LOW",
        "growth_trajectory": "unknown", "growth_factor": 1.0,
        "projected_hires_per_year": 0,
        "segment": "New", "segment_color": "#6b7280",
        "segment_description": "No invoices yet.",
        "retainer_tip": {"should_pitch": False, "urgency": "WAIT", "message": "Create invoices first.", "suggested_retainer_amount": None},
        "has_risk_profile": False,
        "rank": 0,
    }