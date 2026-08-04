from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc
from app.schemas.goal_schema import IncomeGoalCreate
from app.services.goal_service import get_goal_progress

router = APIRouter(prefix="/api/goals", tags=["Goals"])

@router.post("")
async def create_goal(
    goal_data: IncomeGoalCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    owner_id = current_user["_id"]
    goal_dict = goal_data.dict()
    goal_dict["owner_id"] = owner_id
    goal_dict["created_at"] = datetime.utcnow()
    
    existing = await db["income_goals"].find_one({"owner_id": owner_id, "month": goal_dict["month"]})
    
    if existing:
        await db["income_goals"].update_one(
            {"_id": existing["_id"]},
            {"$set": {"monthly_target": goal_dict["monthly_target"], "notes": goal_dict.get("notes")}}
        )
        goal_dict["_id"] = existing["_id"]
    else:
        result = await db["income_goals"].insert_one(goal_dict)
        goal_dict["_id"] = result.inserted_id
        
    return serialize_doc(goal_dict)

@router.get("/current")
async def get_current_goal(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    owner_id = current_user["_id"]
    now = datetime.now()
    current_month = f"{now.year}-{now.month:02d}"
    
    goal = await db["income_goals"].find_one({"owner_id": owner_id, "month": current_month})
    if not goal:
        return None
        
    progress = await get_goal_progress(db, owner_id, goal)
    return serialize_doc(progress)

@router.get("/history")
async def get_goal_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    owner_id = current_user["_id"]
    goals_cursor = db["income_goals"].find({"owner_id": owner_id}).sort("month", -1)
    
    goals = await goals_cursor.to_list(length=50) if hasattr(goals_cursor, 'to_list') else list(goals_cursor)
    
    history = []
    for goal in goals:
        progress = await get_goal_progress(db, owner_id, goal)
        history.append(serialize_doc(progress))
        
    return history

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    owner_id = current_user["_id"]
    try:
        obj_id = ObjectId(goal_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid goal ID")
        
    result = await db["income_goals"].delete_one({"_id": obj_id, "owner_id": owner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    return {"message": "Goal deleted successfully"}
