"""
Chat Agent — the central brain of BizPilot.

CONCEPT: This demonstrates "intelligent mode switching" from your original
AURA-X plan, simplified into something real and working:
1. Detect what the user wants (general chat vs document question)
2. If it's about documents -> run RAG (retrieve chunks, then answer using them)
3. Otherwise -> answer directly as a business assistant
"""
from openai import OpenAI
from app.core.config import settings
from app.rag.retriever import search_similar_chunks

if settings.GROQ_API_KEY:
    client = OpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    MODEL_NAME = settings.GROQ_MODEL
elif settings.OPENAI_API_KEY:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    MODEL_NAME = "gpt-4o-mini"
else:
    client = None
    MODEL_NAME = None

SYSTEM_PROMPT = """You are BizPilot, an AI assistant for freelancers and small business owners.
You help with invoicing, client management, contracts, and general business questions.
Be concise, practical, and friendly. Use Indian Rupee (₹) when discussing money unless told otherwise."""


async def detect_needs_documents(message: str) -> bool:
    """
    Simple keyword-based intent detection — cheap and fast, no API call needed.
    A more advanced version could ask the LLM to classify, like in AURA-X's intent detector.
    """
    document_keywords = ["contract", "document", "agreement", "uploaded", "file", "terms", "clause", "pdf"]
    return any(keyword in message.lower() for keyword in document_keywords)


async def handle_chat(db, owner_id, message: str, client_id: str | None = None) -> dict:
    needs_docs = await detect_needs_documents(message)

    if needs_docs:
        chunks = await search_similar_chunks(db, owner_id, message, client_id=client_id, top_k=4)

        if not chunks:
            return {
                "reply": "I couldn't find any uploaded documents to search. Try uploading a contract or file first.",
                "mode_used": "rag",
                "sources": [],
            }

        context = "\n\n---\n\n".join(c["text"] for c in chunks)
        prompt = f"""Answer the user's question using ONLY the document content below.
If the answer isn't in the content, say so clearly.

Document content:
{context}

Question: {message}"""

        reply = await _call_llm(prompt)
        return {
            "reply": reply,
            "mode_used": "rag",
            "sources": list(set(c["filename"] for c in chunks)),
        }

    else:
        reply = await _call_llm(message)
        return {"reply": reply, "mode_used": "ask", "sources": None}


async def _call_llm(user_message: str) -> str:
    if client is None:
        return (
            "(No OpenAI API key configured yet — add OPENAI_API_KEY to backend/.env to enable real AI responses. "
            "This is a placeholder reply so you can keep testing the rest of the app.)"
        )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=600,
    )
    return response.choices[0].message.content