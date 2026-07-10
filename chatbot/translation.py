"""
TenantSense AI — Multilingual Translation Module
Detects language and translates text for multilingual support.
Supports: English (en), Tamil (ta), Hindi (hi)
"""

from deep_translator import GoogleTranslator
from langdetect import detect, LangDetectException
from loguru import logger
from typing import Optional

SUPPORTED_LANGUAGES = {
    "en": "English",
    "ta": "Tamil",
    "hi": "Hindi",
}

LANG_TO_GOOGLE = {
    "en": "english",
    "ta": "tamil",
    "hi": "hindi",
}


def detect_language(text: str) -> str:
    """Detect language of input text. Returns ISO 639-1 code."""
    try:
        detected = detect(text)
        # Map common variants
        if detected in ("ta", "ml"):  # Tamil or Malayalam
            return "ta"
        elif detected in ("hi", "ur", "mr"):  # Hindi/Urdu/Marathi
            return "hi"
        return "en"
    except LangDetectException:
        return "en"


def translate_to_english(text: str, source_lang: Optional[str] = None) -> str:
    """Translate any text to English."""
    if source_lang is None:
        source_lang = detect_language(text)
    if source_lang == "en":
        return text
    try:
        google_src = LANG_TO_GOOGLE.get(source_lang, "auto")
        translator = GoogleTranslator(source=google_src, target="english")
        return translator.translate(text)
    except Exception as e:
        logger.warning(f"Translation to English failed: {e}")
        return text


def translate_from_english(text: str, target_lang: str) -> str:
    """Translate English text to target language."""
    if target_lang == "en":
        return text
    try:
        google_tgt = LANG_TO_GOOGLE.get(target_lang, "english")
        translator = GoogleTranslator(source="english", target=google_tgt)
        return translator.translate(text)
    except Exception as e:
        logger.warning(f"Translation from English to {target_lang} failed: {e}")
        return text


def translate_response(response: str, user_lang: str) -> str:
    """
    Ensures the chatbot response is in the user's preferred language.
    If the model response is in English, translates to user_lang.
    """
    if user_lang == "en":
        return response
    detected = detect_language(response)
    if detected == user_lang:
        return response  # Already correct language
    # Translate English → target language
    return translate_from_english(response, user_lang)
