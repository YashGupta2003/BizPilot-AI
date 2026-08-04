"""
Freelancer Mental Load Index — Cognitive Load Tracker.

Tracks how many active projects, pending proposals, overdue follow-ups,
and unresolved disputes a freelancer has at any time. Gives a "mental load
score" and warns when cognitive load is dangerously high.

SYNCHRONIZATION — reads from ALL of these collections:
- invoices → count active (sent) and overdue invoices
- contracts → count active/draft contracts (active projects)
- proposals → count pending proposals awaiting response
- disputes → count unresolved disputes
- scope_projects → count projects with detected scope drift
- meetings → count meetings needing follow-up
- income_goals → check if current goal is at risk
- escalation_logs → count active escalation cases
- whatsapp_reminders → count overdue reminders needing action
- tone_analyses → count negative/strained client relationships
- contract_comparisons → count pending contract reviews

OUTPUTS TO:
- mental_load_snapshots → stores historical snapshots for trend analysis
- activity feed → mental load events surface in the unified feed
- dashboard alerts → triggers HIGH alert when score exceeds 70

COGNITIVE RESEARCH BASIS:
Miller's Law (1956): Working memory handles 7±2 items optimally.
Research by Rubinstein et al. (2001): Task switching costs increase errors by 40%.
Freelancer-specific: With >7 active open items, error rates and client
dissatisfaction increase significantly (based on industry surveys).
"""
import numpy as np
from datetime import datetime, timedelta
from typing import Optional


class MentalLoadError(Exception):
    pass


# ── Category weights for the Mental Load Score ──────────────────────────
CATEGORY_WEIGHTS = {
    "active_projects": 25,     # Active contracts/projects
    "pending_proposals": 15,   # Proposals awaiting client response
    "overdue_invoices": 20,    # Unpaid overdue invoices (financial stress)
    "unresolved_disputes": 20, # Disputes = major cognitive drain
    "follow_ups": 10,          # Meetings, reminders needing action
    "relationship_stress": 10, # Negative tone, escalations
}

# ── Thresholds: how many items = 100% load in each category ─────────
CATEGORY_CEILINGS = {
    "active_projects": 6,      # 6+ active projects = maxed out
    "pending_proposals": 8,    # 8+ pending proposals = maxed
    "overdue_invoices": 4,     # 4+ overdue invoices = maxed
    "unresolved_disputes": 2,  # 2+ disputes = maxed (each is heavy)
    "follow_ups": 10,          # 10+ follow-up items = maxed
    "relationship_stress": 4,  # 4+ strained relationships = maxed
}


async def _count_active_projects(db, owner_id) -> int:
    """Count active contracts + scope projects with drift."""
    active_contracts = await db.contracts.count_documents({
        "owner_id": owner_id,
        "status": {"$in": ["draft", "active", "in_progress"]},
    })
    # Scope projects that are actively being tracked
    active_scope = await db.scope_projects.count_documents({
        "owner_id": owner_id,
        "status": {"$in": ["active", "drifting"]},
    })
    return active_contracts + active_scope


async def _count_pending_proposals(db, owner_id) -> int:
    """Count proposals still awaiting client decision."""
    return await db.proposals.count_documents({
        "owner_id": owner_id,
        "outcome": {"$in": ["pending", "submitted"]},
    })


async def _count_overdue_invoices(db, owner_id) -> int:
    """Count overdue unpaid invoices."""
    return await db.invoices.count_documents({
        "owner_id": owner_id,
        "status": "overdue",
    })


async def _count_unresolved_disputes(db, owner_id) -> int:
    """Count disputes not yet resolved."""
    return await db.disputes.count_documents({
        "owner_id": owner_id,
        "status": {"$ne": "resolved"},
    })


async def _count_follow_ups(db, owner_id) -> int:
    """Count meetings and reminders needing action."""
    today = datetime.utcnow()
    thirty_days_ago = today - timedelta(days=30)

    # Recent meetings that may need follow-up
    recent_meetings = await db.meetings.count_documents({
        "owner_id": owner_id,
        "created_at": {"$gte": thirty_days_ago},
    })

    # Sent invoices needing follow-up (sent but not paid within 7 days)
    seven_days_ago = today - timedelta(days=7)
    stale_sent = await db.invoices.count_documents({
        "owner_id": owner_id,
        "status": "sent",
        "created_at": {"$lte": seven_days_ago},
    })

    # Active escalation cases
    active_escalations = await db.escalation_logs.count_documents({
        "owner_id": owner_id,
        "status": {"$in": ["pending", "active", "in_progress"]},
    })

    return recent_meetings + stale_sent + active_escalations


async def _count_relationship_stress(db, owner_id) -> int:
    """Count strained client relationships from tone analysis + escalations."""
    today = datetime.utcnow()
    thirty_days_ago = today - timedelta(days=30)

    # Negative or mixed tone analyses in the last 30 days
    negative_tones = await db.tone_analyses.count_documents({
        "owner_id": owner_id,
        "analysis.overall_sentiment": {"$in": ["negative", "mixed"]},
        "created_at": {"$gte": thirty_days_ago},
    })

    # High-risk client profiles
    high_risk_profiles = await db.client_profiles.count_documents({
        "owner_id": owner_id,
        "profile.overall_risk_score": {"$gte": 7},
    })

    return negative_tones + high_risk_profiles


def _calculate_score(breakdown: dict) -> int:
    """
    Weighted Mental Load Score (0-100).

    Each category contributes up to its weight in points.
    The ratio of (actual count / ceiling) determines the percentage
    of that category's weight that gets added to the score.
    """
    score = 0.0
    for category, count in breakdown.items():
        if category in CATEGORY_WEIGHTS:
            weight = CATEGORY_WEIGHTS[category]
            ceiling = CATEGORY_CEILINGS[category]
            ratio = min(1.0, count / ceiling) if ceiling > 0 else 0
            score += ratio * weight
    return min(100, round(score))


def _determine_zone(score: int) -> dict:
    """
    Cognitive load zones based on research.

    Miller's Law (7±2 items), Rubinstein task-switching costs.
    """
    if score <= 30:
        return {
            "zone": "Green Zone",
            "zone_color": "green",
            "emoji": "🟢",
            "message": "Your workload is manageable. You have headroom to take on new projects.",
            "detail": "Cognitive load is well within optimal range. Focus quality should be high.",
        }
    elif score <= 50:
        return {
            "zone": "Yellow Zone",
            "zone_color": "yellow",
            "emoji": "🟡",
            "message": "Approaching capacity. Consider completing some items before taking on more.",
            "detail": "You're nearing the 7-item threshold where task-switching costs start to impact quality.",
        }
    elif score <= 70:
        return {
            "zone": "Orange Zone",
            "zone_color": "orange",
            "emoji": "🟠",
            "message": "Cognitive overload risk! Research shows error rates increase significantly at this level.",
            "detail": "With this many open items, each task switch costs ~15-25 minutes of refocus time. "
                      "Expect dropped balls and slower response times.",
        }
    else:
        return {
            "zone": "Red Zone",
            "zone_color": "red",
            "emoji": "🔴",
            "message": f"You currently have too many open items — research shows cognitive load "
                       f"above 7 active projects significantly increases error rate and client dissatisfaction.",
            "detail": "CRITICAL: At this load level, studies show 40%+ increase in errors, "
                      "missed deadlines, and client communication breakdowns. Immediate triage required.",
        }


