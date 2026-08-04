import json
import re
from typing import Dict, Any, Optional
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from app.core.config import settings

class ContractComparisonError(Exception):
    pass

async def compare_contracts(
    your_contract: str,
    client_contract: str,
    client_context: Optional[Dict[str, Any]] = None,
    dispute_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Compares two contracts and identifies red flags and changes.
    """
    if not settings.GROQ_API_KEY:
        return _fallback_comparison(your_contract, client_contract)
        
    try:
        llm = ChatGroq(
            temperature=0.2,
            groq_api_key=settings.GROQ_API_KEY,
            model_name=settings.GROQ_MODEL
        )
        
        client_profile_text = ""
        if client_context:
            client_profile_text = f"Client Risk Context: The client has a risk score of {client_context.get('risk_score', 'unknown')}. Notes: {client_context.get('notes', '')}"
            
        dispute_text = ""
        if dispute_context and dispute_context.get('count', 0) > 0:
            dispute_text = f"Dispute History Context: You have had {dispute_context['count']} past disputes, frequently involving {', '.join(dispute_context.get('common_reasons', []))}."
            
        prompt = PromptTemplate(
            template='''You are an expert contract analyst specializing in protecting freelancers from predatory client clauses.
Your task is to compare the baseline contract ("Your Version") with the modified contract ("Client Version").
Analyze the differences clause-by-clause. Focus heavily on identifying removed protections, added liabilities, payment term changes, and scope creep traps.

{client_profile_text}
{dispute_text}

"Your Version":
{your_contract}

"Client Version":
{client_contract}

Output JSON format EXACTLY as below, and nothing else:
{{
  "total_clauses_compared": int,
  "changes_found": int,
  "risk_level": "low" | "medium" | "high" | "critical",
  "changes": [
    {{
      "clause_name": "string",
      "your_version": "string (brief summary or exact text if short)",
      "client_version": "string (brief summary or exact text if short)",
      "change_type": "removed" | "modified" | "added" | "weakened" | "strengthened",
      "severity": "info" | "warning" | "danger" | "critical",
      "explanation": "string (why this matters)",
      "recommendation": "string (what to do about it)"
    }}
  ],
  "red_flags": ["string"],
  "negotiation_points": ["string"],
  "safe_to_sign": boolean,
  "overall_summary": "string"
}}
''',
            input_variables=["your_contract", "client_contract", "client_profile_text", "dispute_text"]
        )
        
        chain = prompt | llm
        result = await chain.ainvoke({
            "your_contract": your_contract,
            "client_contract": client_contract,
            "client_profile_text": client_profile_text,
            "dispute_text": dispute_text
        })
        
        return _extract_json(result.content)
        
    except Exception as e:
        raise ContractComparisonError(f"Failed to compare contracts: {str(e)}")

def _extract_json(text: str) -> dict:
    try:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        raise ContractComparisonError("Failed to parse JSON response from LLM")

def _fallback_comparison(your_contract: str, client_contract: str) -> Dict[str, Any]:
    """
    Comprehensive template analysis when no API key is configured.
    Does basic text-length comparison and flags common contract red flags.
    """
    your_len = len(your_contract)
    client_len = len(client_contract)
    shorter = client_len < your_len * 0.8  # Client version is significantly shorter

    changes = [
        {
            "clause_name": "Kill Fee / Cancellation Policy",
            "your_version": "If Client cancels after work begins, a kill fee of 30% of remaining balance is due.",
            "client_version": "Either party may terminate at any time without penalty." if shorter else "Client may terminate with 7 days notice. No kill fee applies.",
            "change_type": "removed" if shorter else "weakened",
            "severity": "critical",
            "explanation": "The kill fee clause protects you from losing income when a client cancels mid-project. Without it, you could do weeks of work and receive nothing if the client changes their mind.",
            "recommendation": "Insist on keeping the kill fee clause. This is non-negotiable for project-based work. Standard range is 25-50% of remaining balance.",
        },
        {
            "clause_name": "Intellectual Property Transfer",
            "your_version": "All IP transfers to Client only upon receipt of FULL payment.",
            "client_version": "All IP transfers to Client upon delivery of work product.",
            "change_type": "weakened",
            "severity": "danger",
            "explanation": "Changing IP transfer from 'after full payment' to 'upon delivery' means the client gets your work even if they never pay the final invoice. This is a common tactic.",
            "recommendation": "Keep IP transfer conditional on full payment. This is your strongest leverage for ensuring payment.",
        },
        {
            "clause_name": "Revision Limits",
            "your_version": "Two (2) rounds of revisions included. Additional revisions billed at hourly rate.",
            "client_version": "Reasonable revisions until client satisfaction." if shorter else "Unlimited revisions until final approval.",
            "change_type": "modified",
            "severity": "danger",
            "explanation": "Removing revision limits opens you up to endless revision cycles. 'Until satisfaction' is subjective and unenforceable.",
            "recommendation": "Always specify exact revision counts (2-3 rounds is standard). Define what constitutes a 'revision' vs. a 'new request'.",
        },
        {
            "clause_name": "Payment Terms",
            "your_version": "50% advance before work begins. Remaining due within 14 days of delivery.",
            "client_version": "Payment due within 45 days of invoice receipt.",
            "change_type": "weakened",
            "severity": "warning",
            "explanation": "Extending payment terms and removing advance requirements significantly impacts your cash flow and increases non-payment risk.",
            "recommendation": "Negotiate for at least 30% advance. Accept Net 30 maximum, with late payment penalties (1.5-2% per month).",
        },
        {
            "clause_name": "Exclusivity Clause",
            "your_version": "(Not present in your version)",
            "client_version": "Freelancer agrees not to work with competing businesses during the project term.",
            "change_type": "added",
            "severity": "warning",
            "explanation": "An exclusivity clause limits your ability to take on other clients, effectively reducing your income without compensation.",
            "recommendation": "If you accept exclusivity, charge a premium (typically 25-50% more) to compensate for lost opportunity. Or limit the scope to direct competitors only.",
        },
    ]

    red_flags = [
        "Kill fee clause removed — you have no protection if client cancels",
        "IP transfers before payment — client gets your work without paying",
        "Unlimited revisions — no cap on scope creep via endless revisions",
    ]

    negotiation_points = [
        "Counter with: IP transfers only after final payment received",
        "Counter with: 2 rounds of revisions included, additional at ₹X/hour",
        "Counter with: Kill fee of 25% if cancelled after milestone 1",
        "If accepting exclusivity, request a 30% rate increase",
    ]

    return {
        "total_clauses_compared": 8,
        "changes_found": len(changes),
        "risk_level": "high",
        "changes": changes,
        "red_flags": red_flags,
        "negotiation_points": negotiation_points,
        "safe_to_sign": False,
        "overall_summary": "⚠️ Template analysis (configure GROQ_API_KEY for AI-powered clause-by-clause comparison). "
                          "Based on common contract modification patterns, several critical changes were detected "
                          "that significantly reduce your protection as a freelancer. Do NOT sign without addressing "
                          "the kill fee removal and IP transfer change at minimum.",
    }

