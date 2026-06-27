"""
RAG Step 1: Load documents and split into chunks.

CONCEPT: We can't feed a whole PDF to an LLM efficiently or search it well.
So we break it into small overlapping chunks first. Each chunk becomes
searchable independently.
"""
from pypdf import PdfReader
from docx import Document as DocxDocument
import os


def load_text_from_file(filepath: str) -> str:
    """Extract raw text from PDF, DOCX, or TXT."""
    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".pdf":
        reader = PdfReader(filepath)
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    elif ext == ".docx":
        doc = DocxDocument(filepath)
        return "\n".join(p.text for p in doc.paragraphs)

    elif ext == ".txt":
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    else:
        raise ValueError(f"Unsupported file type: {ext}")


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 80) -> list[str]:
    """
    Splits text into overlapping chunks.

    chunk_size = how many characters per chunk
    overlap = how many characters repeat between consecutive chunks,
              so a sentence split across the boundary isn't lost entirely.
    """
    chunks = []
    start = 0
    text = text.strip()

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks
