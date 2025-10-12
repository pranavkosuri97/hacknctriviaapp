import os
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from supabase import Client, create_client

from game.player import PlayerModel

load_dotenv()


def _sb() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("Supabase credentials are not configured")
    return create_client(url, key)


class TriviaRepo:
    def __init__(self) -> None:
        self.sb = _sb()

    async def _run(self, fn, *args, **kwargs):
        return await asyncio.to_thread(fn, *args, **kwargs)

    async def _execute(self, query):
        return await asyncio.to_thread(query.execute)

    async def record_game_ended(
        self,
        game_id: str,
        reason: str,
        winner: str,
        player1: str,
        player2: str,
        p1_elo: int,
        p2_elo: int,
    ) -> None:
        payload = {
            "id": game_id,
            "reason": reason,
            "winner": winner,
            "player_1": player1,
            "player_2": player2,
            "p1_elo": p1_elo,
            "p2_elo": p2_elo,
        }
        print("elo payload", payload["p1_elo"])
        await self._execute(self.sb.table("games").upsert(payload, on_conflict="id"))
    
    async def get_player_history(self, player_id: str) -> list[Dict[str, Any]]:
        # query all games where player_id is either player_1 or player_2
        query = self.sb.table("games").select("*").or_(f"player_1.eq.{player_id},player_2.eq.{player_id}")
        result = await self._execute(query)
        return result.data if result.data else []