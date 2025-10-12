"""Simple lobby matchmaking manager."""

from __future__ import annotations

from collections import deque
from typing import Deque, Dict

from fastapi import WebSocket

from connection_manager import ConnectionManager
from game.player import PlayerModel
from game_manager import GameManager
import logging

logger = logging.getLogger(__name__)


class LobbyManager:
    """Handles a basic FIFO lobby that pairs players into games."""

    def __init__(self, connection_manager: ConnectionManager, game_manager: GameManager) -> None:
        self.connection_manager = connection_manager
        self.game_manager = game_manager
        self._waiting_queue: Deque[PlayerModel] = deque()
        self._active_waiters: Dict[str, PlayerModel] = {}
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.DEBUG) # Set the desired log level

        # ... in your FastAPI code

    async def enqueue_player(self, player: PlayerModel) -> None:
        """Add a player to the matchmaking queue and attempt to pair."""
        if player.id in self._active_waiters:
            await self.connection_manager.broadcast_lobby(
                player.id,
                {
                    "type": "error",
                    "message": "Player already waiting in lobby",
                },
            )
            return

        self._waiting_queue.append(player)
        logger.info(f"Player {player.id} added to waiting queue")
        logger.debug("Current queue: " + str(self._waiting_queue))
        self._active_waiters[player.id] = player
        await self._attempt_pair()

    async def remove_player(self, player_id: str) -> None:
        """Remove a player from the queue if present."""
        if player_id not in self._active_waiters:
            return

        player = self._active_waiters.pop(player_id)
        try:
            self._waiting_queue.remove(player)
        except ValueError:
            pass

    async def _attempt_pair(self) -> None:
        while len(self._waiting_queue) >= 2:
            player1 = self._waiting_queue.popleft()
            player2 = self._waiting_queue.popleft()

            self._active_waiters.pop(player1.id, None)
            self._active_waiters.pop(player2.id, None)

            game_id = await self.game_manager.create_game(player1, player2)
            print(f"Paired {player1.id} and {player2.id} into game {game_id}")
            await self.connection_manager.broadcast_lobby(
                player1.id,
                {
                    "type": "game_found",
                    "game_id": game_id,
                    "opponent": player2.model_dump(exclude={"elo"}),
                },
            )
            await self.connection_manager.broadcast_lobby(
                player2.id,
                {
                    "type": "game_found",
                    "game_id": game_id,
                    "opponent": player1.model_dump(exclude={"elo"}),
                },
            )