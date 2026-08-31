import numpy as np
from datetime import datetime
from bson import ObjectId
from typing import List, Dict, Any
from app.models.serializers import serialize_doc, serialize_list

INDIAN_BUSINESS_CALENDAR = {
    1: {"name": "January", "events": ["New Year"], "pattern": "slow", "note": "Post-holiday slowdown, clients settling budgets"},
    2: {"name": "February", "events": [], "pattern": "recovery", "note": "Budgets getting approved, work picking up"},
    3: {"name": "March", "events": ["Financial Year End", "Holi"], "pattern": "rush", "note": "FY end spending rush — companies dump remaining budgets"},
    4: {"name": "April", "events": ["New Financial Year"], "pattern": "moderate", "note": "New FY starts, fresh budgets but slow approvals"},
    5: {"name": "May", "events": ["Summer Holidays"], "pattern": "slow", "note": "Summer vacations, decision-makers unavailable"},
    6: {"name": "June", "events": ["Monsoon Begins"], "pattern": "moderate", "note": "Work resumes, Q1 projects kicking off"},
    7: {"name": "July", "events": [], "pattern": "busy", "note": "Full steam Q1 execution, highest productivity"},
    8: {"name": "August", "events": ["Independence Day", "Raksha Bandhan"], "pattern": "busy", "note": "Strong month — start proposals for October-November"},
    9: {"name": "September", "events": ["Ganesh Chaturthi"], "pattern": "busy", "note": "Pre-festive work completion push"},
    10: {"name": "October", "events": ["Navratri", "Dussehra", "Diwali prep"], "pattern": "peak", "note": "Historically best month for many freelancers — festive spending"},
    11: {"name": "November", "events": ["Diwali", "Post-Diwali"], "pattern": "moderate", "note": "Build emergency fund now — January slowdown coming"},
    12: {"name": "December", "events": ["Christmas", "Year End"], "pattern": "slow", "note": "Holiday season, reduced client availability"},
}

PATTERN_MULTIPLIERS = {
    "slow": 0.5,
    "recovery": 0.8,
    "moderate": 1.0,
    "busy": 1.3,
    "rush": 1.4,
    "peak": 1.7
}

def extract_month(date_val):
    if not date_val: return None
    try:
        if isinstance(date_val, str):
            date_val = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
        return date_val.month
    except Exception:
        return None

