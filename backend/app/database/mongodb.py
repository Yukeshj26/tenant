"""MongoDB async client using Motor."""

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from loguru import logger

_client: AsyncIOMotorClient = None


def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGO_URL)
        logger.info("🍃 MongoDB client initialized")
    return _client


def get_mongo_db():
    return get_mongo_client()[settings.MONGO_DB]


async def close_mongo():
    global _client
    if _client:
        _client.close()
        _client = None
        logger.info("🍃 MongoDB connection closed")


# ─── Collection helpers ───────────────────────────────────────────────────────
def get_collection(name: str):
    return get_mongo_db()[name]


# Named collections
def chat_logs_collection():
    return get_collection("chat_logs")


def prediction_logs_collection():
    return get_collection("prediction_logs")


def audit_logs_collection():
    return get_collection("audit_logs")
