"""
Lobby Manager does the following:
- Allows new players to join the lobby/queue
- Pairs based on their ELO and what mode they want.
- When the game is ready, it creates a new Game instance
    - Therefore uses ConnectionManager:
        - to broadcast players that the game is starting
        - to prevent players from joining multiple games/lobbies

For now, we have a very simple queuing system.

"""
from fastapi import WebSocket
from backend.game_manager import GameManager
from backend.trivia import TriviaGame
from backend.connection_manager import ConnectionManager

import queue
class LobbyManager:
    def __init__(self):
        self.lobby = queue.Queue()
        from backend.server import connection_manager
        self.connection_manager = connection_manager
        from backend.server import game_manager
        self.game_manager = game_manager
        self.active_games = {}  # game_id -> TriviaGame instance
        self.game_counter = 0  # Simple counter to assign game IDs
    
    async def join_lobby(self, user_id: str, websocket: WebSocket, elo: int):
        if user_id in self.lobby.queue:
            await self.connection_manager.broadcast_lobby(user_id, "You cannot join the lobby multiple times.")
            return
        self.lobby.put((user_id, websocket, elo))
    
    async def pair(self):
        if self.lobby.qsize() >= 2:
            player1 = self.lobby.get()
            player2 = self.lobby.get()
            game_id = await self.game_manager.create_game(player1, player2)
            
            # Notify players
            await self.connection_manager.broadcast_lobby(player1[0], f"Game starting! ID: {game_id}")
            await self.connection_manager.broadcast_lobby(player2[0], f"Game starting! ID: {game_id}")