from __future__ import annotations

import asyncio
from typing import Dict, Optional

from connection_manager import ConnectionManager
from game.player import PlayerModel
from game.trivia import TriviaGame
from trivia_repo import TriviaRepo


class GameManager:
    def __init__(self, connection_manager: Optional[ConnectionManager] = None) -> None:
        self.connection_manager = connection_manager
        self.games: Dict[str, TriviaGame] = {}
        self.player_to_game: Dict[str, str] = {}
        self._loop_tasks: Dict[str, asyncio.Task] = {}
        self.repo = TriviaRepo()

    async def create_game(
        self,
        player1: PlayerModel,
        player2: PlayerModel,
        timer_length: int = 300,
        num_questions: int = 10,
    ) -> str:
        game = TriviaGame(player1, player2, timer_length=timer_length, num_questions=num_questions)
        game.set_event_callback(self.handle_game_event)

        game_id = game.get_id()
        self.games[game_id] = game
        self.player_to_game[player1.id] = game_id
        self.player_to_game[player2.id] = game_id

        loop_task = asyncio.create_task(game.run_game_loop())
        self._loop_tasks[game_id] = loop_task

        return game_id

    async def end_game(self, game_id: str) -> None:
        game = self.games.get(game_id)
        if not game:
            return
        await game.stop_game()
        await self._finalize_game(game_id)

    async def submit_answer(self, game_id: str, player_id: str, answer) -> dict:
        game = self.games.get(game_id)
        if not game:
            return {"status": "game_not_found"}
        return await game.receive_answer(player_id, answer)

    async def advance_question(self, game_id: str) -> None:
        game = self.games.get(game_id)
        if not game:
            return
        await game.advance_to_next_question()

    async def handle_game_event(self, event_type: str, payload: dict) -> None:
        game_id = payload.get("game_id")
        if self.connection_manager and game_id:
            await self.connection_manager.broadcast_game(
                game_id,
                {"type": event_type, "payload": payload},
            )

        try:
            if event_type == "game_ended":
                g = self.games.get(game_id)
                p1 = g.players["player1"].playerModel
                p2 = g.players["player2"].playerModel
                await self.repo.record_game_ended(
                    game_id=game_id,
                    reason=payload.get("reason"),
                    winner=payload.get("winner"),
                    final_scores=payload.get("final_scores", {}),
                    player_elos=payload.get("player_elos", {}),
                    p1_id=p1.id,
                    p2_id=p2.id,
                    raw_payload=payload,
                )
        except Exception as e:
            print(f"[PERSISTENCE ERROR] {event_type} {game_id}: {e}")

        if event_type == "game_ended" and game_id:
            await self._finalize_game(game_id)

    def get_game(self, game_id: str) -> Optional[TriviaGame]:
        return self.games.get(game_id)

    def get_game_for_player(self, player_id: str) -> Optional[str]:
        return self.player_to_game.get(player_id)

    def get_active_games_count(self) -> int:
        return len(self.games)

    async def _finalize_game(self, game_id: str) -> None:
        game = self.games.pop(game_id, None)
        if not game:
            return
        for _, player in game.players.items():
            self.player_to_game.pop(player.get_id(), None)
        task = self._loop_tasks.pop(game_id, None)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass