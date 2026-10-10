import asyncio
import argparse
from datetime import datetime, timezone
import os
import sys

# Add backend to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.database import connect_to_mongo, close_mongo_connection, mongodb
from app.utils import to_ist

async def migrate_dates(apply=False):
    await connect_to_mongo()
    db = mongodb.db
    
    cursor = db.invoices.find({})
    invoices = await cursor.to_list(length=None)
    
    updates_made = 0
    for inv in invoices:
        update_fields = {}
        
        for field in ["due_date", "issue_date"]:
            val = inv.get(field)
            if isinstance(val, str) and val:
                try:
                    # Attempt to parse YYYY-MM-DD
                    dt = datetime.strptime(val, "%Y-%m-%d")
                    # Convert to timezone aware (IST for business dates)
                    dt_aware = to_ist(dt)
                    update_fields[field] = dt_aware
                except ValueError:
                    print(f"Could not parse {field} for invoice {inv['_id']}: {val}")
                    
        if update_fields:
            if not apply:
                print(f"[Dry Run] Would update invoice {inv['_id']}: {update_fields}")
            else:
                await db.invoices.update_one({"_id": inv["_id"]}, {"$set": update_fields})
                print(f"Updated invoice {inv['_id']}")
            updates_made += 1
            
    print(f"\nMigration complete. Documents {'updated' if apply else 'to be updated'}: {updates_made}")
    await close_mongo_connection()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate invoice string dates to datetime objects.")
    parser.add_argument("--apply", action="store_true", help="Apply the migration")
    parser.add_argument("--dry-run", action="store_true", help="Dry run (default)")
    args = parser.parse_args()
    
    apply = args.apply
    if args.dry_run and apply:
        apply = False
        
    asyncio.run(migrate_dates(apply=apply))
