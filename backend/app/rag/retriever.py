"""
RAG Step 3 & 4: Store embeddings in MongoDB, then search them.

CONCEPT — storing vectors in MongoDB:
MongoDB documents can store ANY JSON-like structure, including arrays of numbers.
So each chunk becomes a document like:
{
  "owner_id": ...,
  "client_id": ...,  (optional — scope documents to a specific client)
  "filename": "contract.pdf",
  "chunk_text": "...",
  "embedding": [0.123, -0.045, ...]   <- 384 numbers
}

CONCEPT — similarity search without a vector database:
For a small personal app (a few hundred/thousand chunks), we don't need a
dedicated vector database. We fetch all the user's chunks, compute cosine
similarity in Python with numpy, and sort. This is O(n) but totally fine
at this scale, and it means you're not learning a 4th piece of infrastructure
on top of MongoDB. (For production scale, MongoDB Atlas has native $vectorSearch —
mentioned in the docs for later.)
"""
import numpy as np
from app.rag.embedder import embed_texts, embed_query


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))


async def store_document_chunks(db, owner_id, filename: str, chunks: list[str], client_id=None) -> int:
    """Embeds each chunk and inserts it as a MongoDB document."""
    if not chunks:
        return 0

    embeddings = embed_texts(chunks)

    documents = []
    for index, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        documents.append({
            "owner_id": owner_id,
            "client_id": client_id,
            "filename": filename,
            "chunk_text": chunk,
            "chunk_index": index,  # preserves original document order for full-text reconstruction
            "embedding": embedding.tolist(),  # numpy array -> plain list so MongoDB can store it
        })

    # insert_many = bulk insert, much faster than looping insert_one
    await db.documents.insert_many(documents)
    return len(documents)


async def get_full_document_text(db, owner_id, filename: str) -> str:
    """
    Reassembles a document's full text from its stored chunks, in original
    order. Used by features (like the risk analyzer) that need to see the
    WHOLE document rather than a few similarity-matched chunks.

    NOTE: chunks were created with overlap (see document_loader.chunk_text),
    so the reassembled text will have some duplicated text at chunk
    boundaries. That's fine for an LLM to read — it's redundant, not wrong —
    but don't use this reconstructed text for exact-match operations.
    """
    cursor = db.documents.find({"owner_id": owner_id, "filename": filename}).sort("chunk_index", 1)
    chunks = await cursor.to_list(length=5000)
    return "\n".join(c["chunk_text"] for c in chunks)


async def search_similar_chunks(db, owner_id, query: str, client_id=None, top_k: int = 4) -> list[dict]:
    """
    Finds the most semantically relevant chunks for a query.
    Returns chunks sorted by similarity, highest first.
    """
    query_filter = {"owner_id": owner_id}
    if client_id:
        query_filter["client_id"] = client_id

    cursor = db.documents.find(query_filter)
    all_chunks = await cursor.to_list(length=5000)

    if not all_chunks:
        return []

    query_embedding = embed_query(query)

    scored = []
    for chunk in all_chunks:
        chunk_embedding = np.array(chunk["embedding"])
        score = cosine_similarity(query_embedding, chunk_embedding)
        scored.append({"text": chunk["chunk_text"], "filename": chunk["filename"], "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]