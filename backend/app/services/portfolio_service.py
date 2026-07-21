"""
Freelancer Portfolio ROI Tracker.

SYNCHRONIZATION:
- Reads 'invoices' collection (already exists) — paid invoices only
- Reads 'clients' collection (already exists) — for client insights
- Groups by service_type (inferred from invoice notes/descriptions)
- Cross-references with client profiler data if available

INSIGHTS GENERATED:
1. Revenue by service type (which skill earns most)
2. Revenue per hour by service type (efficiency)
3. Average project value by service type
4. Client payment speed by service type
5. Trending vs declining service demand
6. "You're marketing X but Y earns more" alerts
"""
import re
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict


# Service type keywords for auto-classification from invoice descriptions
SERVICE_KEYWORDS = {
    "Logo Design": ["logo", "brand logo", "icon design", "logomark", "logotype"],
    "Web Development": ["website", "web dev", "frontend", "backend", "react", "django", "wordpress", "landing page", "web app"],
    "Mobile App": ["mobile app", "android", "ios", "flutter", "react native", "app development"],
    "UI/UX Design": ["ui design", "ux design", "wireframe", "prototype", "figma", "user interface", "user experience"],
    "Graphic Design": ["graphic design", "poster", "banner", "flyer", "brochure", "social media design", "illustration"],
    "Content Writing": ["content writing", "blog", "article", "copywriting", "seo content", "product description"],
    "SEO": ["seo", "search engine", "keyword research", "backlinks", "on-page seo"],
    "Social Media": ["social media", "instagram", "facebook", "linkedin post", "content calendar"],
    "Video Editing": ["video editing", "reel", "youtube", "animation", "motion graphics"],
    "Consulting": ["consulting", "strategy", "advisory", "consultation", "business plan"],
    "Data Analysis": ["data analysis", "dashboard", "excel", "power bi", "tableau", "analytics"],
    "Photography": ["photography", "photoshoot", "product photo", "portrait"],
    "Brand Identity": ["brand identity", "branding", "brand guidelines", "style guide"],
    "Other": [],
}


def classify_service_type(description: str, notes: str = "") -> str:
    """Classifies an invoice into a service type based on keywords."""
    text = f"{description} {notes}".lower()
    for service, keywords in SERVICE_KEYWORDS.items():
        if service == "Other":
            continue
        for kw in keywords:
            if kw in text:
                return service
    return "Other"


