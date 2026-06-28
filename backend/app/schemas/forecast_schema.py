"""
Schemas for the Predictive Cash Flow Forecasting feature.
"""
from pydantic import BaseModel
from typing import Optional


class MonthlyRevenuePoint(BaseModel):
    """One month of historical revenue, used both as input to the model and as chart data."""
    month_label: str   # e.g. "2026-04" (YYYY-MM), easy to sort and display
    total_revenue: float


class ForecastPoint(BaseModel):
    """One predicted future month."""
    month_label: str
    predicted_revenue: float
    lower_bound: float  # simple confidence band, not predicted_revenue - this is the floor estimate
    upper_bound: float  # ceiling estimate


class CashFlowForecastOut(BaseModel):
    history: list[MonthlyRevenuePoint]
    forecast: list[ForecastPoint]
    confidence_level: str          # "high" | "medium" | "low" | "insufficient_data"
    confidence_explanation: str    # plain-language reason for the confidence level
    trend_direction: str           # "increasing" | "decreasing" | "flat" | "unknown"
    average_monthly_revenue: float
    r_squared: Optional[float] = None  # how well the trend line fits the historical data (0-1)
    months_used: int