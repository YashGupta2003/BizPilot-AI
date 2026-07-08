"""
Multi-Agent Negotiation Simulator.

TWO AGENTS:
1. CLIENT AGENT — plays a realistic client persona. Pushes back on rates,
   asks for faster deadlines, tries scope creep, mentions competitors.
2. COACH AGENT — reads the conversation and only intervenes when the
   freelancer makes a weak move. Silent when things are going well.
3. SCORING ENGINE — at session end, scores 5 dimensions using the LLM.
"""
import json
from datetime import datetime
from typing import Optional

from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq

from app.core.config import settings

CLIENT_SCENARIOS = [
    {
        "id": "budget_startup",
        "name": "Budget-Conscious Startup",
        "description": "Early-stage startup with very limited budget",
        "personality": "Friendly and enthusiastic but always negotiating price down. "
                       "Will mention limited funding, compare rates to Fiverr/Upwork, "
                       "ask for a startup discount, and suggest equity instead of full payment.",
        "tactics": ["Mentions competitor rates", "Asks for startup discount", "Suggests equity"],
        "budget_pressure": "high",
        "difficulty": "medium",
        "opening_line": "Hi! We love your portfolio. But honestly, our budget is quite tight "
                        "right now as a startup — can we discuss the pricing?",
    },
    {
        "id": "demanding_corporate",
        "name": "Demanding Corporate Client",
        "description": "Large company with budget but unrealistic expectations",
        "personality": "Professional and formal. Has budget but demands tight deadlines, "
                       "unlimited revisions, and will try to expand scope without adjusting pay. "
                       "Uses corporate authority to pressure you.",
        "tactics": ["Demands tight deadlines", "Unlimited revisions", "Scope creep"],
        "budget_pressure": "low",
        "difficulty": "hard",
        "opening_line": "We need this project completed in half your estimated time. "
                        "Our last freelancer delivered on time, so this should be standard. What can you do?",
    },
    {
        "id": "experienced_client",
        "name": "Experienced, Savvy Client",
        "description": "Has worked with many freelancers, knows market rates",
        "personality": "Fair and reasonable but firmly benchmarks against market rates. "
                       "Will ask for portfolio proof, references, and guarantees. "
                       "Tests your confidence and won't overpay.",
        "tactics": ["Benchmarks market rates", "Asks for proof", "Tests confidence"],
        "budget_pressure": "medium",
        "difficulty": "easy",
        "opening_line": "I've worked with about 15 freelancers in this space. "
                        "Your rate seems higher than average. Walk me through why I should pay this price.",
    },
    {
        "id": "indecisive_client",
        "name": "Indecisive Small Business Owner",
        "description": "Not sure what they want, keeps changing requirements",
        "personality": "Very friendly but confused. Changes requirements mid-conversation, "
                       "asks for things outside the original scope, then claims they mentioned it before. "
                       "Tries to add more work to the same budget.",
        "tactics": ["Scope changes", "Vague requirements", "Creeping additions"],
        "budget_pressure": "medium",
        "difficulty": "medium",
        "opening_line": "So I want a website, but also maybe an app? And social media banners. "
                        "Can we include all of that in your price? It shouldn't be that much more work, right?",
    },
]


def get_scenario(scenario_id: str) -> Optional[dict]:
    return next((s for s in CLIENT_SCENARIOS if s["id"] == scenario_id), None)


def _build_client_system_prompt(scenario: dict, service_type: str, asking_rate: float, currency: str) -> str:
    return f"""You are playing the role of a CLIENT in a freelance negotiation practice session.

YOUR PERSONA: {scenario['name']}
DESCRIPTION: {scenario['description']}
YOUR PERSONALITY: {scenario['personality']}
YOUR TACTICS: {', '.join(scenario['tactics'])}
BUDGET PRESSURE: {scenario['budget_pressure']}

CONTEXT:
- The freelancer is pitching: {service_type}
- Their asking rate: {currency} {asking_rate:,.0f}
- Your goal: negotiate a better deal (lower price, faster delivery, more scope)

RULES:
1. Stay in character as this client — never break character
2. Respond naturally in 2-4 sentences like a real WhatsApp/email message
3. Apply AT LEAST ONE of your tactics per response
4. If the freelancer gives a strong justification, soften slightly but NEVER immediately agree
5. Ask one question per response to keep negotiation moving
6. Do NOT mention this is a simulation — stay fully in character
7. Use conversational tone. No bullet points."""


