"""
Predictive Cash Flow Forecasting — core ML logic.

CONCEPT: We use a simple LINEAR REGRESSION on monthly aggregated revenue,
not a heavy library like Prophet. Reasons:
1. Prophet needs a compiled Stan backend (cmdstanpy) that's painful to
   install reliably on student laptops (especially Apple Silicon) and is
   massive overkill for a few months of invoice data.
2. A freelancer's invoice history is typically short (a handful of months)
   and noisy — a complex seasonal model would just overfit nonsense.
3. Linear regression is transparent and explainable: "revenue is trending
   up/down by X per month" is something you can defend in a viva, unlike
   a black-box seasonal decomposition.

HONESTY OVER FALSE PRECISION: We deliberately compute and report a
confidence_level alongside every forecast, based on how much history exists
and how well the trend line actually fits that history (R²). A forecast
from 2 noisy months is NOT presented with the same confidence as one from
8 consistent months. This is what makes the feature "accurate" in the sense
that matters: it doesn't lie about its own certainty.
"""
import numpy as np
from datetime import datetime
from collections import OrderedDict
from sklearn.linear_model import LinearRegression

from app.schemas.forecast_schema import MonthlyRevenuePoint, ForecastPoint

MIN_MONTHS_FOR_FORECAST = 3  # below this, a trend line is statistically meaningless


class InsufficientDataError(Exception):
    """Raised when there isn't enough invoice history to produce a meaningful forecast."""
    pass


async def get_monthly_revenue_history(db, owner_id) -> list[MonthlyRevenuePoint]:
    """
    Aggregates PAID invoices by calendar month using MongoDB's aggregation
    pipeline. We only count 'paid' invoices — pending/draft invoices aren't
    real revenue yet and would distort the trend.

    CONCEPT: $dateToString groups by year-month directly inside MongoDB,
    so we don't have to pull every invoice into Python and group manually.
    """
    pipeline = [
        {"$match": {"owner_id": owner_id, "status": "paid"}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
                "total_revenue": {"$sum": "$total"},
            }
        },
        {"$sort": {"_id": 1}},  # chronological order
    ]
    rows = await db.invoices.aggregate(pipeline).to_list(length=240)  # 20 years of months, generous cap

    points = [MonthlyRevenuePoint(month_label=r["_id"], total_revenue=r["total_revenue"]) for r in rows]
    if not points:
        return points

    filled_points = []
    current_label = points[0].month_label
    end_label = points[-1].month_label

    point_map = {p.month_label: p.total_revenue for p in points}

    while True:
        revenue = point_map.get(current_label, 0)
        filled_points.append(MonthlyRevenuePoint(month_label=current_label, total_revenue=revenue))
        
        if current_label == end_label:
            break
            
        y, m = map(int, current_label.split("-"))
        m += 1
        if m > 12:
            m = 1
            y += 1
        current_label = f"{y:04d}-{m:02d}"

    return filled_points


def _next_month_labels(last_label: str, count: int) -> list[str]:
    """Given '2026-04', returns the next `count` month labels: ['2026-05', '2026-06', ...]."""
    year, month = map(int, last_label.split("-"))
    labels = []
    for _ in range(count):
        month += 1
        if month > 12:
            month = 1
            year += 1
        labels.append(f"{year:04d}-{month:02d}")
    return labels


def _determine_confidence(n_months: int, r_squared: float) -> tuple[str, str]:
    """
    Returns (confidence_level, plain_language_explanation).
    This heuristic is intentionally conservative — it's better to honestly
    say "low confidence" than to overstate a forecast from thin data.
    """
    if n_months < MIN_MONTHS_FOR_FORECAST:
        return (
            "insufficient_data",
            f"Only {n_months} month(s) of paid invoice history found. At least "
            f"{MIN_MONTHS_FOR_FORECAST} months are needed for a meaningful trend.",
        )
    if n_months >= 6 and r_squared >= 0.6:
        return (
            "high",
            f"{n_months} months of history with a consistent trend (fit quality {r_squared:.2f}).",
        )
    if n_months >= 4 and r_squared >= 0.3:
        return (
            "medium",
            f"{n_months} months of history with a moderately consistent trend (fit quality {r_squared:.2f}). "
            "Revenue varies somewhat month to month, so treat this as a rough guide.",
        )
    return (
        "low",
        f"{n_months} months of history, but revenue is quite volatile month to month "
        f"(fit quality {r_squared:.2f}). This forecast should be treated as a loose estimate only.",
    )


