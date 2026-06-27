"""
Run this FIRST after setting up MongoDB, before starting the full app.
It just checks the connection works and shows you what's inside your database.

Usage (from backend/ folder, with venv activated):
    python test_mongo_connection.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def main():
    print(f"Connecting to: {settings.MONGO_URI}")
    print(f"Database name: {settings.MONGO_DB_NAME}")
    print("-" * 50)

    client = AsyncIOMotorClient(settings.MONGO_URI)

    try:
        await client.admin.command("ping")
        print("✅ Connection successful!\n")
    except Exception as e:
        print(f"❌ Connection FAILED: {e}")
        print("\nTroubleshooting:")
        print("1. Is MongoDB running? Try: brew services list")
        print("2. Check your MONGO_URI in backend/.env")
        print("3. If using MongoDB Atlas, check your IP is whitelisted")
        return

    db = client[settings.MONGO_DB_NAME]

    # List all collections (will be empty on first run — that's normal)
    collections = await db.list_collection_names()
    print(f"Collections in '{settings.MONGO_DB_NAME}': {collections if collections else '(none yet — totally normal on first run)'}")

    # Show document counts per collection
    for coll_name in collections:
        count = await db[coll_name].count_documents({})
        print(f"  - {coll_name}: {count} documents")

    client.close()
    print("\nMongoDB is ready. You can now run: uvicorn app.main:app --reload")


if __name__ == "__main__":
    asyncio.run(main())
