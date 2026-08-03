"""
Main FastAPI app — this is the file you actually run.
Run with: uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.routes import auth_routes, client_routes, invoice_routes, chat_routes, dashboard_routes, risk_routes, forecast_routes, voice_routes, whatsapp_routes, currency_routes, negotiation_routes, profiler_routes, burnout_routes, contract_routes,meeting_routes, portfolio_routes,client_360_routes, activity_routes, dispute_routes, ltv_routes, winrate_routes, escalation_routes, tax_routes, scope_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once on startup
    await connect_to_mongo()
    yield
    # Runs once on shutdown
    await close_mongo_connection()


app = FastAPI(
    title="BizPilot AI",
    description="Autonomous business assistant for freelancers and small businesses",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — lets the React frontend (running on a different port) talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route modules
app.include_router(auth_routes.router)
app.include_router(client_routes.router)
app.include_router(invoice_routes.router)
app.include_router(chat_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(risk_routes.router)
app.include_router(forecast_routes.router)
app.include_router(voice_routes.router)
app.include_router(whatsapp_routes.router)
app.include_router(currency_routes.router)
app.include_router(negotiation_routes.router)
app.include_router(profiler_routes.router)
app.include_router(burnout_routes.router)
app.include_router(contract_routes.router)
app.include_router(meeting_routes.router)
app.include_router(portfolio_routes.router)
app.include_router(client_360_routes.router)
app.include_router(activity_routes.router)
app.include_router(dispute_routes.router)
app.include_router(ltv_routes.router)
app.include_router(winrate_routes.router)
app.include_router(escalation_routes.router)
app.include_router(tax_routes.router)
app.include_router(scope_routes.router)

@app.get("/")
async def root():
    return {"message": "BizPilot AI backend is running", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}