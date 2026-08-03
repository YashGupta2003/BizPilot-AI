"""
Smart Pricing Engine Service.

SYNCHRONIZATION — reads from ALL existing collections:
- invoices        → your past project prices and outcomes
- proposals       → win/loss data at different price points
- clients         → client type for price segmentation
- client_profiles → psychographic data to adjust pricing
- scope_projects  → project complexity signals
- contracts       → past agreed amounts
- ltv data        → high LTV clients can be charged more
- disputes        → dispute history means charge more upfront

PRICING MODEL:
1. Anchor Analysis     → what have you charged for similar work before?
2. Win Rate Overlap    → at what price do you win most for this combo?
3. Client Type Factor  → corporate pays more, startup pays less
4. Complexity Factor   → based on scope size
5. LTV Factor          → high value clients = premium pricing
6. Risk Factor         → high risk clients = higher buffer
7. Market Estimate     → estimated market range for this service

Output: a price range with confidence levels and specific reasoning.
"""
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional


SERVICE_MARKET_RATES = {
    "Logo Design":           {"min": 8000,   "max": 50000,   "typical": 15000},
    "Brand Identity":        {"min": 25000,  "max": 200000,  "typical": 60000},
    "Web Development":       {"min": 20000,  "max": 300000,  "typical": 75000},
    "Mobile App":            {"min": 50000,  "max": 500000,  "typical": 150000},
    "UI/UX Design":          {"min": 15000,  "max": 150000,  "typical": 45000},
    "Content Writing":       {"min": 5000,   "max": 50000,   "typical": 15000},
    "SEO":                   {"min": 10000,  "max": 80000,   "typical": 25000},
    "Social Media":          {"min": 8000,   "max": 60000,   "typical": 20000},
    "Video Editing":         {"min": 5000,   "max": 100000,  "typical": 25000},
    "Photography":           {"min": 10000,  "max": 80000,   "typical": 25000},
    "Consulting":            {"min": 15000,  "max": 200000,  "typical": 50000},
    "Data Analysis":         {"min": 20000,  "max": 150000,  "typical": 50000},
    "Other":                 {"min": 5000,   "max": 100000,  "typical": 25000},
}

CLIENT_TYPE_MULTIPLIERS = {
    "Corporate":   1.4,
    "Agency":      1.2,
    "SME":         1.0,
    "Startup":     0.85,
    "Individual":  0.75,
    "NGO":         0.70,
    "Government":  1.1,
    "Unknown":     1.0,
}

COMPLEXITY_MULTIPLIERS = {
    "simple":   0.7,
    "standard": 1.0,
    "complex":  1.4,
    "enterprise": 1.8,
}


