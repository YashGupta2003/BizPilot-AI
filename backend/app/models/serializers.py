"""
MongoDB stores a special type called ObjectId for the _id field.
FastAPI/Pydantic can't convert ObjectId to JSON automatically, so we need
a small helper to turn it into a plain string before sending it to the frontend.

CONCEPT: This is a recurring MongoDB + FastAPI pattern you'll use constantly.
"""
from bson import ObjectId


def serialize_doc(doc: dict) -> dict:
    """Convert a single MongoDB document into a JSON-safe dict."""
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    # Convert any other ObjectId fields (like client_id references)
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
    return doc


def serialize_list(docs: list) -> list:
    return [serialize_doc(doc) for doc in docs]
