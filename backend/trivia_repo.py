import os
import asyncio
from typing import Any, Dict, Optional
from game.player import PlayerModel

from supabase import create_client, Client

from dotenv import load_dotenv

load_dotenv()

def _sb() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


class TriviaRepo:
    def __init__(self) -> None:
        self.sb = _sb()

    async def _run(self, fn, *args, **kwargs):
        return await asyncio.to_thread(fn, *args, **kwargs)

    async def upsert_player(self, player_id: str, name: str, elo: int) -> None:
        payload = {
            "id": player_id,
            "name": name,
            "elo": elo,
        }
        await self._run(self.sb.table("players").upsert, payload, on_conflict="id")

    async def record_game_started(
        self,
        game_id: str,
        timer_length: int,
        num_questions: int,
        match_type: Optional[str],
        p1: PlayerModel,
        p2: PlayerModel,
        raw_payload: Dict[str, Any],
    ) -> None:
        await self.upsert_player(p1.id, p1.name, p1.elo)
        await self.upsert_player(p2.id, p2.name, p2.elo)

        await self._run(
            self.sb.table("games").insert,
            {
                "id": game_id,
                "match_type": match_type,
                "timer_length": timer_length,
                "num_questions": num_questions,
            },
        )

        await self._run(
            self.sb.table("game_participants").insert,
            [
                {
                    "game_id": game_id,
                    "player_id": p1.id,
                    "role": "player1",
                    "starting_elo": p1.elo,
                },
                {
                    "game_id": game_id,
                    "player_id": p2.id,
                    "role": "player2",
                    "starting_elo": p2.elo,
                },
            ],
        )

        await self._run(
            self.sb.table("game_events").insert,
            {"game_id": game_id, "type": "game_started", "payload": raw_payload},
        )

    async def record_answer(
        self,
        game_id: str,
        question_number: int,
        player_id: str,
        answer: str,
        is_correct: bool,
        points_earned: int,
        raw_payload: Dict[str, Any],
    ) -> None:
        await self._run(
            self.sb.table("game_answers").insert,
            {
                "game_id": game_id,
                "question_number": question_number,
                "player_id": player_id,
                "answer": str(answer) if answer is not None else None,
                "is_correct": is_correct,
                "points_earned": points_earned,
            },
        )
        await self._run(
            self.sb.table("game_events").insert,
            {"game_id": game_id, "type": "answer_received", "payload": raw_payload},
        )

    async def record_question_advanced(self, game_id: str, raw_payload: Dict[str, Any]) -> None:
        await self._run(
            self.sb.table("game_events").insert,
            {"game_id": game_id, "type": "question_advanced", "payload": raw_payload},
        )

    async def record_timer_update(self, game_id: str, raw_payload: Dict[str, Any]) -> None:
        await self._run(
            self.sb.table("game_events").insert,
            {"game_id": game_id, "type": "timer_update", "payload": raw_payload},
        )

    async def record_game_error(self, game_id: str, raw_payload: Dict[str, Any]) -> None:
        await self._run(
            self.sb.table("game_events").insert,
            {"game_id": game_id, "type": "game_error", "payload": raw_payload},
        )

    async def record_game_ended(
        self,
        game_id: str,
        reason: str,
        winner: str,
        final_scores: Dict[str, int],
        player_elos: Dict[str, int],
        p1_id: str,
        p2_id: str,
        raw_payload: Dict[str, Any],
    ) -> None:
        (await self._run(
            self.sb.table("games").update,
            {
                "ended_at": "now()",
                "reason": reason,
                "winner": winner,
            },
        )).eq("id", game_id)
        print(f"marked game {game_id} ended: {reason}, winner: {winner}")

        updates = []
        for role, score in final_scores.items():
            pid = p1_id if role == "player1" else p2_id
            ending_elo = player_elos.get(role)
            updates.append(
                {
                    "game_id": game_id,
                    "player_id": pid,
                    "final_score": score,
                    "ending_elo": ending_elo,
                }
            )
        print("updates for db: ", updates)
        for u in updates:
            (await self._run(
                self.sb.table("game_participants").update,
                {"final_score": u["final_score"], "ending_elo": u["ending_elo"]},
            )).eq("game_id", game_id).eq("player_id", u["player_id"])
        
        print("updated participant elos")

        res = await self._run(
            self.sb.table("game_participants")
            .select("player_id, starting_elo, ending_elo")
            .eq("game_id", game_id)
            .execute
        )
        rows = res().data if callable(res) else res.data
        print("fetched participant elos: ", rows)
        for row in rows:
            player_id = row["player_id"]
            old_elo = row.get("starting_elo", None)
            new_elo = row.get("ending_elo", None)
            if new_elo is not None:
                (await self._run(
                    self.sb.table("players").update, {"elo": new_elo}
                )).eq("id", player_id)
                print(f"updated player {player_id} current elo to {new_elo}")
            if old_elo is not None and new_elo is not None:
                await self._run(
                    self.sb.table("elo_history").insert,
                    {
                        "player_id": player_id,
                        "game_id": game_id,
                        "old_elo": old_elo,
                        "new_elo": new_elo,
                    },
                )
                print(f"updated player {player_id} elo: {old_elo} -> {new_elo}")