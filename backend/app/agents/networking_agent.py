from app.core.config import settings
from pydantic import BaseModel
import json
import re

class Recommendation(BaseModel):
    service_type: str
    why_needed: str
    referral_fee_percent: float
    collaboration_model: str

class NetworkingExtraction(BaseModel):
    recommendations: list[Recommendation] = []
    revenue_opportunity: float

def _build_fallback_response(gap_data, current_services):
    suggestions = []
    for gap in gap_data.get("service_gaps", []):
        suggestions.append({
            "service_type": gap["service_type"],
            "why_needed": "Frequent demand signals from past lost proposals and meetings.",
            "referral_fee_percent": 15.0,
            "collaboration_model": "Referral"
        })
    return {
        "recommendations": suggestions,
        "revenue_opportunity": sum([gap.get("count", 0) for gap in gap_data.get("service_gaps", [])]) * 1000
    }



async def generate_networking_recommendations(gap_data: dict, current_services: list) -> dict:
    if not settings.GROQ_API_KEY:
        return _build_fallback_response(gap_data, current_services)
    
    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage, HumanMessage
        
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=settings.GROQ_API_KEY,
            temperature=0.3
        )
        
        system_prompt = """You are an expert business consultant specializing in freelancer networking and partnerships.
Analyze the provided service gaps and current services to suggest partnership opportunities.
Provide recommendations with specific service types to partner with, why they are needed based on demand signals, a suggested referral fee percentage (10-20), and collaboration models (subcontract, white-label, referral, joint proposal).
Also estimate an average revenue opportunity lost (numeric value).

Return ONLY valid JSON in this format:
{
  "recommendations": [
    {
      "service_type": "string",
      "why_needed": "string",
      "referral_fee_percent": 15.0,
      "collaboration_model": "string"
    }
  ],
  "revenue_opportunity": 10000.0
}
"""
        
        human_prompt = f"""
Current Services: {json.dumps(current_services)}
Service Gaps Data: {json.dumps(gap_data.get("service_gaps", []))}
"""
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        structured_llm = llm.with_structured_output(NetworkingExtraction)
        response = structured_llm.invoke(messages)
        result = response.model_dump() if response else None
        
        if not result:
            return _build_fallback_response(gap_data, current_services)
            
        return result
        
    except Exception as e:
        print(f"Error in networking_agent: {e}")
        return _build_fallback_response(gap_data, current_services)
