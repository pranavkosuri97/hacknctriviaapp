"""FastAPI application exposing lobby and game websocket endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from connection_manager import ConnectionManager, ConnectionType
from game.player import PlayerModel
from game_manager import GameManager
from lobby_manager import LobbyManager


class CreateGameRequest(BaseModel):
    player1: PlayerModel
    player2: PlayerModel
    timer_length: int = 300
    num_questions: int = 10


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connection_manager = ConnectionManager()
game_manager = GameManager(connection_manager)
lobby_manager = LobbyManager(connection_manager, game_manager)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/games")
async def create_game(payload: CreateGameRequest) -> dict[str, Any]:
    game_id = await game_manager.create_game(
        payload.player1,
        payload.player2,
        timer_length=payload.timer_length,
        num_questions=payload.num_questions,
    )
    return {"game_id": game_id}

@app.websocket("/ws/hello")
async def hello_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    # Send a greeting message
    await websocket.send_json({"message": "Hello, WebSocket!"})
    await websocket.close()


@app.websocket("/ws/lobby/{player_id}")
async def lobby_websocket(websocket: WebSocket, player_id: str) -> None:
    await connection_manager.connect(player_id, websocket, ConnectionType.LOBBY)
    print("connected")
    try:
        while True:
            message = await websocket.receive_json()
            print(message)
            message_type = message.get("type")

            if message_type == "join":
                print(f"[LOBBY] Got join message")
                player_data = message.get("player")
                if not player_data:
                    await websocket.send_json({"type": "error", "message": "missing player payload"})
                    print(f"[LOBBY] Player payload missing for join: {message}")
                    continue

                player = PlayerModel(**player_data)

                await lobby_manager.enqueue_player(player)
                print(f"[LOBBY] Player {player.id} joined lobby.")

            elif message_type == "leave":
                await lobby_manager.remove_player(player_id)
                print(f"[LOBBY] Player {player_id} left lobby.")
                break

            else:
                await websocket.send_json({"type": "error", "message": "unknown lobby event"})
                print(f"[LOBBY] Unknown lobby event: {message_type} from player {player_id}.")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(e)
    finally:
        print(f"[LOBBY] Disconnecting...")
        await lobby_manager.remove_player(player_id)
        await connection_manager.disconnect(player_id, websocket, ConnectionType.LOBBY)
        # await websocket.close()

@app.websocket("/ws/games/{game_id}/{player_id}")
async def game_websocket(websocket: WebSocket, game_id: str, player_id: str) -> None:
    if not game_manager.get_game(game_id):
        raise HTTPException(status_code=404, detail="Game not found")

    await connection_manager.connect(game_id, websocket, ConnectionType.GAME)

    try:
        await websocket.send_json({"type": "connected", "game_id": game_id})

        while True:
            message = await websocket.receive_json()
            message_type = message.get("type")

            if message_type == "submit_answer":
                answer = message.get("answer")
                if answer is None:
                    await websocket.send_json({"type": "error", "message": "missing answer"})
                    continue

                result = await game_manager.submit_answer(game_id, player_id, answer)
                await websocket.send_json({"type": "answer_ack", "payload": result})

            elif message_type == "advance_question":
                await game_manager.advance_question(game_id)

            elif message_type == "leave":
                break

            else:
                await websocket.send_json({"type": "error", "message": "unknown game event"})

    except WebSocketDisconnect:
        pass
    finally:
        await connection_manager.disconnect(game_id, websocket, ConnectionType.GAME)