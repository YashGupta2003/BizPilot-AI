"""
MongoDB stores a special type called ObjectId for the _id field.
FastAPI/Pydantic can't convert ObjectId to JSON automatically, so we need
a small helper to turn it into a plain string before sending it to the frontend.

CONCEPT: This is a recurring MongoDB + FastAPI pattern you'll use constantly.
"""
from bson import ObjectId
from datetime import datetime


def serialize_value(val):
    if isinstance(val, dict):
        return serialize_doc(val)
    elif isinstance(val, list):
        return [serialize_value(v) for v in val]
    elif isinstance(val, ObjectId):
        return str(val)
    elif isinstance(val, datetime):
        return val.isoformat()
    return val


def serialize_doc(doc: dict) -> dict:
    """Convert a single MongoDB document into a JSON-safe dict."""
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    
    for key, value in doc.items():
        doc[key] = serialize_value(value)
        
    return doc


def serialize_list(docs: list) -> list:
    return [serialize_doc(doc) for doc in docs]
