"""
RAG Step 2: Convert text chunks into embeddings (vectors of numbers).

CONCEPT: We use sentence-transformers, which runs LOCALLY on your MacBook —
no API cost, no internet needed after the first download. This is a great
choice for learning because you can inspect every step.

The model "all-MiniLM-L6-v2" converts any text into a 384-number vector.
Texts with similar MEANING get vectors that are close together in this
384-dimensional space — that's what makes semantic search possible.
"""
from sentence_transformers import SentenceTransformer
import numpy as np

import asyncio
from functools import partial

async def load_embedding_model_async():
    print("Loading embedding model in background (~80MB)...")
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, SentenceTransformer, "all-MiniLM-L6-v2")


def embed_texts(model: SentenceTransformer, texts: list[str]) -> np.ndarray:
    """Convert a list of text chunks into a list of embedding vectors."""
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings


def embed_query(model: SentenceTransformer, query: str) -> np.ndarray:
    """Convert a single search query into an embedding vector."""
    return model.encode([query], convert_to_numpy=True, show_progress_bar=False)[0]
