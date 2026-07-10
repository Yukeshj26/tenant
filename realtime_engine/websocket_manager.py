"""
TenantSense AI — WebSocket Manager
Manages active WebSocket connections and broadcasts live prediction updates.
"""

from fastapi import WebSocket
from typing import Dict, List, Optional
from loguru import logger
import json
from datetime import datetime


class WebSocketManager:
    """
    Manages WebSocket connections grouped by user/room.
    Supports broadcast to all, or targeted push to a specific user.
    """

    def __init__(self):
        # user_id → list of active WebSocket connections
        self._connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        logger.info(f"🔌 WebSocket connected: user={user_id} | total={self.total_connections}")

        # Send welcome event
        await self._send(websocket, {
            "event": "connected",
            "message": "TenantSense AI real-time channel active",
            "timestamp": datetime.utcnow().isoformat(),
        })

    async def disconnect(self, websocket: WebSocket, user_id: str):
        conns = self._connections.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self._connections.pop(user_id, None)
        logger.info(f"🔌 WebSocket disconnected: user={user_id} | total={self.total_connections}")

    async def send_to_user(self, user_id: str, payload: dict):
        """Push a message to all connections for a specific user."""
        conns = self._connections.get(user_id, [])
        dead = []
        for ws in conns:
            try:
                await self._send(ws, payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns.remove(ws)

    async def broadcast(self, payload: dict):
        """Broadcast a message to ALL connected users."""
        payload["timestamp"] = datetime.utcnow().isoformat()
        dead_pairs = []
        for user_id, conns in self._connections.items():
            for ws in conns:
                try:
                    await self._send(ws, payload)
                except Exception:
                    dead_pairs.append((user_id, ws))
        for user_id, ws in dead_pairs:
            await self.disconnect(ws, user_id)

    async def push_prediction_update(self, tenant_id: str, prediction: dict, user_id: Optional[str] = None):
        """Push a new prediction result to relevant users."""
        payload = {
            "event": "prediction_update",
            "tenant_id": tenant_id,
            "risk_score": prediction.get("risk_score"),
            "risk_score_pct": prediction.get("risk_score_pct"),
            "risk_level": prediction.get("risk_level"),
            "will_not_renew": prediction.get("will_not_renew"),
            "timestamp": datetime.utcnow().isoformat(),
        }
        if user_id:
            await self.send_to_user(user_id, payload)
        else:
            await self.broadcast(payload)

    async def push_alert(self, alert_type: str, message: str, data: Optional[dict] = None):
        """Broadcast a system alert (e.g., high-risk tenant detected)."""
        await self.broadcast({
            "event": "alert",
            "alert_type": alert_type,
            "message": message,
            "data": data or {},
        })

    @staticmethod
    async def _send(websocket: WebSocket, payload: dict):
        await websocket.send_text(json.dumps(payload, default=str))

    @property
    def total_connections(self) -> int:
        return sum(len(v) for v in self._connections.values())

    @property
    def active_users(self) -> List[str]:
        return list(self._connections.keys())


# Global singleton
ws_manager = WebSocketManager()
