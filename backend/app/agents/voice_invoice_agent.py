"""
Voice-to-Invoice Agent — matches spoken client name and extracts invoice items.
"""
from difflib import SequenceMatcher
from app.agents.invoice_agent import extract_invoice_items

NAME_MATCH_THRESHOLD = 0.8


def _name_match_score(candidate: str, name_part: str) -> float:
    """
    Strict scoring to avoid false-positive client matches.
    Exact match = 1.0. Short strings or low fuzzy ratio = 0.0.
    Only returns a score >= 0.8 fuzzy match, preventing coincidental
    character overlap (e.g. Hindi words matching client names by accident).
    """
    c = candidate.lower().strip()
    n = name_part.lower().strip()

    if c == n:
        return 1.0

    if len(c) < 3 or len(n) < 3:
        return 0.0

    ratio = SequenceMatcher(None, c, n).ratio()
    return ratio if ratio >= 0.8 else 0.0


async def find_client_mentioned_in_text(db, owner_id, transcript: str) -> dict | None:
    cursor = db.clients.find({"owner_id": owner_id})
    clients = await cursor.to_list(length=500)

    if not clients:
        return None

    words = transcript.replace(",", " ").split()
    candidates = words + [f"{a} {b}" for a, b in zip(words, words[1:])]

    best_client = None
    best_score = 0.0

    for client in clients:
        client_name = client.get("name", "")
        if not client_name:
            continue

        name_parts = [client_name] + [p for p in client_name.split() if len(p) >= 3]

        for candidate in candidates:
            for name_part in name_parts:
                score = _name_match_score(candidate, name_part)
                if score > best_score:
                    best_score = score
                    best_client = client

    if best_client and best_score >= NAME_MATCH_THRESHOLD:
        return best_client
    return None


async def process_voice_invoice(db, owner_id, transcript: str) -> dict:
    matched_client = await find_client_mentioned_in_text(db, owner_id, transcript)

    default_rate = matched_client.get("default_rate") if matched_client else None
    raw_items = await extract_invoice_items(transcript, default_rate=default_rate)

    items = []
    for item in raw_items:
        quantity = float(item.get("quantity", 1) or 1)
        rate = float(item.get("rate", 0) or 0)
        items.append({
            "description": item.get("description", transcript)[:200],
            "quantity": quantity,
            "rate": rate,
            "amount": round(quantity * rate, 2),
        })

    return {
        "transcript": transcript,
        "items": items,
        "client_id": str(matched_client["_id"]) if matched_client else None,
        "client_name": matched_client.get("name") if matched_client else None,
        "matched_client_automatically": matched_client is not None,
    }