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

# Loaded once when the server starts — loading it per-request would be very slow
_model = None


def get_embedding_model():
    global _model
    if _model is None:
        print("Loading embedding model (first time only, downloads ~80MB)...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_texts(texts: list[str]) -> np.ndarray:
    """Convert a list of text chunks into a list of embedding vectors."""
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings


def embed_query(query: str) -> np.ndarray:
    """Convert a single search query into an embedding vector."""
    model = get_embedding_model()
    return model.encode([query], convert_to_numpy=True, show_progress_bar=False)[0]
