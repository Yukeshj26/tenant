"""Chatbot API — Gemini-powered multilingual tenant assistant."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.database.mongodb import chat_logs_collection
from app.core.config import settings
from datetime import datetime
import google.generativeai as genai
import uuid

router = APIRouter()

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are TenantSense AI Assistant — an expert in tenant management, lease renewals, 
and property management. You help landlords and property managers understand tenant churn risks, 
interpret AI predictions, and craft personalized retention strategies.

Key capabilities:
- Explain lease renewal risk scores in simple terms
- Suggest tenant retention strategies (rent discounts, maintenance improvements, communication)
- Answer questions about payment patterns, maintenance issues, and tenant satisfaction
- Support English, Tamil (தமிழ்), and Hindi (हिंदी) languages

Always respond in the SAME LANGUAGE the user writes in.
Keep responses concise, actionable, and empathetic.
"""


class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"  # en, ta, hi
    session_id: Optional[str] = None
    tenant_context: Optional[dict] = None  # optional tenant data for context


class ChatResponse(BaseModel):
    response: str
    session_id: str
    language: str
    timestamp: str


@router.post("/", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    session_id = payload.session_id or str(uuid.uuid4())

    # Build context-aware prompt
    context = ""
    if payload.tenant_context:
        ctx = payload.tenant_context
        context = f"""
Current tenant context:
- Name: {ctx.get('name', 'Unknown')}
- Risk Score: {ctx.get('risk_score', 'N/A')}%
- Risk Level: {ctx.get('risk_level', 'Unknown')}
- Days to Lease Expiry: {ctx.get('days_to_expiry', 'Unknown')}
- Payment Consistency: {ctx.get('payment_consistency', 'N/A')}
- Satisfaction Score: {ctx.get('satisfaction_score', 'N/A')}/10
"""

    lang_names = {"en": "English", "ta": "Tamil", "hi": "Hindi"}
    target_lang = lang_names.get(payload.language, "English")

    full_prompt = f"{SYSTEM_PROMPT}\n\nREQUIRED RESPONSE LANGUAGE: {target_lang}. You must reply to the user message in {target_lang} only.\n\n{context}\nUser: {payload.message}"

    try:
        # Try primary model first (higher free-tier quota: 1500 req/day)
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(full_prompt)
            bot_response = response.text
        except Exception:
            # Fallback to configured model
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            response = model.generate_content(full_prompt)
            bot_response = response.text
    except Exception as e:
        from loguru import logger
        logger.warning(f"Gemini API error: {e}")
        # Smart rule-based fallback — no "check your API key" messages shown to user
        bot_response = _get_smart_fallback(payload.message, payload.language)

    # Log to MongoDB
    await chat_logs_collection().insert_one({
        "session_id": session_id,
        "user_id": "default-admin",
        "user_message": payload.message,
        "bot_response": bot_response,
        "language": payload.language,
        "tenant_context": payload.tenant_context,
        "timestamp": datetime.utcnow(),
    })

    return ChatResponse(
        response=bot_response,
        session_id=session_id,
        language=payload.language,
        timestamp=datetime.utcnow().isoformat(),
    )


def _get_smart_fallback(message: str, language: str) -> str:
    """Rule-based intelligent fallback when Gemini API is unavailable."""
    msg = message.lower()

    # Detect topic from user message
    if any(w in msg for w in ["risk", "score", "predict", "renew", "churn"]):
        responses = {
            "en": "A high risk score (70%+) means the tenant is likely not to renew their lease. Key factors include low satisfaction scores, missed payments, and declining engagement. Consider reaching out proactively with a personalized retention offer.",
            "ta": "அதிக ஆபத்து மதிப்பெண் (70%+) என்பது குத்தகைதாரர் குத்தகையை புதுப்பிக்க மாட்டார் என்பதாகும். திருப்தி குறைவு, தவறிய கொடுப்பனவுகள் மற்றும் ஈடுபாடு குறைவு ஆகியவை முக்கிய காரணிகள். தனிப்பயன் சலுகையுடன் முன்கூட்டியே தொடர்பு கொள்ளுங்கள்.",
            "hi": "उच्च जोखिम स्कोर (70%+) का मतलब है कि किरायेदार पट्टे का नवीकरण नहीं करेगा। कम संतुष्टि, छूटे भुगतान और कम सहभागिता मुख्य कारक हैं। व्यक्तिगत प्रतिधारण प्रस्ताव के साथ सक्रिय रूप से संपर्क करें।",
        }
    elif any(w in msg for w in ["retain", "keep", "strategy", "retention", "offer"]):
        responses = {
            "en": "Top retention strategies: (1) Offer a rent freeze or small discount for early renewal, (2) Address any open maintenance requests promptly, (3) Send a personalized check-in message, (4) Offer flexible lease terms (6 or 24 months). Acting 3–4 months before lease expiry gives the best results.",
            "ta": "சிறந்த தக்கவைப்பு உத்திகள்: (1) முன்கூட்டியே புதுப்பித்தல் சலுகை வழங்கவும், (2) பராமரிப்பு கோரிக்கைகளை உடனடியாக நிவர்த்தி செய்யவும், (3) தனிப்பட்ட செய்தி அனுப்பவும், (4) நெகிழ்வான குத்தகை விதிமுறைகள் வழங்கவும்.",
            "hi": "शीर्ष प्रतिधारण रणनीतियाँ: (1) जल्दी नवीकरण के लिए किराया फ्रीज या छूट दें, (2) रखरखाव अनुरोधों को तुरंत हल करें, (3) व्यक्तिगत संदेश भेजें, (4) लचीले पट्टे के विकल्प प्रदान करें।",
        }
    elif any(w in msg for w in ["shap", "explain", "feature", "factor", "reason"]):
        responses = {
            "en": "SHAP values explain which factors most influenced a tenant's risk score. Positive SHAP values push risk higher (e.g. missed payments, low satisfaction), while negative values lower the risk. The waterfall chart shows each feature's contribution — focus on the top 2–3 factors to design targeted interventions.",
            "ta": "SHAP மதிப்புகள் எந்த காரணிகள் ஆபத்து மதிப்பெண்ணை பாதிக்கின்றன என்பதை விளக்குகின்றன. நேர்மறை SHAP மதிப்புகள் ஆபத்தை அதிகரிக்கும், எதிர்மறை மதிப்புகள் குறைக்கும்.",
            "hi": "SHAP मान बताते हैं कि किन कारकों ने जोखिम स्कोर को सबसे अधिक प्रभावित किया। सकारात्मक SHAP मान जोखिम बढ़ाते हैं (जैसे छूटे भुगतान), नकारात्मक मान जोखिम कम करते हैं।",
        }
    elif any(w in msg for w in ["payment", "rent", "late", "overdue", "miss"]):
        responses = {
            "en": "Payment consistency is one of the strongest predictors of lease renewal. Tenants with 3+ late payments in the past year are 40% more likely to leave. Consider setting up automated payment reminders and offering a small incentive for on-time payment streaks.",
            "ta": "கொடுப்பனவு நிலைத்தன்மை குத்தகை புதுப்பிப்பின் வலிமையான முன்கணிப்பாளர்களில் ஒன்று. கடந்த ஆண்டில் 3+ தாமதமான கொடுப்பனவுகள் உள்ள குத்தகைதாரர்கள் 40% அதிகமாக விலக வாய்ப்புள்ளது.",
            "hi": "भुगतान स्थिरता पट्टे के नवीकरण के सबसे मजबूत पूर्वानुमानकर्ताओं में से एक है। पिछले वर्ष में 3+ विलंबित भुगतान वाले किरायेदारों के जाने की संभावना 40% अधिक है।",
        }
    elif any(w in msg for w in ["hello", "hi", "hey", "நன்றி", "நமஸ்தே", "help"]):
        responses = {
            "en": "Hello! I'm TenantSense AI Assistant. I can help you understand tenant risk predictions, suggest personalized retention strategies, explain SHAP values, and answer your property management questions. What would you like to know?",
            "ta": "வணக்கம்! நான் TenantSense AI உதவியாளர். குத்தகைதாரர் ஆபத்து மதிப்பீடுகள், தக்கவைப்பு உத்திகள் மற்றும் சொத்து மேலாண்மை கேள்விகளுக்கு உதவ தயாராக இருக்கிறேன்.",
            "hi": "नमस्ते! मैं TenantSense AI Assistant हूँ। मैं किरायेदार जोखिम पूर्वानुमान, प्रतिधारण रणनीतियाँ और संपत्ति प्रबंधन प्रश्नों में मदद कर सकता हूँ।",
        }
    else:
        responses = {
            "en": "I can help you with: tenant risk scores and predictions, retention strategies, lease renewal analysis, SHAP value explanations, and payment pattern insights. Try asking about a specific tenant or topic!",
            "ta": "நான் உதவக்கூடியவை: குத்தகைதாரர் ஆபத்து மதிப்பெண்கள், தக்கவைப்பு உத்திகள், குத்தகை புதுப்பிப்பு பகுப்பாய்வு மற்றும் கொடுப்பனவு முறை நுண்ணறிவு.",
            "hi": "मैं इनमें मदद कर सकता हूँ: किरायेदार जोखिम स्कोर, प्रतिधारण रणनीतियाँ, पट्टे नवीकरण विश्लेषण और भुगतान पैटर्न अंतर्दृष्टि।",
        }

    return responses.get(language, responses["en"])


def _get_fallback_response(message: str, language: str) -> str:
    """Legacy fallback — delegates to smart fallback."""
    return _get_smart_fallback(message, language)


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    cursor = chat_logs_collection().find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).limit(50)
    history = await cursor.to_list(length=50)
    return {"session_id": session_id, "messages": history}
