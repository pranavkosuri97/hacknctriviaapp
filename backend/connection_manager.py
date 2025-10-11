"""
Handles websocket connections for both game and for lobby.

Responsible for connect, disconnect, and broadcasting messages from server to clients.
"""
from fastapi import WebSocket
from enum import Enum

class ConnectionType(Enum):
    LOBBY = "lobby"
    GAME = "game"

class ConnectionManager:
    def __init__(self):
        self.lobby_connections = {}
        self.game_connections = {}

    async def connect(self, id: str, websocket: WebSocket, type: ConnectionType = ConnectionType.LOBBY):
        await websocket.accept()
        if type == ConnectionType.LOBBY:
            if id not in self.lobby_connections:
                self.lobby_connections[id] = websocket
        elif type == ConnectionType.GAME:
            if id not in self.game_connections:
                self.game_connections[id] = websocket

    async def disconnect(self, id: str):
        del self.lobby_connections[id]

    async def broadcast_game(self, game_id: str, message: str):
        if game_id in self.game_connections:
            await self.game_connections[game_id].send_text(message)

    async def broadcast_lobby(self, user_id: str, message: str):
        if user_id in self.lobby_connections:
            await self.lobby_connections[user_id].send_text(message)