async def get_client_response(
    scenario: dict,
    service_type: str,
    asking_rate: float,
    currency: str,
    conversation_history: list[dict],
) -> str:
    if not settings.GROQ_API_KEY:
        return _fallback_client_response(len(conversation_history), scenario)

    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.8)
    messages = [SystemMessage(content=_build_client_system_prompt(scenario, service_type, asking_rate, currency))]

    for msg in conversation_history:
        if msg["role"] == "freelancer":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "client":
            messages.append(SystemMessage(content=f"[YOUR PREVIOUS RESPONSE]: {msg['content']}"))

    response = await llm.ainvoke(messages)
    return response.content.strip()


def _fallback_client_response(turn: int, scenario: dict) -> str:
    responses = {
        "budget_startup": [
            "That's quite high for us. We're a small startup — can you do it for 30% less?",
            "What if we pay half now and half after launch? We're really tight on cash.",
            "Our friend quoted us half your price. Why should we pay more?",
        ],
        "demanding_corporate": [
            "We need this in 2 weeks, not 4. That's non-negotiable for our board meeting.",
            "We'll need unlimited revisions included. Our previous agency offered that.",
            "Can you guarantee specific results from this work?",
        ],
        "experienced_client": [
            "Market rate for this is typically 20% lower. Justify your premium.",
            "Show me 3 similar projects you've done. What were the results?",
            "What's your revision policy? What happens if we're not satisfied?",
        ],
        "indecisive_client": [
            "Actually can we add a mobile app to this scope? It shouldn't cost much more.",
            "I was thinking — can we also include logo design in this price?",
            "Wait, I thought you said this included social media posts too?",
        ],
    }
    scenario_responses = responses.get(scenario["id"], responses["budget_startup"])
    return scenario_responses[min(turn // 2, len(scenario_responses) - 1)]


COACH_SYSTEM_PROMPT = """You are a professional negotiation coach for freelancers. You are OBSERVING
a negotiation practice session. Your job is to help the freelancer improve.

WHEN TO INTERVENE (only if the freelancer made a mistake):
- They immediately agreed to a lower price without pushback
- They apologized for their rate or said "sorry"
- They were overly aggressive or unprofessional
- They failed to justify their value
- They agreed to scope changes without discussing price adjustment

WHEN TO STAY SILENT (return exactly: NO_COACHING_NEEDED):
- The freelancer gave a strong, confident response
- They effectively pushed back while staying professional
- They used good tactics (value justification, asking questions back, setting limits)

IF YOU INTERVENE, format as:
⚡ Coach Tip: [One specific, actionable tip in 1-2 sentences. Tell them exactly what to say.]

Keep tips short, direct, immediately actionable."""


async def get_coach_feedback(
    freelancer_message: str,
    conversation_history: list[dict],
) -> Optional[str]:
    if not settings.GROQ_API_KEY:
        return _heuristic_coach_feedback(freelancer_message)

    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.3)
    recent = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history
    context = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in recent])
    context += f"\nFREELANCER (latest): {freelancer_message}"

    response = await llm.ainvoke([
        SystemMessage(content=COACH_SYSTEM_PROMPT),
        HumanMessage(content=f"Conversation:\n{context}\n\nShould I intervene?"),
    ])

    result = response.content.strip()
    if "NO_COACHING_NEEDED" in result:
        return None
    return result if result else None


