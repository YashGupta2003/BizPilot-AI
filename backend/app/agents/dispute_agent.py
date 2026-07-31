import json
import os
from openai import AsyncOpenAI
from app.core.config import settings

# Groq exposes an OpenAI-compatible API
if settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("gsk-placeholder"):
    client = AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    MODEL_NAME = settings.GROQ_MODEL
elif settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-placeholder"):
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    MODEL_NAME = "gpt-4-turbo-preview"
else:
    client = None
    MODEL_NAME = None

async def resolve_dispute(dispute_message: str, client_details: dict, invoice_details: dict | None, rag_context: str) -> dict:
    """
    Analyzes a client's dispute message against their contract, meeting notes (RAG context),
    and invoice history. Generates a professional response.
    """
    
    if client is None:
        # Fallback if no API key is configured
        return {
            "analysis": "API key not configured (neither Groq nor OpenAI). Mock analysis: Based on the facts, the client might be confused about the payment terms.",
            "recommended_action": "Clarify terms",
            "draft_response": "Dear Client,\n\nI received your message regarding the invoice. Let's discuss this on a quick call to ensure we are aligned with our agreed terms.\n\nBest,\nFreelancer"
        }

    system_prompt = """You are an elite AI Invoice Dispute Resolver for freelancers. 
A client has sent a dispute message regarding work or an invoice. Your job is to:
1. Cross-reference their message against the provided facts (client profile, invoice details, contract/meeting context).
2. Determine who is right. Is the client making a fair point based on the contract, or are they being dishonest/forgetful?
3. Generate a firm, highly professional response. 
   - If the client is right: Be apologetic and offer a fair resolution.
   - If the client is wrong/dishonest: Draft a firm, slightly legal-tone response pointing directly to the agreed terms and evidence. Do not be overly aggressive, but hold boundaries firmly.

Return ONLY a raw JSON object (no markdown formatting) with these exact keys:
- "analysis": Your internal reasoning about the situation (1-2 paragraphs).
- "recommended_action": A short string like "Offer revision", "Firm pushback", "Send clarification".
- "draft_response": The ready-to-send email/message to the client."""

    user_content = f"Dispute Message from Client:\n{dispute_message}\n\n"
    user_content += f"Client Details:\n{json.dumps(client_details, indent=2, default=str)}\n\n"
    
    if invoice_details:
        user_content += f"Invoice Details:\n{json.dumps(invoice_details, indent=2, default=str)}\n\n"
        
    user_content += f"Relevant Context from Contracts/Meetings (RAG Search Results):\n{rag_context}"

    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.4,
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content
        return json.loads(raw_content)

    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        return {
            "analysis": "Error analyzing dispute due to AI failure.",
            "recommended_action": "Manual review required",
            "draft_response": "Hello,\n\nI received your message. I am currently reviewing our records and will get back to you shortly.\n\nBest regards,"
        }
