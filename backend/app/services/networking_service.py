from bson import ObjectId
from app.services.portfolio_service import SERVICE_KEYWORDS, classify_service_type

async def analyze_networking_opportunities(db, owner_id: str, client_id: str = None) -> dict:
    match_filter = {"owner_id": owner_id}
    
    if client_id:
        match_filter["client_id"] = client_id
        
    # Get paid invoices to understand current services
    invoices = await db["invoices"].find({**match_filter, "status": "paid"}).to_list(100)
    
    # Get lost proposals
    lost_proposals = await db["proposals"].find({**match_filter, "outcome": "lost"}).to_list(100)
    
    # Get meetings
    meetings = await db["meetings"].find(match_filter).to_list(100)
    
    # Analyze current services
    current_services = {}
    for inv in invoices:
        items = inv.get("items", [])
        for item in items:
            desc = item.get("description", "")
            if desc:
                srv_type = classify_service_type(desc)
                if srv_type != "Other":
                    current_services[srv_type] = current_services.get(srv_type, 0) + 1
                    
    current_service_list = list(current_services.keys())
    
    # Analyze gaps from lost proposals and meetings
    gaps = {}
    for prop in lost_proposals:
        desc = prop.get("title", "") + " " + prop.get("notes", "")
        srv_type = classify_service_type(desc)
        if srv_type != "Other" and srv_type not in current_service_list:
            if srv_type not in gaps:
                gaps[srv_type] = {"signals": [], "count": 0}
            gaps[srv_type]["signals"].append(f"Requested in lost proposal: {prop.get('title', 'Unknown')}")
            gaps[srv_type]["count"] += 1
            
    for meeting in meetings:
        desc = meeting.get("title", "") + " " + meeting.get("summary", "")
        srv_type = classify_service_type(desc)
        if srv_type != "Other" and srv_type not in current_service_list:
            if srv_type not in gaps:
                gaps[srv_type] = {"signals": [], "count": 0}
            gaps[srv_type]["signals"].append(f"Discussed in meeting: {meeting.get('title', 'Unknown')}")
            gaps[srv_type]["count"] += 1
            
    # Format gaps
    service_gaps = []
    for srv_type, data in gaps.items():
        count = data["count"]
        confidence = "HIGH" if count >= 3 else "MEDIUM" if count == 2 else "LOW"
        service_gaps.append({
            "service_type": srv_type,
            "demand_signals": list(set(data["signals"])),
            "confidence": confidence,
            "count": count
        })
        
    return {
        "current_services": current_services,
        "service_gaps": service_gaps
    }
