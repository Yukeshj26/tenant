"""
TenantSense AI — Main Chatbot Engine
Orchestrates: language detection → context retrieval → Gemini API → translation → response
"""

import os
import uuid
from typing import Optional
from datetime import datetime
from loguru import logger

import google.generativeai as genai

# Load system prompt
PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompts", "system_prompt.txt")
with open(PROMPT_PATH, "r", encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()


class TenantSenseChatbot:
    """
    Main chatbot class.
    - Detects user language
    - Injects tenant context if provided
    - Calls Gemini API
    - Translates response to match user language
    """

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=SYSTEM_PROMPT,
        )
        self._sessions: dict = {}  # session_id -> chat history

    def _build_context_block(self, tenant_context: Optional[dict]) -> str:
        if not tenant_context:
            return ""
        ctx = tenant_context
        lines = ["=== Current Tenant Context ==="]
        if ctx.get("name"):
            lines.append(f"Tenant Name       : {ctx['name']}")
        if ctx.get("risk_score") is not None:
            lines.append(f"Risk Score        : {ctx['risk_score']}% non-renewal probability")
        if ctx.get("risk_level"):
            lines.append(f"Risk Level        : {ctx['risk_level'].upper()}")
        if ctx.get("days_to_expiry") is not None:
            lines.append(f"Days to Expiry    : {ctx['days_to_expiry']} days")
        if ctx.get("payment_consistency") is not None:
            lines.append(f"Payment Consistency: {ctx['payment_consistency']}")
        if ctx.get("satisfaction_score") is not None:
            lines.append(f"Satisfaction Score : {ctx['satisfaction_score']}/10")
        if ctx.get("unresolved_issues") is not None:
            lines.append(f"Unresolved Issues : {ctx['unresolved_issues']}")
        if ctx.get("top_risk_factors"):
            lines.append(f"Top Risk Factors  : {', '.join(ctx['top_risk_factors'])}")
        lines.append("==============================")
        return "\n".join(lines)

    def chat(
        self,
        message: str,
        session_id: Optional[str] = None,
        language: str = "en",
        tenant_context: Optional[dict] = None,
    ) -> dict:
        """
        Process a single chat message and return the bot response.
        """
        from chatbot.translation import detect_language, translate_response

        session_id = session_id or str(uuid.uuid4())
        detected_lang = detect_language(message)
        effective_lang = detected_lang if detected_lang in ("ta", "hi") else language

        # Build or retrieve chat session
        if session_id not in self._sessions:
            self._sessions[session_id] = self.model.start_chat(history=[])

        chat_session = self._sessions[session_id]
        context_block = self._build_context_block(tenant_context)

        full_message = f"{context_block}\n\nUser: {message}" if context_block else message

        try:
            response = chat_session.send_message(full_message)
            bot_text = response.text
            # Ensure response matches user language
            bot_text = translate_response(bot_text, effective_lang)
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            bot_text = self._fallback(effective_lang)

        return {
            "session_id": session_id,
            "response": bot_text,
            "language": effective_lang,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def _fallback(self, lang: str) -> str:
        fallbacks = {
            "en": "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
            "ta": "மன்னிக்கவும், தற்போது இணைக்க இயலவில்லை. சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
            "hi": "क्षमा करें, अभी कनेक्ट करने में समस्या हो रही है। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
        }
        return fallbacks.get(lang, fallbacks["en"])

    def clear_session(self, session_id: str):
        self._sessions.pop(session_id, None)
