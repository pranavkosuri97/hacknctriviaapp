from __future__ import annotations

import asyncio
from pydantic import BaseModel
from typing import Any, Awaitable, Callable, Dict, Optional, Set
from uuid import uuid4
import random

from game.constants import POINTS_CORRECT, GameActions
from game.player import Player, PlayerModel
from game.question import Question
from questions import get_random_questions

EventCallback = Callable[[str, Dict[str, Any]], Awaitable[None]]

class GameResultState(BaseModel):
    game_id: str
    reason: str
    winner: str
    final_scores: Dict[str, int]
    player_elos: Dict[str, int]

class TriviaGame:
    def __init__(
        self,
        player1: PlayerModel,
        player2: PlayerModel,
        timer_length: int = 300,
        num_questions: int = 10,
        questions: Optional[list[Question]] = None,
    ) -> None:
        self.match_type = ""
        self.players: Dict[str, Player] = {
            "player1": Player(player1),
            "player2": Player(player2),
        }
        self.questions = questions or TriviaGame.load_questions(num_questions)
        if not self.questions:
            raise ValueError("TriviaGame requires at least one question to start")

        self.current_question_index = 0
        self.current_answers: Set[str] = set()
        self.timer = max(0, int(timer_length))
        self.id = uuid4()
        self.is_running = False
        self.is_finished = False
        self.event_callback: Optional[EventCallback] = None

    # ------------------------------------------------------------------
    # Public lifecycle methods
    # ------------------------------------------------------------------
    async def run_game_loop(self) -> None:
        """Run the main game loop (timer + automatic progression)."""
        if self.is_running:
            return

        self.is_running = True
        self.is_finished = False

        await self._dispatch_event(
            "game_started",
            {
                "game_id": str(self.id),
                "question": self._serialize_current_question(),
                "question_number": self.get_question_number(),
                "total_questions": self.get_number_questions(),
                "time_remaining": self.timer,
                "players": [
                    {
                        "id": self.players["player1"].get_id(),
                        "name": self.players["player1"].playerModel.name,
                        "elo": self.players["player1"].get_elo(),
                    },
                    {
                        "id": self.players["player2"].get_id(),
                        "name": self.players["player2"].playerModel.name,
                        "elo": self.players["player2"].get_elo(),
                    },
                ],
            },
        )

        try:
            while self.is_running and not self.is_finished:
                await asyncio.sleep(1)

                if not self.is_running:
                    break

                self.timer = max(0, self.timer - 1)

                await self._dispatch_event(
                    "timer_update",
                    {
                        "game_id": str(self.id),
                        "time_remaining": self.timer,
                        "question_number": self.get_question_number(),
                    },
                )

                if self.timer <= 0:
                    await self._end_game(reason="timer_expired")
                    break

                if self.is_finished:
                    break
        except Exception as exc:  # pragma: no cover - defensive
            await self._dispatch_event(
                "game_error",
                {
                    "game_id": str(self.id),
                    "error": str(exc),
                },
            )
            raise

    async def receive_answer(self, player_id: str, answer: str) -> Dict[str, Any]:
        """Process an answer from a player and dispatch relevant events."""
        if self.is_finished or not self.is_running:
            return {"status": "finished"}

        if self.timer <= 0:
            await self._end_game(reason="timer_expired")
            return {"status": "timeout"}

        question = self.questions[self.current_question_index]
        is_correct = question.answer_correct(answer)
        points_earned = POINTS_CORRECT if is_correct else 0
        can_advance = False
        if len(self.current_answers) < 2:
            p1_id = self.players["player1"].get_id()
            p2_id = self.players["player2"].get_id()
            id = "player1" if player_id == p1_id else "player2" if player_id == p2_id else None
            self.players[id].update_score(points_earned)
            self.current_answers.add(player_id)
            if is_correct or len(self.current_answers) == 2:
                can_advance = True
        else:
            can_advance = True  # Both players have already answered

        
        payload = {
            "game_id": str(self.id),
            "player_id": player_id,
            "answer": answer,
            "is_correct": is_correct,
            "points_earned": points_earned,
            "current_scores": self.get_scores(),
            "question_number": self.get_question_number(),
            "can_advance": can_advance,
        }
        await self._dispatch_event("answer_received", payload)

        return {"status": "ok", "is_correct": is_correct}

    async def advance_to_next_question(self) -> None:
        """Public hook for managers to force-advance the game."""
        if self.is_finished:
            return
        await self._advance_to_next_question()

    def get_question_number(self) -> int:
        return self.current_question_index + 1

    def get_number_questions(self) -> int:
        return len(self.questions)

    def get_scores(self) -> Dict[str, int]:
        return {
            key: player.get_score() for key, player in self.players.items()
        }

    def get_id(self) -> str:
        return str(self.id)

    def set_event_callback(self, callback: EventCallback | None) -> None:
        self.event_callback = callback

    async def _advance_to_next_question(self) -> None:
        """Advance to the next question or finish the game."""
        self.current_answers.clear()
        self.current_question_index += 1

        if self.current_question_index >= len(self.questions):
            await self._end_game(reason="questions_completed")
            return

        await self._dispatch_event(
            "question_advanced",
            {
                "game_id": str(self.id),
                "question": self._serialize_current_question(),
                "question_number": self.get_question_number(),
                "total_questions": self.get_number_questions(),
                "time_remaining": self.timer,
            },
        )

    async def _end_game(self, reason: str) -> None:
        if self.is_finished:
            return

        self.is_finished = True
        self.is_running = False
        self.current_answers.clear()
        self.timer = max(0, self.timer)

        p1_elo_before = self.players["player1"].get_elo()
        p2_elo_before = self.players["player2"].get_elo()

        winner = self._determine_winner()
        if winner == "player1":
            s1, s2 = 1.0, 0.0
        elif winner == "player2":
            s1, s2 = 0.0, 1.0
        else:
            s1, s2 = 0.5, 0.5

        def _expected(a: float, b: float) -> float:
            return 1.0 / (1.0 + 10 ** ((b - a) / 400.0))

        e1 = _expected(p1_elo_before, p2_elo_before)
        e2 = _expected(p2_elo_before, p1_elo_before)

        K = 32

        p1_elo_after = int(round(p1_elo_before + K * (s1 - e1)))
        p2_elo_after = int(round(p2_elo_before + K * (s2 - e2)))

        p1_delta = p1_elo_after - p1_elo_before
        p2_delta = p2_elo_after - p2_elo_before
        for key, new_elo, delta in (("player1", p1_elo_after, p1_delta), ("player2", p2_elo_after, p2_delta)):
            player = self.players[key]
            if hasattr(player, "set_elo") and callable(getattr(player, "set_elo")):
                try:
                    player.set_elo(new_elo)
                except Exception:
                    pass
            elif hasattr(player, "update_elo") and callable(getattr(player, "update_elo")):
                try:
                    player.update_elo(delta)
                except Exception:
                    pass

        player_elos_before = {"player1": p1_elo_before, "player2": p2_elo_before}
        player_elos_after = {"player1": p1_elo_after, "player2": p2_elo_after}
        player_elo_delta = {"player1": p1_delta, "player2": p2_delta}


        await self._dispatch_event(
            "game_ended",
            {
                "game_id": str(self.id),
                "reason": reason,
                "winner": self._determine_winner(),
                "final_scores": self.get_scores(),
                "player_elos_before": player_elos_before,
                "player_elos": player_elos_after,
                "player_elo_delta": player_elo_delta,
            },
        )

    async def _dispatch_event(self, event_type: str, data: Dict[str, Any]) -> None:
        if self.event_callback is None:
            return

        payload: Dict[str, Any] = {"game_id": str(self.id)}
        payload.update(data)
        payload.update({"snapshot": self.get_snapshot()})
        await self.event_callback(event_type, payload)

    def _serialize_current_question(self) -> Optional[Dict]:
        if not (0 <= self.current_question_index < len(self.questions)):
            return None

        question = self.questions[self.current_question_index]
        return {
            "prompt": question.get_prompt(),
            "choices": question.get_choices(),
        }

    def _determine_winner(self) -> str:
        score1 = self.players["player1"].get_score()
        score2 = self.players["player2"].get_score()

        if score1 > score2:
            return "player1"
        if score2 > score1:
            return "player2"
        return "draw"

    @staticmethod
    def load_questions(num_questions: int = 1) -> list[Question]:
        """Fetch questions from DB with fully random subjects but ensure >=1 per subject when possible.
        Falls back to built-in samples if DB fetch fails or rows are malformed.
        """
        SUBJECTS = ["history", "science", "arts", "geography", "pop culture", "sports"]
        LETTERS = ["A", "B", "C", "D"]

        def _fallback(n: int) -> list[Question]:
            sample_questions = [
                Question("What is 2 + 2?", ["1", "2", "4", "5"], "C"),
                Question("Capital of France?", ["London", "Paris", "Berlin", "Rome"], "B"),
                Question("Color mixing red + blue?", ["Green", "Purple", "Orange", "Yellow"], "B"),
                Question("How many days in a leap year?", ["363", "364", "365", "366"], "D"),
                Question("Largest planet?", ["Earth", "Jupiter", "Mars", "Venus"], "B"),
            ]
            if n <= len(sample_questions):
                return sample_questions[:n]
            return [sample_questions[i % len(sample_questions)] for i in range(n)]
        try:
            n = max(0, int(num_questions))
            if n == 0:
                return []

            if n >= len(SUBJECTS):
                guaranteed_subjects = SUBJECTS[:]
            else:
                guaranteed_subjects = random.sample(SUBJECTS, n)

            rows = []
            seen_ids = set()

            for subj in guaranteed_subjects:
                try:
                    res = get_random_questions([subj], 1)
                except Exception:
                    res = []
                for r in (res or []):
                    rid = r.get("id")
                    if rid and rid not in seen_ids:
                        rows.append(r)
                        seen_ids.add(rid)
                        break

            remaining = n - len(rows)
            safety = 0
            while remaining > 0 and safety < 6:
                try:
                    pool = get_random_questions([], remaining * 3)
                except Exception:
                    pool = []
                for r in (pool or []):
                    rid = r.get("id")
                    if rid and rid not in seen_ids:
                        rows.append(r)
                        seen_ids.add(rid)
                        if len(rows) >= n:
                            break
                remaining = n - len(rows)
                safety += 1

            out: list[Question] = []
            for r in rows[:n]:
                stem = r.get("stem") or r.get("prompt") or "Untitled"
                choices = r.get("choices") or []
                idx = r.get("answer_idx")
                if not isinstance(choices, list) or len(choices) != 4:
                    continue
                if not isinstance(idx, int) or not (0 <= idx < 4):
                    continue
                correct_letter = LETTERS[idx]
                out.append(Question(stem, choices, correct_letter))

            return out if out else _fallback(n)

        except Exception:
            return _fallback(num_questions)