async def generate_portfolio_insights(db, owner_id) -> dict:
    """
    Generates revenue intelligence from invoice history.
    This is the core of the Portfolio ROI Tracker.
    """
    # Fetch all paid invoices
    cursor = db.invoices.find({"owner_id": owner_id, "status": "paid"})
    invoices = await cursor.to_list(length=1000)

    if not invoices:
        return {
            "has_data": False,
            "message": "No paid invoices yet. Mark invoices as 'paid' to see ROI insights.",
            "service_breakdown": [],
            "top_earning_service": None,
            "most_efficient_service": None,
            "alerts": [],
            "client_insights": [],
            "monthly_trend": [],
        }

    # Classify each invoice by service type
    service_data = defaultdict(lambda: {
        "invoices": [], "total_revenue": 0, "project_count": 0,
        "total_hours": 0, "client_ids": set(), "dates": [],
    })

    for inv in invoices:
        items = inv.get("items", [])
        all_descriptions = " ".join([item.get("description", "") for item in items])
        notes = inv.get("notes", "") or ""
        service_type = classify_service_type(all_descriptions, notes)

        sd = service_data[service_type]
        total = inv.get("total", 0)
        sd["total_revenue"] += total
        sd["project_count"] += 1
        sd["invoices"].append(inv)
        if inv.get("client_id"):
            sd["client_ids"].add(str(inv["client_id"]))
        if inv.get("created_at"):
            sd["dates"].append(inv["created_at"])

        # Estimate hours from invoice items
        for item in items:
            qty = item.get("quantity", 1)
            rate = item.get("rate", 0)
            if rate > 0 and 100 <= rate <= 10000:  # likely hourly rate
                sd["total_hours"] += qty

    # Build service breakdown
    service_breakdown = []
    for service, sd in service_data.items():
        avg_project_value = sd["total_revenue"] / sd["project_count"] if sd["project_count"] > 0 else 0
        revenue_per_hour = sd["total_revenue"] / sd["total_hours"] if sd["total_hours"] > 0 else None

        # Payment speed (days from invoice creation to now as proxy for oldest projects)
        payment_speed = "unknown"
        if sd["dates"]:
            avg_age = np.mean([(datetime.utcnow() - d).days for d in sd["dates"] if isinstance(d, datetime)])
            if avg_age < 30:
                payment_speed = "Fast"
            elif avg_age < 60:
                payment_speed = "Medium"
            else:
                payment_speed = "Slow"

        service_breakdown.append({
            "service_type": service,
            "total_revenue": round(sd["total_revenue"], 2),
            "project_count": sd["project_count"],
            "avg_project_value": round(avg_project_value, 2),
            "revenue_per_hour": round(revenue_per_hour, 2) if revenue_per_hour else None,
            "unique_clients": len(sd["client_ids"]),
            "payment_speed": payment_speed,
        })

    # Sort by revenue
    service_breakdown.sort(key=lambda x: x["total_revenue"], reverse=True)

    top_earning = service_breakdown[0] if service_breakdown else None
    most_efficient = max(
        [s for s in service_breakdown if s["revenue_per_hour"]],
        key=lambda x: x["revenue_per_hour"],
        default=None
    )

    # Generate alerts
    alerts = []
    if len(service_breakdown) >= 2:
        top = service_breakdown[0]
        second = service_breakdown[1]
        if top["avg_project_value"] > second["avg_project_value"] * 1.4:
            alerts.append({
                "type": "opportunity",
                "message": f"Your {top['service_type']} projects earn {((top['avg_project_value'] / second['avg_project_value'] - 1) * 100):.0f}% more per project than {second['service_type']}. Consider focusing more on {top['service_type']}.",
                "icon": "trending-up",
            })

    if most_efficient and top_earning and most_efficient["service_type"] != top_earning["service_type"]:
        alerts.append({
            "type": "insight",
            "message": f"You earn ₹{most_efficient['revenue_per_hour']:,.0f}/hour on {most_efficient['service_type']} projects — the highest of all your services. This is your most efficient skill.",
            "icon": "zap",
        })

    if len(service_breakdown) == 1:
        alerts.append({
            "type": "warning",
            "message": f"All your revenue comes from {service_breakdown[0]['service_type']}. Diversifying your services reduces income risk.",
            "icon": "alert",
        })

    # Monthly revenue trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        month_start = datetime.utcnow().replace(day=1) - timedelta(days=30 * i)
        month_label = month_start.strftime("%Y-%m")
        month_rev = sum(
            inv.get("total", 0) for inv in invoices
            if inv.get("created_at") and isinstance(inv["created_at"], datetime)
            and inv["created_at"].strftime("%Y-%m") == month_label
        )
        monthly_trend.append({"month": month_label, "revenue": month_rev})

    # Client insights
    client_ids = list(set(str(inv.get("client_id", "")) for inv in invoices if inv.get("client_id")))
    client_insights = []
    for cid in client_ids[:5]:
        client_invoices = [inv for inv in invoices if str(inv.get("client_id", "")) == cid]
        client_total = sum(inv.get("total", 0) for inv in client_invoices)
        client_doc = await db.clients.find_one({"_id": __import__("bson").ObjectId(cid)})
        if client_doc:
            client_insights.append({
                "client_name": client_doc.get("name", "Unknown"),
                "total_paid": round(client_total, 2),
                "project_count": len(client_invoices),
                "avg_project_value": round(client_total / len(client_invoices), 2),
            })
    client_insights.sort(key=lambda x: x["total_paid"], reverse=True)

    total_revenue = sum(inv.get("total", 0) for inv in invoices)
    total_projects = len(invoices)

    return {
        "has_data": True,
        "total_revenue": round(total_revenue, 2),
        "total_projects": total_projects,
        "avg_project_value": round(total_revenue / total_projects, 2) if total_projects > 0 else 0,
        "service_breakdown": service_breakdown,
        "top_earning_service": top_earning,
        "most_efficient_service": most_efficient,
        "alerts": alerts,
        "client_insights": client_insights,
        "monthly_trend": monthly_trend,
        "unique_services": len(service_breakdown),
    }