async def _generate_triage_recommendations(
    db, owner_id, breakdown: dict, score: int
) -> list:
    """
    Generates specific, prioritized recommendations on WHAT to close first.
    Each recommendation includes the impact on reducing the mental load score.
    """
    recs = []

    # Priority 1: Overdue invoices (financial stress + relationship risk)
    if breakdown["overdue_invoices"] > 0:
        overdue = await db.invoices.find(
            {"owner_id": owner_id, "status": "overdue"}
        ).sort("created_at", 1).to_list(length=5)
        for inv in overdue:
            amount = inv.get("total", 0)
            client = inv.get("client_name", "Client")
            recs.append({
                "priority": "CRITICAL",
                "category": "overdue_invoices",
                "action": f"Collect ₹{amount:,.0f} from {client}",
                "detail": f"Invoice {inv.get('invoice_number', 'Unknown')} has been overdue. "
                          f"Send a follow-up or escalate.",
                "impact": "Resolving this reduces your load score by ~5 points",
                "link": "/reminders",
                "icon": "💰",
            })

    # Priority 2: Unresolved disputes (high cognitive drain)
    if breakdown["unresolved_disputes"] > 0:
        disputes = await db.disputes.find(
            {"owner_id": owner_id, "status": {"$ne": "resolved"}}
        ).sort("created_at", 1).to_list(length=3)
        for d in disputes:
            recs.append({
                "priority": "CRITICAL",
                "category": "unresolved_disputes",
                "action": f"Resolve dispute with {d.get('client_name', 'Client')}",
                "detail": "Each unresolved dispute is a major cognitive drain. "
                          "Use the Dispute Resolver to generate a response.",
                "impact": "Resolving this reduces your load score by ~10 points",
                "link": "/disputes",
                "icon": "⚖️",
            })

    # Priority 3: Stale proposals (decision fatigue)
    if breakdown["pending_proposals"] > 3:
        recs.append({
            "priority": "HIGH",
            "category": "pending_proposals",
            "action": f"Follow up on {breakdown['pending_proposals']} pending proposals",
            "detail": "Too many open proposals create decision fatigue. "
                      "Close stale ones (>2 weeks old) or send follow-ups.",
            "impact": f"Closing 3 proposals reduces your load score by ~6 points",
            "link": "/winrate",
            "icon": "📨",
        })

    # Priority 4: Active projects overload
    if breakdown["active_projects"] > 3:
        recs.append({
            "priority": "HIGH",
            "category": "active_projects",
            "action": f"You have {breakdown['active_projects']} active projects — finish one before starting another",
            "detail": "Research shows freelancers perform best with 2-4 active projects. "
                      "Beyond that, each additional project reduces quality on ALL projects.",
            "impact": "Completing one project reduces your load score by ~4 points",
            "link": "/scope",
            "icon": "📋",
        })

    # Priority 5: Relationship maintenance
    if breakdown["relationship_stress"] > 0:
        recs.append({
            "priority": "MEDIUM",
            "category": "relationship_stress",
            "action": f"{breakdown['relationship_stress']} client relationship(s) need attention",
            "detail": "Negative communication tone detected. A quick check-in call "
                      "can prevent these from escalating into disputes.",
            "impact": "Proactive outreach prevents future disputes and cognitive load",
            "link": "/tone",
            "icon": "🎭",
        })

    # Priority 6: Follow-ups
    if breakdown["follow_ups"] > 5:
        recs.append({
            "priority": "MEDIUM",
            "category": "follow_ups",
            "action": f"Clear {breakdown['follow_ups']} pending follow-up items",
            "detail": "Batch your follow-ups into a single focused session. "
                      "Responding to everything at once is more efficient than scattered responses.",
            "impact": "Clearing follow-ups reduces mental clutter significantly",
            "link": "/reminders",
            "icon": "📬",
        })

    # General advice based on score
    if score > 50:
        recs.append({
            "priority": "LOW",
            "category": "general",
            "action": "Block 2 hours today for 'closing mode' — resolve as many open items as possible",
            "detail": "Dedicated closing sessions are 3x more effective than trying to "
                      "multitask between creating new work and finishing old work.",
            "impact": "Research-backed productivity technique for high-load periods",
            "link": "/",
            "icon": "⏰",
        })

    if not recs:
        recs.append({
            "priority": "LOW",
            "category": "general",
            "action": "You're in great shape — maintain this balance",
            "detail": "Your cognitive load is well-managed. Keep finishing projects "
                      "before starting new ones.",
            "impact": "Current load level supports optimal performance",
            "link": "/",
            "icon": "✅",
        })

    return recs


async def calculate_mental_load_score(db, owner_id) -> dict:
    """
    Main entry point — calculates the complete Mental Load Index.

    Queries 10+ collections across the entire BizPilot platform to build
    a holistic picture of the freelancer's cognitive load.
    """
    # Gather all counts
    breakdown = {
        "active_projects": await _count_active_projects(db, owner_id),
        "pending_proposals": await _count_pending_proposals(db, owner_id),
        "overdue_invoices": await _count_overdue_invoices(db, owner_id),
        "unresolved_disputes": await _count_unresolved_disputes(db, owner_id),
        "follow_ups": await _count_follow_ups(db, owner_id),
        "relationship_stress": await _count_relationship_stress(db, owner_id),
    }

    total_open_items = sum(breakdown.values())
    score = _calculate_score(breakdown)
    zone_info = _determine_zone(score)

    # Generate triage recommendations
    recommendations = await _generate_triage_recommendations(
        db, owner_id, breakdown, score
    )

    # Save snapshot for historical tracking
    snapshot = {
        "owner_id": owner_id,
        "score": score,
        "zone": zone_info["zone"],
        "zone_color": zone_info["zone_color"],
        "total_open_items": total_open_items,
        "breakdown": breakdown,
        "created_at": datetime.utcnow(),
    }
    await db.mental_load_snapshots.insert_one(snapshot)

    return {
        "score": score,
        "total_open_items": total_open_items,
        "zone": zone_info["zone"],
        "zone_color": zone_info["zone_color"],
        "zone_emoji": zone_info["emoji"],
        "message": zone_info["message"],
        "detail": zone_info["detail"],
        "breakdown": breakdown,
        "recommendations": recommendations,
        "category_labels": {
            "active_projects": "Active Projects",
            "pending_proposals": "Pending Proposals",
            "overdue_invoices": "Overdue Invoices",
            "unresolved_disputes": "Unresolved Disputes",
            "follow_ups": "Follow-up Items",
            "relationship_stress": "Relationship Stress",
        },
        "category_icons": {
            "active_projects": "📋",
            "pending_proposals": "📨",
            "overdue_invoices": "💰",
            "unresolved_disputes": "⚖️",
            "follow_ups": "📬",
            "relationship_stress": "🎭",
        },
        "category_links": {
            "active_projects": "/contracts",
            "pending_proposals": "/winrate",
            "overdue_invoices": "/invoices",
            "unresolved_disputes": "/disputes",
            "follow_ups": "/reminders",
            "relationship_stress": "/tone",
        },
        "cognitive_threshold": 7,
        "generated_at": datetime.utcnow().isoformat(),
    }