async def generate_cash_flow_forecast(db, owner_id, forecast_months: int = 3) -> dict:
    """
    Main entry point. Fetches monthly revenue history from MongoDB, fits a
    linear regression, and returns a forecast for the next `forecast_months`
    months along with an honest confidence assessment.

    Raises InsufficientDataError if there's no usable history at all (0 paid
    invoices) — a clean, catchable error rather than a crash.
    """
    history = await get_monthly_revenue_history(db, owner_id)

    if len(history) == 0:
        raise InsufficientDataError(
            "No paid invoices found yet. Mark some invoices as 'paid' to start building forecast history."
        )

    n_months = len(history)
    revenue_values = np.array([h.total_revenue for h in history])
    average_monthly_revenue = float(np.mean(revenue_values))

    if n_months < MIN_MONTHS_FOR_FORECAST:
        # Not enough data to fit a trend line at all. Return history with an
        # honest "insufficient_data" status instead of a fabricated forecast.
        confidence_level, explanation = _determine_confidence(n_months, 0.0)
        return {
            "history": history,
            "forecast": [],
            "confidence_level": confidence_level,
            "confidence_explanation": explanation,
            "trend_direction": "unknown",
            "average_monthly_revenue": average_monthly_revenue,
            "r_squared": None,
            "months_used": n_months,
        }

    # --- Fit linear regression: x = month index (0, 1, 2, ...), y = revenue ---
    month_indices = np.arange(n_months).reshape(-1, 1)
    model = LinearRegression()
    model.fit(month_indices, revenue_values)
    r_squared = float(model.score(month_indices, revenue_values))

    slope = float(model.coef_[0])
    if abs(slope) < 0.01 * max(average_monthly_revenue, 1):
        trend_direction = "flat"
    elif slope > 0:
        trend_direction = "increasing"
    else:
        trend_direction = "decreasing"

    # --- Predict future months ---
    future_indices = np.arange(n_months, n_months + forecast_months).reshape(-1, 1)
    raw_predictions = model.predict(future_indices)

    # Revenue can never be negative — clamp the floor at zero. A naive
    # regression on a sharply declining trend CAN mathematically predict
    # negative revenue, which is meaningless in the real world.
    clamped_predictions = np.maximum(raw_predictions, 0)

    # Simple confidence band: +/- 1 standard deviation of historical residuals.
    # This is NOT a rigorous statistical prediction interval, but gives a
    # reasonable, easy-to-explain "could be as low as X or as high as Y" range
    # rather than presenting a single number as if it were certain.
    residuals = revenue_values - model.predict(month_indices)
    residual_std = float(np.std(residuals)) if n_months > 1 else 0.0

    future_labels = _next_month_labels(history[-1].month_label, forecast_months)

    forecast_points = []
    for label, pred in zip(future_labels, clamped_predictions):
        lower = max(0.0, float(pred) - residual_std)
        upper = float(pred) + residual_std
        forecast_points.append(ForecastPoint(
            month_label=label,
            predicted_revenue=round(float(pred), 2),
            lower_bound=round(lower, 2),
            upper_bound=round(upper, 2),
        ))

    confidence_level, explanation = _determine_confidence(n_months, r_squared)

    return {
        "history": history,
        "forecast": forecast_points,
        "confidence_level": confidence_level,
        "confidence_explanation": explanation,
        "trend_direction": trend_direction,
        "average_monthly_revenue": round(average_monthly_revenue, 2),
        "r_squared": round(r_squared, 4),
        "months_used": n_months,
    }