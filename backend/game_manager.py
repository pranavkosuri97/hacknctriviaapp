"""
This is how we send data to from frontend to backend, and we use connection manager to broadcast

For send to backend, whenever the websocket receieves a message, we will use the game_id to route via game manager.
"""
from fastapi import FastAPI, WebSocket
from backend.connection_manager import ConnectionManager
from backend.server import connection_manager
from backend.trivia import TriviaGame
from backend.trivia import ActionTypes
from pydantic import BaseModel
import asyncio
class PerformAction(BaseModel):
    action: ActionTypes
    data: dict
class GameManager:
    def __init__(self):
        self.games = {}
        self.current_players = set()
        self.connection_manager = connection_manager

    async def create_game(self, player1, player2): # TODO: implement other args later
        game = TriviaGame() # TODO: implement interface later
        game_id = game.get_id()
        self.games[game_id] = game
        self.current_players.add(player1[0]) # uuids
        self.current_players.add(player2[0])

        return game_id
    
    async def send_game_update(self, game_id: str, data: dict):
        await self.connection_manager.broadcast_game(game_id, data)

    async def handle_message(self, game_id: str, player_id: str, message: PerformAction):
        game = self.games.get(game_id)
        if not game:
            return  # Game not found

        if player_id not in self.current_players:
            return  # Player not in current game

        if message.action == ActionTypes.START_GAME:
            asyncio.create_task(game.start_game())
            await self.handle_end_game(game_id)

        else:
            response = await game.handle_action(message)
            
        # Handle other action types as needed

    async def handle_end_game(self, game_id: str):
        """
        Writes to DB, removes curr players + Game
        """
        game = self.games.get(game_id)
        if not game:
            return  # Game not found
    
        await game.end_game()
        self.current_players.remove(game.get_player1())
        self.current_players.remove(game.get_player2())
        del self.games[game_id]