async def generate_seasonal_plan(db, owner_id: str) -> Dict[str, Any]:
    """
    Aggregates historical data by month to detect seasonal patterns.
    Data pipeline:
    - invoices: monthly revenue
    - clients: acquisition patterns
    - proposals: win rates
    - contracts: project starts
    - income_goals: goal setting
    - meetings: frequency
    """
    invoices = await db["invoices"].find({"owner_id": owner_id}).to_list(None)
    clients = await db["clients"].find({"owner_id": owner_id}).to_list(None)
    proposals = await db["proposals"].find({"owner_id": owner_id}).to_list(None)
    contracts = await db["contracts"].find({"owner_id": owner_id}).to_list(None)
    goals = await db["income_goals"].find({"owner_id": owner_id}).to_list(None)
    meetings = await db["meetings"].find({"owner_id": owner_id}).to_list(None)
    
    # Calculate historical data per month
    month_totals = {i: [] for i in range(1, 13)}
    
    for inv in invoices:
        m = extract_month(inv.get("issue_date") or inv.get("created_at"))
        if m: month_totals[m].append(float(inv.get("total", 0) or 0))
                
    overall_revenues = [sum(totals) for totals in month_totals.values() if totals]
    avg_monthly_revenue = np.mean(overall_revenues) if overall_revenues else 5000  # fallback baseline
    
    monthly_plan = []
    
    for month in range(1, 13):
        cal_data = INDIAN_BUSINESS_CALENDAR[month]
        totals = month_totals[month]
        
        hist_avg = np.mean(totals) if totals else 0
        hist_count = len(totals)
        
        cal_predicted = avg_monthly_revenue * PATTERN_MULTIPLIERS[cal_data["pattern"]]
        
        if hist_count > 0:
            predicted_revenue = (hist_avg * 0.7) + (cal_predicted * 0.3)
            confidence = "High" if hist_count >= 3 else "Medium"
        else:
            predicted_revenue = cal_predicted
            confidence = "Low"
            
        recommendations = [cal_data["note"]]
        prep_tasks = []
        emergency_fund = 0
        
        # Look ahead 2 months
        peak_lookahead = (month + 1) % 12 + 1
        if INDIAN_BUSINESS_CALENDAR[peak_lookahead]["pattern"] in ["peak", "rush"]:
            recommendations.append(f"Start proposals now to land work for {INDIAN_BUSINESS_CALENDAR[peak_lookahead]['name']}.")
            prep_tasks.append(f"Prepare proposals for {INDIAN_BUSINESS_CALENDAR[peak_lookahead]['name']} peak.")
            
        # Look ahead 1 month
        slow_lookahead = (month % 12) + 1
        if INDIAN_BUSINESS_CALENDAR[slow_lookahead]["pattern"] == "slow":
            emergency_fund = predicted_revenue * 0.3
            recommendations.append(f"Build emergency fund now — {INDIAN_BUSINESS_CALENDAR[slow_lookahead]['name']} slowdown coming.")
            
        if cal_data["pattern"] == "recovery":
            recommendations.append("Do active outreach — budgets are being approved.")
        if cal_data["pattern"] == "slow":
            recommendations.append("Take time off strategically or focus on internal processes/upskilling.")

        monthly_plan.append({
            "month": month,
            "name": cal_data["name"],
            "pattern": cal_data["pattern"],
            "predicted_revenue": round(float(predicted_revenue), 2),
            "confidence_level": confidence,
            "historical_avg_revenue": round(float(hist_avg), 2),
            "historical_invoice_count": hist_count,
            "events": cal_data["events"],
            "recommendations": recommendations,
            "preparation_tasks": prep_tasks,
            "emergency_fund_target": round(float(emergency_fund), 2)
        })
        
    predicted_revs = [m["predicted_revenue"] for m in monthly_plan]
    q1 = sum(predicted_revs[3:6]) # Apr-Jun
    q2 = sum(predicted_revs[6:9]) # Jul-Sep
    q3 = sum(predicted_revs[9:12]) # Oct-Dec
    q4 = sum(predicted_revs[0:3]) # Jan-Mar
    
    quarters = [("Q1 (Apr-Jun)", q1), ("Q2 (Jul-Sep)", q2), ("Q3 (Oct-Dec)", q3), ("Q4 (Jan-Mar)", q4)]
    quarters.sort(key=lambda x: x[1])
    
    mean_rev = np.mean(predicted_revs)
    std_rev = np.std(predicted_revs)
    
    current_month = datetime.now().month
    months_until_peak = 0
    for i in range(1, 13):
        idx = (current_month + i - 1) % 12 + 1
        if INDIAN_BUSINESS_CALENDAR[idx]["pattern"] in ["peak", "rush"]:
            months_until_peak = i
            break

    insights = {
        "best_quarter": quarters[-1][0],
        "worst_quarter": quarters[0][0],
        "seasonality_index": round((std_rev / mean_rev * 100) if mean_rev > 0 else 0, 1),
        "months_until_next_peak": months_until_peak
    }
    
    return {
        "monthly_plan": monthly_plan,
        "insights": insights
    }

async def get_seasonal_insights(db, owner_id: str):
    plan = await generate_seasonal_plan(db, owner_id)
    return plan["insights"]

async def save_seasonal_plan(db, owner_id: str, plan_data: dict):
    # Work on a copy — pymongo's insert_one mutates the dict in-place,
    # setting _id to an ObjectId which FastAPI cannot serialize.
    doc = dict(plan_data)
    doc["owner_id"] = owner_id
    doc["created_at"] = datetime.utcnow()

    await db["seasonal_plans"].insert_one(doc)
    # serialize_doc converts _id ObjectId → "id" string
    return serialize_doc(doc)

async def get_seasonal_history(db, owner_id: str):
    plans = await db["seasonal_plans"].find({"owner_id": owner_id}).sort("created_at", -1).to_list(None)
    return serialize_list(plans)