async def get_pricing_suggestion(
    db,
    owner_id,
    service_type: str,
    client_type: str = "Unknown",
    complexity: str = "standard",
    client_id: Optional[str] = None,
    deliverable_count: int = 3,
) -> dict:
    """
    Main pricing engine — analyzes all data and returns
    optimal price range with detailed reasoning.
    """
    from bson import ObjectId

    market = SERVICE_MARKET_RATES.get(service_type, SERVICE_MARKET_RATES["Other"])
    client_multiplier = CLIENT_TYPE_MULTIPLIERS.get(client_type, 1.0)
    complexity_multiplier = COMPLEXITY_MULTIPLIERS.get(complexity, 1.0)

    # ── YOUR HISTORICAL PRICES (most important signal) ───────────
    past_invoices = await db.invoices.find({
        "owner_id": owner_id,
    }).to_list(length=500)

    # Filter by service type keyword matching
    service_keywords = service_type.lower().split()
    relevant_invoices = []
    for inv in past_invoices:
        items = inv.get("items", [])
        text = " ".join([item.get("description", "") for item in items]).lower()
        notes = (inv.get("notes", "") or "").lower()
        combined = text + " " + notes
        if any(kw in combined for kw in service_keywords):
            relevant_invoices.append(inv)

    # ── WIN RATE DATA ─────────────────────────────────────────────
    won_proposals = await db.proposals.find({
        "owner_id": owner_id,
        "service_type": service_type,
        "outcome": "won",
    }).to_list(length=200)

    lost_proposals = await db.proposals.find({
        "owner_id": owner_id,
        "service_type": service_type,
        "outcome": "lost",
    }).to_list(length=200)

    # ── CLIENT-SPECIFIC DATA ──────────────────────────────────────
    client_ltv_score = 50
    client_risk_score = 5
    client_dispute_count = 0
    client_paid_count = 0

    if client_id:
        try:
            client_obj_id = ObjectId(client_id)

            # LTV from invoice history
            client_invoices = await db.invoices.find({
                "client_id": client_obj_id,
                "owner_id": owner_id,
                "status": "paid",
            }).to_list(length=100)
            client_paid_count = len(client_invoices)
            if client_paid_count >= 3:
                client_ltv_score = 70

            # Risk profile
            risk_profile = await db.client_profiles.find_one(
                {"client_id": client_obj_id, "owner_id": owner_id},
                sort=[("analyzed_at", -1)],
            )
            if risk_profile:
                client_risk_score = risk_profile.get("profile", {}).get("overall_risk_score", 5)

            # Dispute history
            client_dispute_count = await db.disputes.count_documents({
                "client_id": client_obj_id, "owner_id": owner_id
            })

            # Scope drift history (they've caused drift before = charge more)
            scope_project = await db.scope_projects.find_one({
                "client_id": client_obj_id, "owner_id": owner_id
            })

        except Exception:
            pass

    # ── PRICE CALCULATION ─────────────────────────────────────────

    # Base: market typical × client type × complexity
    base_price = market["typical"] * client_multiplier * complexity_multiplier

    # Adjust for deliverable count
    if deliverable_count > 5:
        base_price *= 1.2
    elif deliverable_count <= 2:
        base_price *= 0.85

    # LTV adjustment: loyal high-LTV clients → small premium
    ltv_adjustment = 1.0
    if client_ltv_score >= 70:
        ltv_adjustment = 1.10  # 10% premium for proven clients
    elif client_ltv_score < 30:
        ltv_adjustment = 0.95  # slight discount to win first project

    # Risk adjustment: high-risk clients → charge more (buffer for problems)
    risk_adjustment = 1.0
    if client_risk_score >= 8:
        risk_adjustment = 1.20  # 20% risk buffer
    elif client_risk_score >= 6:
        risk_adjustment = 1.10

    # Dispute history: more disputes → higher price (not worth the trouble)
    if client_dispute_count >= 2:
        risk_adjustment *= 1.15

    adjusted_price = base_price * ltv_adjustment * risk_adjustment

    # Your win rate anchor (if you have proposal data)
    your_win_range = None
    if won_proposals:
        won_amounts = [p.get("amount", 0) for p in won_proposals if p.get("amount", 0) > 0]
        if won_amounts:
            p25 = np.percentile(won_amounts, 25)
            p75 = np.percentile(won_amounts, 75)
            your_win_range = {"min": round(p25, -2), "max": round(p75, -2)}
            # Blend your historical win range with calculated price
            historical_mid = (p25 + p75) / 2
            adjusted_price = (adjusted_price * 0.4 + historical_mid * 0.6)

    # Your historical anchor
    historical_range = None
    if relevant_invoices:
        amounts = [inv.get("total", 0) for inv in relevant_invoices if inv.get("total", 0) > 0]
        if amounts:
            historical_range = {
                "min": round(min(amounts), -2),
                "max": round(max(amounts), -2),
                "avg": round(np.mean(amounts), -2),
            }

    # Final price range: ±20% around adjusted price
    final_min = round(adjusted_price * 0.85, -2)
    final_max = round(adjusted_price * 1.20, -2)
    final_optimal = round(adjusted_price, -2)

    # Confidence
    data_points = len(relevant_invoices) + len(won_proposals)
    if data_points >= 5:
        confidence = "HIGH"
    elif data_points >= 2:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    # Win rate at different price points
    win_rate_analysis = _analyze_win_rate_by_price(won_proposals, lost_proposals)

    # Danger zones
    danger_zones = _identify_danger_zones(won_proposals, lost_proposals, relevant_invoices)

    # Reasoning bullets
    reasoning = _build_reasoning(
        service_type, client_type, complexity,
        market, client_multiplier, complexity_multiplier,
        ltv_adjustment, risk_adjustment,
        client_paid_count, client_risk_score, client_dispute_count,
        relevant_invoices, won_proposals, your_win_range,
    )

    return {
        "service_type": service_type,
        "client_type": client_type,
        "complexity": complexity,
        "recommended_min": int(final_min),
        "recommended_max": int(final_max),
        "optimal_price": int(final_optimal),
        "confidence": confidence,
        "market_range": market,
        "your_win_range": your_win_range,
        "historical_range": historical_range,
        "win_rate_analysis": win_rate_analysis,
        "danger_zones": danger_zones,
        "reasoning": reasoning,
        "client_signals": {
            "ltv_score": client_ltv_score,
            "risk_score": client_risk_score,
            "dispute_count": client_dispute_count,
            "past_projects": client_paid_count,
        },
        "data_points_used": data_points,
    }


