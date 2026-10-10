from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException

def parse_object_id(id_str: str) -> ObjectId:
    """Parses a string into a MongoDB ObjectId, raising a 400 error if invalid."""
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid ID format")
