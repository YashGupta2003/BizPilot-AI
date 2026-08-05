from app.core.config import settings
import json, re
from pydantic import BaseModel
from typing import Optional

class ToneDimension(BaseModel):
    dimension: str
    score: int
    evidence: str

class ToneShift(BaseModel):
    detected: bool
    direction: str
    description: str

class Alert(BaseModel):
    level: str
    message: str
    recommendation: str

class ResponsePattern(BaseModel):
    avg_length: str
    response_speed: str
    initiative: str

class ToneExtraction(BaseModel):
    overall_sentiment: str
    overall_score: int
    tone_dimensions: list[ToneDimension] = []
    tone_shift: ToneShift
    alerts: list[Alert] = []
    communication_style: str
    response_pattern: ResponsePattern
    relationship_health: str
    recommended_actions: list[str] = []
    summary: str

def _build_fallback_response(text: str, client_context: dict = None):
    text_lower = text.lower()
    
    # Simple keyword-based logic
    exclamation_count = text.count("!")
    question_count = text.count("?")
    
    negative_words = ["frustrated", "disappointed", "waiting", "still", "bad", "terrible", "late", "wrong", "issue", "problem"]
    positive_words = ["great", "love", "amazing", "perfect", "good", "excellent", "thanks", "thank you", "awesome"]
    
    neg_count = sum(1 for w in negative_words if w in text_lower)
    pos_count = sum(1 for w in positive_words if w in text_lower)
    
    overall_score = 50 + (pos_count * 10) - (neg_count * 10)
    overall_score = max(0, min(100, overall_score))
    
    if overall_score > 70:
        overall_sentiment = "positive"
        relationship_health = "healthy"
    elif overall_score < 30:
        overall_sentiment = "negative"
        relationship_health = "strained"
    else:
        overall_sentiment = "neutral"
        relationship_health = "stable"

    return {
        "overall_sentiment": overall_sentiment,
        "overall_score": overall_score,
        "tone_dimensions": [
            {"dimension": "Warmth", "score": overall_score, "evidence": "fallback analysis"},
            {"dimension": "Professionalism", "score": 50, "evidence": "fallback analysis"},
            {"dimension": "Urgency", "score": min(100, exclamation_count * 20), "evidence": f"{exclamation_count} exclamation marks"},
            {"dimension": "Frustration", "score": min(100, neg_count * 20), "evidence": f"{neg_count} negative keywords"},
            {"dimension": "Satisfaction", "score": overall_score, "evidence": "fallback analysis"},
            {"dimension": "Engagement", "score": 50 + min(50, question_count * 10), "evidence": "fallback analysis"}
        ],
        "tone_shift": {
            "detected": False,
            "direction": "stable",
            "description": "Fallback analysis cannot detect shifts accurately."
        },
        "alerts": [],
        "communication_style": "transactional",
        "response_pattern": {
            "avg_length": "medium",
            "response_speed": "normal",
            "initiative": "reactive"
        },
        "relationship_health": relationship_health,
        "recommended_actions": ["Review communication manually.", "Respond promptly."],
        "summary": "This is a fallback analysis generated using basic keyword matching due to missing API key."
    }



async def analyze_communication_tone(text: str, client_context: dict = None) -> dict:
    if not settings.GROQ_API_KEY:
        return _build_fallback_response(text, client_context)
    
    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage, HumanMessage
        
        llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.3)
        
        context_str = json.dumps(client_context) if client_context else "None"
        
        prompt = f"""
You are an expert communication analyst. Analyze the following client communication text and provide a detailed tone analysis.
Consider the optional client context if provided.
Client Context: {context_str}

Text to analyze:
{text}

Return your analysis EXACTLY as a JSON object with the following structure:
{{
  "overall_sentiment": "positive|neutral|negative|mixed",
  "overall_score": 0-100,
  "tone_dimensions": [
    {{"dimension": "Warmth", "score": 0-100, "evidence": "specific quote"}},
    {{"dimension": "Professionalism", "score": 0-100, "evidence": "..."}},
    {{"dimension": "Urgency", "score": 0-100, "evidence": "..."}},
    {{"dimension": "Frustration", "score": 0-100, "evidence": "..."}},
    {{"dimension": "Satisfaction", "score": 0-100, "evidence": "..."}},
    {{"dimension": "Engagement", "score": 0-100, "evidence": "..."}}
  ],
  "tone_shift": {{
    "detected": true/false,
    "direction": "warming|cooling|stable|volatile",
    "description": "specific description of the shift"
  }},
  "alerts": [
    {{"level": "info|warning|critical", "message": "...", "recommendation": "..."}}
  ],
  "communication_style": "formal|casual|transactional|collaborative|demanding",
  "response_pattern": {{
    "avg_length": "short|medium|detailed",
    "response_speed": "quick|normal|slow|declining",
    "initiative": "proactive|reactive|passive"
  }},
  "relationship_health": "strong|healthy|cooling|strained|critical",
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "summary": "2-3 sentence summary of the tone analysis"
}}
"""
        messages = [
            SystemMessage(content="You are a JSON-producing API. Always return valid JSON matching the requested schema. No conversational text."),
            HumanMessage(content=prompt)
        ]
        
        structured_llm = llm.with_structured_output(ToneExtraction)
        response = await structured_llm.ainvoke(messages)
        result = response.model_dump() if response else None
        
        if result:
            return result
        else:
            return _build_fallback_response(text, client_context)
            
    except Exception as e:
        print(f"Error in tone_agent: {e}")
        return _build_fallback_response(text, client_context)
