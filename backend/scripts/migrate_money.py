import asyncio
import argparse
import os
import sys

# Add backend to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.database import connect_to_mongo, close_mongo_connection, mongodb
from app.services.invoice_service import to_paise

async def migrate_money(apply=False):
    await connect_to_mongo()
    db = mongodb.db
    
    cursor = db.invoices.find({"amount_paise": {"$exists": False}})
    invoices = await cursor.to_list(length=None)
    
    updates_made = 0
    for inv in invoices:
        update_fields = {}
        
        for field in ["subtotal", "tax_amount", "total"]:
            val = inv.get(field)
            if val is not None:
                update_fields[f"{field}_paise"] = to_paise(val)
                
        # Also migrate items
        items = inv.get("items", [])
        updated_items = False
        for item in items:
            amt = item.get("amount")
            if amt is not None and "amount_paise" not in item:
                item["amount_paise"] = to_paise(amt)
                updated_items = True
                
        if updated_items:
            update_fields["items"] = items
            
        if update_fields:
            if not apply:
                print(f"[Dry Run] Would update invoice {inv['_id']}: {update_fields.keys()}")
            else:
                await db.invoices.update_one({"_id": inv["_id"]}, {"$set": update_fields})
                print(f"Updated invoice {inv['_id']}")
            updates_made += 1
            
    print(f"\nMigration complete. Documents {'updated' if apply else 'to be updated'}: {updates_made}")
    await close_mongo_connection()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate invoice amounts to paise.")
    parser.add_argument("--apply", action="store_true", help="Apply the migration")
    parser.add_argument("--dry-run", action="store_true", help="Dry run (default)")
    args = parser.parse_args()
    
    apply = args.apply
    if args.dry_run and apply:
        apply = False
        
    asyncio.run(migrate_money(apply=apply))