def _heuristic_coach_feedback(message: str) -> Optional[str]:
    msg_lower = message.lower()
    weak_signals = {
        "sorry": "⚡ Coach Tip: Never apologize for your rate! Say: 'My rate reflects the quality and experience I bring.'",
        "okay fine": "⚡ Coach Tip: Don't fold so quickly! Ask: 'What specific value would you need to see to justify this investment?'",
        "i can do it for less": "⚡ Coach Tip: Before lowering your rate, ask what they give up. Try: 'I can adjust the price if we reduce the scope. What would you like to remove?'",
        "discount": "⚡ Coach Tip: Instead of discounts, offer VALUE. Try: 'Rather than a discount, let me explain what you get for this investment...'",
        "whatever": "⚡ Coach Tip: Vague responses lose negotiations. Be specific about what you offer and why it's worth the price.",
        "please": "⚡ Coach Tip: Avoid pleading language. You have a valuable skill — negotiate from confidence, not desperation.",
    }
    for signal, tip in weak_signals.items():
        if signal in msg_lower:
            return tip
    return None


SCORING_PROMPT = """You are scoring a freelance negotiation practice session.

Read the conversation and rate the FREELANCER's performance on these 5 dimensions (1-10):
1. assertiveness: Did they hold their ground without being aggressive?
2. professionalism: Was their tone appropriate throughout?
3. value_articulation: Did they explain WHY their rate is justified?
4. pushback_handling: How well did they handle the client's objections?
5. outcome_score: How good was the final outcome for the freelancer?

Respond ONLY with valid JSON, no markdown:
{
  "assertiveness": <1-10>,
  "professionalism": <1-10>,
  "value_articulation": <1-10>,
  "pushback_handling": <1-10>,
  "outcome_score": <1-10>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "final_verdict": "<2-3 sentence overall assessment>"
}"""


async def score_negotiation(
    conversation_history: list[dict],
    scenario: dict,
    asking_rate: float,
) -> dict:
    if not settings.GROQ_API_KEY:
        return _fallback_score()

    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.1)

    conversation_text = "\n".join([
        f"{m['role'].upper()}: {m['content']}"
        for m in conversation_history
        if m["role"] in ("freelancer", "client")
    ])

    context = (
        f"Scenario: {scenario['name']} (Difficulty: {scenario['difficulty']})\n"
        f"Freelancer's asking rate: {asking_rate}\n\n"
        f"Conversation:\n{conversation_text}"
    )

    response = await llm.ainvoke([
        SystemMessage(content=SCORING_PROMPT),
        HumanMessage(content=context),
    ])

    raw = response.content.strip().replace("```json", "").replace("```", "").strip()
    first = raw.find("{")
    last = raw.rfind("}")
    if first != -1 and last != -1:
        raw = raw[first:last + 1]

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return _fallback_score()

    scores = [
        data.get("assertiveness", 5), data.get("professionalism", 5),
        data.get("value_articulation", 5), data.get("pushback_handling", 5),
        data.get("outcome_score", 5),
    ]
    overall = round(sum(scores) / len(scores), 1)
    grade = "A" if overall >= 8.5 else "B" if overall >= 7 else "C" if overall >= 5.5 else "D" if overall >= 4 else "F"

    return {
        "assertiveness": int(data.get("assertiveness", 5)),
        "professionalism": int(data.get("professionalism", 5)),
        "value_articulation": int(data.get("value_articulation", 5)),
        "pushback_handling": int(data.get("pushback_handling", 5)),
        "outcome_score": int(data.get("outcome_score", 5)),
        "overall": overall,
        "grade": grade,
        "strengths": data.get("strengths", []),
        "improvements": data.get("improvements", []),
        "final_verdict": data.get("final_verdict", "Good practice session completed."),
    }


def _fallback_score() -> dict:
    return {
        "assertiveness": 6, "professionalism": 7, "value_articulation": 5,
        "pushback_handling": 6, "outcome_score": 5, "overall": 5.8, "grade": "C",
        "strengths": ["Maintained professional tone", "Engaged with client's concerns"],
        "improvements": ["Be more assertive about your rate", "Explain your value more specifically"],
        "final_verdict": "Decent practice session. Add GROQ_API_KEY for detailed AI scoring.",
    }