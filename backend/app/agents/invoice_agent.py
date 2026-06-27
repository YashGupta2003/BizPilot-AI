"""
Invoice Agent — the simplest possible "agentic AI" pattern:
1. Take unstructured natural language input
2. Ask the LLM to extract STRUCTURED data (JSON) from it
3. Validate and use that structured data programmatically

CONCEPT: This is the foundation of agentic AI. The LLM doesn't just "chat" —
it acts as a translator from human language into a format your code can act on.
Real agent frameworks (LangChain, CrewAI) wrap this same idea with more tools
and more autonomy, but the core idea is exactly what you see here.
"""
import json
from openai import OpenAI
from app.core.config import settings

# Groq exposes an OpenAI-compatible API, so we reuse the OpenAI SDK
# and just point it at Groq's base_url with a Groq key.
if settings.GROQ_API_KEY:
    client = OpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    MODEL_NAME = settings.GROQ_MODEL
elif settings.OPENAI_API_KEY:
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    MODEL_NAME = "gpt-4o-mini"
else:
    client = None
    MODEL_NAME = None


EXTRACTION_PROMPT = """You are an invoice line-item extractor for a freelancer billing tool.

Given a plain English description of work done, extract structured line items.

Respond ONLY with valid JSON in this exact shape, nothing else:
{
  "items": [
    {"description": "string", "quantity": number, "rate": number}
  ]
}

Rules:
- If hours are mentioned, quantity = number of hours, rate = hourly rate.
- If a flat fee/fixed price is mentioned, quantity = 1, rate = that price.
- If multiple deliverables are mentioned, create one line item per deliverable.
- Never invent a rate that wasn't stated or clearly implied. If no rate is given, set rate to 0.

Description: "{description}"
"""


async def extract_invoice_items(description: str, default_rate: float | None = None) -> list[dict]:
    """
    Calls the LLM to turn natural language into invoice line items.
    Falls back to a simple single line item if no API key is configured,
    so the rest of the app remains testable without billing API calls.
    """
    if client is None:
        # Fallback for local dev without an API key — keeps you unblocked while learning
        rate = default_rate or 0
        return [{"description": description, "quantity": 1, "rate": rate}]

    prompt = EXTRACTION_PROMPT.replace("{description}", description)

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=500,
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(raw)
        items = parsed.get("items", [])
    except json.JSONDecodeError:
        items = [{"description": description, "quantity": 1, "rate": default_rate or 0}]

    # If the model didn't find a rate and the client has a default_rate, use it
    if default_rate:
        for item in items:
            if not item.get("rate"):
                item["rate"] = default_rate

    return items