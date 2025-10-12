"""WebSocket connection manager for lobby and in-game channels."""

from __future__ import annotations

import json
from enum import Enum
from typing import Dict, List, Optional

from fastapi import WebSocket


class ConnectionType(Enum):
    LOBBY = "lobby"
    GAME = "game"


class ConnectionManager:
    def __init__(self) -> None:
        self.lobby_connections: Dict[str, WebSocket] = {}
        self.game_connections: Dict[str, List[WebSocket]] = {}

    async def connect(
        self,
        id: str,
        websocket: WebSocket,
        type: ConnectionType = ConnectionType.LOBBY,
    ) -> None:
        await websocket.accept()

        if type == ConnectionType.LOBBY:
            self.lobby_connections[id] = websocket
        else:
            self.game_connections.setdefault(id, []).append(websocket)

    async def disconnect(
        self,
        id: str,
        websocket: Optional[WebSocket] = None,
        type: ConnectionType = ConnectionType.LOBBY,
    ) -> None:
        if type == ConnectionType.LOBBY:
            self.lobby_connections.pop(id, None)
            return

        if id not in self.game_connections:
            return

        sockets = self.game_connections[id]
        if websocket is not None and websocket in sockets:
            sockets.remove(websocket)

        if not sockets:
            self.game_connections.pop(id, None)

    async def broadcast_game(self, game_id: str, message) -> None:
        """Broadcast a JSON-serialisable payload to all game sockets."""
        if game_id not in self.game_connections:
            return

        payload = message if isinstance(message, str) else json.dumps(message)
        dead_sockets: List[WebSocket] = []

        for socket in self.game_connections[game_id]:
            try:
                await socket.send_text(payload)
            except Exception:
                dead_sockets.append(socket)

        for socket in dead_sockets:
            await self.disconnect(game_id, socket, ConnectionType.GAME)

    async def broadcast_lobby(self, user_id: str, message) -> None:
        if user_id not in self.lobby_connections:
            return

        payload = message if isinstance(message, str) else json.dumps(message)
        socket = self.lobby_connections[user_id]
        try:
            await socket.send_text(payload)
        except Exception:
            await self.disconnect(user_id, socket, ConnectionType.LOBBY)