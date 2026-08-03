from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class IncomeGoalCreate(BaseModel):
    monthly_target: float = Field(..., gt=0, description="The target income for the month")
    month: str = Field(..., description="Month in YYYY-MM format")
    notes: Optional[str] = None

class ActionItem(BaseModel):
    description: str

class ReversePlanOption(BaseModel):
    title: str
    description: str

class GoalProgressResponse(BaseModel):
    goal_id: str
    monthly_target: float
    month: str
    earned: float
    pending: float
    pipeline: float
    gap: float
    completion_percentage: float
    days_remaining: int
    daily_target: float
    reverse_plan_options: List[ReversePlanOption]
    action_items: List[ActionItem]
    pipeline_items: List[Dict[str, Any]]
