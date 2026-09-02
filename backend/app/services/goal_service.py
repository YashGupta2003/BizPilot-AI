from datetime import datetime
import calendar
from bson import ObjectId
from app.services.winrate_service import predict_win_probability, _classify_client_type

SERVICE_MARKET_RATES = {
    "Web Development": 45000,
    "Brand Identity": 40000,
    "UI/UX Design": 35000,
    "SEO Services": 25000,
    "Content Writing": 15000
}

async def get_reverse_plan(db, owner_id: str, gap: float, target: float, win_rate: float):
    options = []
    actions = []
    
    if gap <= 0:
        return options, [{"description": "You have hit or are on track to hit your goal! Keep delivering great work."}]
        
    count_a = max(1, round(gap / SERVICE_MARKET_RATES["Web Development"]))
    options.append({
        "title": f"Option A: Web Development",
        "description": f"Close {count_a} Web Dev project(s) at ₹{SERVICE_MARKET_RATES['Web Development']} each"
    })
    
    count_b = max(1, round(gap / SERVICE_MARKET_RATES["Brand Identity"]))
    options.append({
        "title": f"Option B: Brand Identity",
        "description": f"Close {count_b} Brand Identity project(s) at ₹{SERVICE_MARKET_RATES['Brand Identity']} each"
    })
    
    safe_win_rate = win_rate if win_rate > 0 else 0.01
    proposals_needed = max(1, round((gap / 30000) / safe_win_rate))
    options.append({
        "title": f"Option C: Volume Outreach",
        "description": f"Send {proposals_needed} proposals (at your {int(win_rate*100)}% win rate)"
    })
    
    actions.append({"description": f"Send out {proposals_needed} targeted proposals this week."})
    actions.append({"description": "Follow up on pending invoices to convert ₹ into earned revenue."})
    actions.append({"description": "Reach out to past clients offering a retainer service."})
    
    return options, actions

async def get_goal_progress(db, owner_id: str, goal: dict) -> dict:
    month_str = goal.get("month")
    target = goal.get("monthly_target", 0)
    
    try:
        year, month = map(int, month_str.split('-'))
        start_date = datetime(year, month, 1)
        _, last_day = calendar.monthrange(year, month)
        end_date = datetime(year, month, last_day, 23, 59, 59)
    except Exception:
        year, month = datetime.now().year, datetime.now().month
        start_date = datetime(year, month, 1)
        _, last_day = calendar.monthrange(year, month)
        end_date = datetime(year, month, last_day, 23, 59, 59)

    invoices_cursor = db["invoices"].find({
        "owner_id": owner_id,
        "created_at": {"$gte": start_date, "$lte": end_date}
    })
    
    invoices = await invoices_cursor.to_list(length=100) if hasattr(invoices_cursor, 'to_list') else list(invoices_cursor)
    
    earned = sum(inv.get("total", 0) for inv in invoices if inv.get("status") == "paid")
    pending = sum(inv.get("total", 0) for inv in invoices if inv.get("status") in ["sent", "draft", "pending"])
    
    proposals_cursor = db["proposals"].find({
        "owner_id": owner_id,
        "outcome": "pending"
    })
    
    proposals = await proposals_cursor.to_list(length=100) if hasattr(proposals_cursor, 'to_list') else list(proposals_cursor)
    
    default_win_rate = 0.45
    pipeline = 0
    pipeline_items = []
    
    for prop in proposals:
        amount = prop.get("amount", 0)
        # Compute actual win probability using historical data
        try:
            prediction = await predict_win_probability(
                db, owner_id,
                prop.get("service_type", "Unknown"),
                amount,
                prop.get("client_type", "Unknown"),
            )
            # predict_win_probability returns percentage (0-100), convert to decimal
            prob = prediction.get("win_probability", default_win_rate * 100) / 100
        except Exception:
            prob = default_win_rate
        val = amount * prob
        pipeline += val
        pipeline_items.append({
            "title": prop.get("service_type", "Unknown Service"),
            "client": prop.get("client_name", "Unknown"),
            "amount": amount,
            "win_probability": prob,
            "expected_value": val
        })
        
    gap = target - earned - (pending * 0.7) - pipeline
    if gap < 0:
        gap = 0
        
    completion_percentage = (earned / target) * 100 if target > 0 else 0
    
    now = datetime.now()
    if now.year == year and now.month == month:
        days_remaining = last_day - now.day
    elif now > end_date:
        days_remaining = 0
    else:
        days_remaining = last_day
        
    daily_target = gap / days_remaining if days_remaining > 0 else 0
    
    reverse_plan, action_items = await get_reverse_plan(db, owner_id, gap, target, default_win_rate)
    
    return {
        "goal_id": str(goal["_id"]),
        "monthly_target": target,
        "month": month_str,
        "earned": earned,
        "pending": pending,
        "pipeline": pipeline,
        "gap": gap,
        "completion_percentage": completion_percentage,
        "days_remaining": days_remaining,
        "daily_target": daily_target,
        "reverse_plan_options": reverse_plan,
        "action_items": action_items,
        "pipeline_items": pipeline_items
    }
