"""
MongoDB connection setup.

CONCEPT: We use Motor, which is the official ASYNC MongoDB driver for Python.
FastAPI is async (uses 'async def' routes), so we need a driver that doesn't
block the whole server while waiting for the database to respond.

(pymongo is the SYNC version — fine for scripts, but blocks FastAPI's event loop)

How MongoDB connections work:
1. MongoClient connects to a MongoDB server (local or Atlas cloud)
2. client[db_name] gives you a Database object
3. db[collection_name] gives you a Collection object (like a SQL table, but schema-less)
4. You run operations on collections: insert_one, find, update_one, delete_one, etc.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


class MongoDB:
    client: AsyncIOMotorClient = None
    db = None


mongodb = MongoDB()


async def connect_to_mongo():
    """Called once when the FastAPI app starts up."""
    mongodb.client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    mongodb.db = mongodb.client[settings.MONGO_DB_NAME]

    # This line actually tests the connection (Motor connects lazily otherwise)
    await mongodb.client.admin.command("ping")
    print(f"✅ Connected to MongoDB: {settings.MONGO_DB_NAME}")

    # Create indexes — this is a MongoDB performance concept.
    # An index makes searching by that field much faster (like a SQL index).
    # unique=True also enforces no duplicate emails at the database level.
    indexes = [
        (mongodb.db.users, "email", {"unique": True}),
        (mongodb.db.clients, "owner_id", {}),
        
        # Invoices
        (mongodb.db.invoices, "owner_id", {}),
        (mongodb.db.invoices, "client_id", {}),
        (mongodb.db.invoices, [("owner_id", 1), ("invoice_number", 1)], {"unique": True}),
        (mongodb.db.invoices, [("owner_id", 1), ("status", 1), ("due_date", 1)], {}),
        (mongodb.db.invoices, [("owner_id", 1), ("created_at", 1)], {}),
        
        # Documents
        (mongodb.db.documents, "owner_id", {}),
        (mongodb.db.documents, [("doc_id", 1), ("chunk_index", 1)], {}),
        (mongodb.db.documents_meta, [("owner_id", 1), ("sha256", 1)], {"unique": True}),
        (mongodb.db.contract_risk_reports, "owner_id", {}),
        (mongodb.db.contract_risk_reports, "filename", {}),
        
        # WhatsApp Reminders
        (mongodb.db.whatsapp_reminders, "owner_id", {}),
        (mongodb.db.whatsapp_reminders, [("invoice_id", 1), ("sent_date", 1)], {"unique": True}),
        
        # Negotiation Sessions
        (mongodb.db.negotiation_sessions, "owner_id", {}),
        (mongodb.db.negotiation_sessions, "status", {}),
        
        # Payments
        (mongodb.db.payments, [("invoice_id", 1), ("owner_id", 1)], {}),
        (mongodb.db.payments, [("owner_id", 1), ("paid_at", 1)], {}),
        
        # Counters
        (mongodb.db.counters, [("owner_id", 1), ("fy", 1)], {"unique": True}),

        # Others
        (mongodb.db.client_profiles, "owner_id", {}),
        (mongodb.db.client_profiles, "analyzed_at", {}),
        (mongodb.db.contracts, "owner_id", {}),
        (mongodb.db.contracts, "client_id", {}),
        (mongodb.db.meetings, "owner_id", {}),
        (mongodb.db.meetings, "client_id", {}),
        (mongodb.db.disputes, "owner_id", {}),
        (mongodb.db.disputes, "client_id", {}),
        (mongodb.db.proposals, "owner_id", {}),
        (mongodb.db.proposals, "outcome", {}),
        (mongodb.db.proposals, "service_type", {}),
        (mongodb.db.escalation_logs, "owner_id", {}),
        (mongodb.db.escalation_logs, "invoice_id", {}),
        (mongodb.db.scope_projects, "owner_id", {}),
        (mongodb.db.scope_projects, "client_id", {}),
        (mongodb.db.mental_load_snapshots, "owner_id", {}),
        (mongodb.db.mental_load_snapshots, "created_at", {}),
        (mongodb.db.contract_comparisons, "owner_id", {}),
        (mongodb.db.contract_comparisons, "created_at", {}),
        (mongodb.db.seasonal_plans, "owner_id", {}),
        (mongodb.db.seasonal_plans, "created_at", {}),
    ]
    for coll, key, kwargs in indexes:
        try:
            await coll.create_index(key, **kwargs)
        except Exception as e:
            print(f"Failed to create index on {coll.name}: {e}")


async def close_mongo_connection():
    """Called once when the FastAPI app shuts down."""
    if mongodb.client is not None:
        mongodb.client.close()
        print("MongoDB connection closed.")


def get_database():
    """
    Dependency-injectable accessor.
    Every route that needs the DB will call: db = Depends(get_database)
    """
    return mongodb.db