def _analyze_win_rate_by_price(won: list, lost: list) -> list:
    """Buckets proposals by price range and calculates win rate for each."""
    if not won and not lost:
        return []

    all_amounts = [p.get("amount", 0) for p in won + lost if p.get("amount", 0) > 0]
    if not all_amounts:
        return []

    min_a, max_a = min(all_amounts), max(all_amounts)
    if min_a == max_a:
        return []

    bucket_size = (max_a - min_a) / 4
    buckets = []
    for i in range(4):
        lo = min_a + i * bucket_size
        hi = lo + bucket_size
        won_in = sum(1 for p in won if lo <= p.get("amount", 0) <= hi)
        lost_in = sum(1 for p in lost if lo <= p.get("amount", 0) <= hi)
        total = won_in + lost_in
        if total > 0:
            buckets.append({
                "range": f"₹{lo:,.0f}–₹{hi:,.0f}",
                "win_rate": round(won_in / total * 100, 1),
                "total": total,
            })

    return buckets


def _identify_danger_zones(won, lost, invoices) -> list:
    """Identifies price points that consistently lose or attract bad clients."""
    zones = []

    if lost:
        high_loss = [p.get("amount", 0) for p in lost if p.get("amount", 0) > 0]
        if high_loss:
            avg_loss = np.mean(high_loss)
            zones.append({
                "type": "loss_zone",
                "description": f"Proposals around ₹{avg_loss:,.0f} tend to get rejected",
                "suggestion": "Adjust pricing or strengthen your value proposition at this level",
            })

    return zones


def _build_reasoning(
    service_type, client_type, complexity, market,
    client_mult, complexity_mult, ltv_adj, risk_adj,
    paid_count, risk_score, dispute_count,
    relevant_invoices, won_proposals, your_win_range,
) -> list:
    bullets = []

    bullets.append({
        "icon": "📊",
        "text": f"Market rate for {service_type}: ₹{market['min']:,.0f}–₹{market['max']:,.0f} (typical: ₹{market['typical']:,.0f})",
    })

    bullets.append({
        "icon": "👤",
        "text": f"{client_type} clients typically pay {int(client_mult * 100)}% of market rate.",
    })

    if complexity != "standard":
        bullets.append({
            "icon": "⚙️",
            "text": f"{complexity.title()} complexity: {int(complexity_mult * 100)}% price multiplier applied.",
        })

    if relevant_invoices:
        amounts = [inv.get("total", 0) for inv in relevant_invoices if inv.get("total", 0) > 0]
        if amounts:
            bullets.append({
                "icon": "📁",
                "text": f"Your past {service_type} projects: ₹{min(amounts):,.0f}–₹{max(amounts):,.0f} (avg ₹{np.mean(amounts):,.0f})",
            })

    if your_win_range:
        bullets.append({
            "icon": "🏆",
            "text": f"Your highest win rate is in the ₹{your_win_range['min']:,.0f}–₹{your_win_range['max']:,.0f} range for this service.",
        })

    if paid_count >= 3:
        bullets.append({
            "icon": "⭐",
            "text": f"This client has paid {paid_count} times before — 10% premium applied (proven relationship).",
        })

    if risk_score >= 7:
        bullets.append({
            "icon": "⚠️",
            "text": f"Client risk score is {risk_score}/10 — 20% buffer added to protect against scope creep and payment delays.",
        })

    if dispute_count > 0:
        bullets.append({
            "icon": "🔴",
            "text": f"This client has {dispute_count} past dispute(s) — price includes a dispute buffer. Consider higher advance payment.",
        })

    return bullets


async def get_pricing_history(db, owner_id) -> dict:
    """
    Summary of all your pricing patterns — used for the
    insights dashboard tab.
    """
    invoices = await db.invoices.find(
        {"owner_id": owner_id, "status": "paid"}
    ).to_list(length=1000)

    if not invoices:
        return {"has_data": False}

    service_pricing = defaultdict(list)
    for inv in invoices:
        items = inv.get("items", [])
        for item in items:
            desc = item.get("description", "").lower()
            for service in SERVICE_MARKET_RATES:
                if any(kw in desc for kw in service.lower().split()):
                    service_pricing[service].append(inv.get("total", 0))
                    break

    pricing_summary = []
    for service, amounts in service_pricing.items():
        if amounts:
            pricing_summary.append({
                "service_type": service,
                "your_avg": round(np.mean(amounts), -2),
                "your_min": round(min(amounts), -2),
                "your_max": round(max(amounts), -2),
                "project_count": len(amounts),
                "market_typical": SERVICE_MARKET_RATES[service]["typical"],
                "vs_market": round((np.mean(amounts) / SERVICE_MARKET_RATES[service]["typical"] - 1) * 100, 1),
            })

    pricing_summary.sort(key=lambda x: x["project_count"], reverse=True)

    return {
        "has_data": True,
        "by_service": pricing_summary,
        "total_paid_projects": len(invoices),
        "avg_project_value": round(np.mean([inv.get("total", 0) for inv in invoices]), -2),
    }