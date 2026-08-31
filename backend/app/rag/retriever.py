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


async def store_document_chunks(db, model, owner_id, filename: str, chunks: list[str], client_id=None) -> int:
    """Embeds each chunk and inserts it as a MongoDB document."""
    if not chunks:
        return 0

    embeddings = embed_texts(model, chunks)

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


async def search_similar_chunks(db, model, owner_id, query: str, client_id=None, top_k: int = 4) -> list[dict]:
    """
    Finds the most semantically relevant chunks for a query.
    Returns chunks sorted by similarity, highest first.
    """
    query_filter = {"owner_id": owner_id}
    if client_id:
        query_filter["client_id"] = client_id

    query_embedding = embed_query(model, query)
    
    # Required MongoDB Atlas Vector Search Index definition (create in Atlas UI):
    # {
    #   "fields": [
    #     {
    #       "numDimensions": 384,
    #       "path": "embedding",
    #       "similarity": "cosine",
    #       "type": "vector"
    #     },
    #     {
    #       "path": "owner_id",
    #       "type": "filter"
    #     },
    #     {
    #       "path": "client_id",
    #       "type": "filter"
    #     }
    #   ]
    # }

    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_embedding.tolist(),
                "numCandidates": top_k * 10,
                "limit": top_k,
                "filter": query_filter
            }
        },
        {
            "$project": {
                "text": "$chunk_text",
                "filename": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]

    try:
        cursor = db.documents.aggregate(pipeline)
        scored = await cursor.to_list(length=top_k)
        return scored
    except Exception as e:
        # Fallback for local MongoDB without $vectorSearch
        cursor = db.documents.find(query_filter)
        all_chunks = await cursor.to_list(length=10000)
        
        scored_chunks = []
        for doc in all_chunks:
            if "embedding" in doc:
                doc_embedding = np.array(doc["embedding"])
                score = cosine_similarity(query_embedding, doc_embedding)
                scored_chunks.append({
                    "text": doc.get("chunk_text"),
                    "filename": doc.get("filename"),
                    "score": score
                })
        
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]