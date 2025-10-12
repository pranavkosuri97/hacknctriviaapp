"use client";
// builtin 

// external
import { useEffect, useState } from "react";

// internal
import type { GameState } from "../../lib/game/types";
import { useWebSocket } from "@/hooks/useWebsocket";
import { GameAction, type GameMessage, type GameRequest } from "@/lib/game/game-ws-types";
import { getNewGameState, getSelectedLetter } from "@/lib/game/utils";

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
if (!WEBSOCKET_URL) throw new Error("Environment variable NEXT_PUBLIC_WEBSOCKET_URL is not set!");

interface GameRoomProps {
    gameState: GameState;
    userId: string;
    gameId: string;
}

export default function GameRoom({ gameState, userId, gameId }: GameRoomProps) {
    const [state, setState] = useState(gameState);
    const [selected, setSelected] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const { send } = useWebSocket<GameRequest, GameMessage>(
        `${WEBSOCKET_URL}/ws/games/${gameId}/${userId}`,
        (data) => {
            console.log(data);
            setState(prev => getNewGameState(prev, data));
        }
    );

    const handleSelect = (idx: number) => {
        if (!submitted) setSelected(idx);
    };

    const handleSubmit = () => {
        if (selected !== null && !submitted && !closed) {
            const answer = getSelectedLetter(selected);
            send({ type: GameAction.SUBMIT, answer });
            setSubmitted(true);
        }
    };

    const handleAdvance = () => {
        send({ type: GameAction.ADVANCE });
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies: Just wrong
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (submitted) return;

            if (e.key >= "1" && e.key <= "9") {
                const idx = parseInt(e.key, 10) - 1;
                if (state.currentQuestion.choices && idx < state.currentQuestion.choices.length) {
                    setSelected(idx);
                }
            }

            if (e.key === "Enter") {
                if (selected !== null) {
                    handleSubmit();
                }
            }

            if (e.key === "N") {
                if (closed) {
                    handleAdvance();
                }
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selected, submitted, state.currentQuestion.choices]);

    return (
        <div className="game-room p-6 max-w-4xl mx-auto bg-white rounded shadow flex flex-row gap-8">
            <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">Trivia Question</h2>
                <div className="mb-2 flex items-center justify-between">
                    <div className="text-lg font-semibold">{state.currentQuestion.question}</div>
                    <div className="text-lg font-mono px-3 py-1 bg-gray-200 rounded">
                        ⏰ {state.time_remaining ?? 0}s
                    </div>
                </div>
                <div className="mb-6">
                    <div className="text-lg font-semibold mb-2">{state.currentQuestion.question}</div>
                    <div className="grid grid-cols-1 gap-2">
                        {state.currentQuestion.choices?.map((choice, idx) => (
                            <button
                                type="button"
                                key={choice}
                                className={`border rounded px-4 py-2 text-left ${selected === idx ? "bg-blue-100 border-blue-500" : "bg-gray-50"}`}
                                onClick={() => handleSelect(idx)}
                                disabled={submitted}
                            >
                                <span className="font-bold mr-2">{idx + 1}.</span> {choice}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-between w-full mt-4">
                        <button
                            type="button"
                            className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                            onClick={handleSubmit}
                            disabled={selected === null || submitted || closed}
                        >
                            Submit Answer
                        </button>

                        <button
                            type="button"
                            className="px-6 py-2 bg-violet-600 text-white rounded disabled:opacity-50"
                            onClick={handleAdvance}
                            disabled={!closed}
                        >
                            Next Question
                        </button>
                    </div>
                    {submitted && <div className="mt-2 text-green-600">Answer submitted!</div>}
                </div>
            </div>

            <div className="w-64 flex-shrink-0">
                <h3 className="text-lg font-semibold mb-2">Players</h3>
                <ul className="space-y-1">
                    {state.players.map((player) => {
                        const isCurrent = player.user.user_id === userId;
                        const submittedColor = !isCurrent && player.answered ? "bg-blue-200" : "";
                        return (
                            <li
                                key={player.user.username}
                                className={`grid grid-cols-3 items-center px-2 py-1 rounded ${isCurrent ? "bg-yellow-100" : submittedColor || "bg-gray-100"}`}
                            >
                                <span>{player.user.username}</span>
                                <span className="font-mono text-right">{player.points} pts</span>
                                <span className="font-mono text-right text-gray-500">ELO: {player.user.rating ?? "N/A"}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};
