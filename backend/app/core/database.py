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
    mongodb.client = AsyncIOMotorClient(settings.MONGO_URI)
    mongodb.db = mongodb.client[settings.MONGO_DB_NAME]

    # This line actually tests the connection (Motor connects lazily otherwise)
    await mongodb.client.admin.command("ping")
    print(f"✅ Connected to MongoDB: {settings.MONGO_DB_NAME}")

    # Create indexes — this is a MongoDB performance concept.
    # An index makes searching by that field much faster (like a SQL index).
    # unique=True also enforces no duplicate emails at the database level.
    await mongodb.db.users.create_index("email", unique=True)
    await mongodb.db.clients.create_index("owner_id")
    await mongodb.db.invoices.create_index("owner_id")
    await mongodb.db.invoices.create_index("client_id")
    await mongodb.db.documents.create_index("owner_id")


async def close_mongo_connection():
    """Called once when the FastAPI app shuts down."""
    mongodb.client.close()
    print("MongoDB connection closed.")


def get_database():
    """
    Dependency-injectable accessor.
    Every route that needs the DB will call: db = Depends(get_database)
    """
    return mongodb.db