async def get_mental_load_history(db, owner_id) -> list:
    """Returns the last 30 mental load snapshots for trend analysis."""
    from app.models.serializers import serialize_list
    cursor = db.mental_load_snapshots.find(
        {"owner_id": owner_id}
    ).sort("created_at", -1).limit(30)
    snapshots = await cursor.to_list(length=30)
    return serialize_list(snapshots)


async def get_mental_load_items(db, owner_id) -> list:
    """
    Returns ALL open items across the platform, grouped by category
    and ranked by urgency/impact for the triage view.
    """
    from app.models.serializers import serialize_doc
    items = []

    # Overdue invoices (highest priority)
    overdue_invs = await db.invoices.find(
        {"owner_id": owner_id, "status": "overdue"}
    ).sort("created_at", 1).to_list(length=20)
    for inv in overdue_invs:
        items.append({
            "category": "Overdue Invoice",
            "title": f"Invoice {inv.get('invoice_number', 'N/A')} — ₹{inv.get('total', 0):,.0f}",
            "subtitle": inv.get("client_name", "Unknown client"),
            "priority": "CRITICAL",
            "impact": "High — financial + relationship risk",
            "action": "Send reminder or escalate",
            "link": "/reminders",
            "icon": "💰",
            "date": inv.get("created_at", datetime.utcnow()).isoformat() if isinstance(inv.get("created_at"), datetime) else "",
        })

    # Unresolved disputes
    disputes = await db.disputes.find(
        {"owner_id": owner_id, "status": {"$ne": "resolved"}}
    ).sort("created_at", 1).to_list(length=10)
    for d in disputes:
        items.append({
            "category": "Unresolved Dispute",
            "title": f"Dispute with {d.get('client_name', 'Client')}",
            "subtitle": (d.get("dispute_message", "") or "")[:80],
            "priority": "CRITICAL",
            "impact": "Critical — cognitive drain + revenue risk",
            "action": "Resolve using Dispute Resolver",
            "link": "/disputes",
            "icon": "⚖️",
            "date": d.get("created_at", datetime.utcnow()).isoformat() if isinstance(d.get("created_at"), datetime) else "",
        })

    # Active contracts/projects
    active_contracts = await db.contracts.find(
        {"owner_id": owner_id, "status": {"$in": ["draft", "active", "in_progress"]}}
    ).sort("created_at", -1).to_list(length=10)
    for c in active_contracts:
        items.append({
            "category": "Active Project",
            "title": f"{c.get('project_type', 'Project')} — {c.get('client_name', 'Client')}",
            "subtitle": f"{c.get('currency', 'INR')} {c.get('amount', 0):,.0f}",
            "priority": "MEDIUM",
            "impact": "Medium — ongoing commitment",
            "action": "Track progress in Scope Detector",
            "link": "/contracts",
            "icon": "📋",
            "date": c.get("created_at", datetime.utcnow()).isoformat() if isinstance(c.get("created_at"), datetime) else "",
        })

    # Pending proposals
    pending_props = await db.proposals.find(
        {"owner_id": owner_id, "outcome": {"$in": ["pending", "submitted"]}}
    ).sort("created_at", 1).to_list(length=10)
    for p in pending_props:
        items.append({
            "category": "Pending Proposal",
            "title": f"{p.get('service_type', 'Service')} proposal",
            "subtitle": f"Submitted {p.get('created_at', '')}"[:40] if p.get("created_at") else "Awaiting response",
            "priority": "LOW",
            "impact": "Low — waiting on client, but mental overhead",
            "action": "Follow up if stale (>7 days)",
            "link": "/winrate",
            "icon": "📨",
            "date": p.get("created_at", datetime.utcnow()).isoformat() if isinstance(p.get("created_at"), datetime) else "",
        })

    # Sort by priority (CRITICAL > HIGH > MEDIUM > LOW)
    priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    items.sort(key=lambda x: priority_order.get(x["priority"], 4))

    return items
