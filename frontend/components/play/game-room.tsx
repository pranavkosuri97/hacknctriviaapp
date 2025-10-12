"use client";
// builtin 

// external
import { useEffect, useState } from "react";

// internal
import type { GameState } from "../../lib/game/types";
import { useWebSocket } from "@/hooks/useWebsocket";
import { GameAction, type GameMessage, type GameRequest } from "@/lib/game/game-ws-types";
import { getNewGameState, getSelectedLetter } from "@/lib/game/utils";
import Link from "next/link";

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
if (!WEBSOCKET_URL) throw new Error("Environment variable NEXT_PUBLIC_WEBSOCKET_URL is not set!");

interface GameRoomProps {
    gameState: GameState;
    userId: string;
    gameId: string;
}
export default function GameRoom({ gameState, userId, gameId }: GameRoomProps) {
    const [state, setState] = useState<GameState>(gameState);
    const [selected, setSelected] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const { send } = useWebSocket<GameRequest, GameMessage>(
        `${WEBSOCKET_URL}/ws/games/${gameId}/${userId}`,
        (data) => {
            setState(prev => {
                const previousQuestion = prev.currentQuestion.question;
                const newState = getNewGameState(prev, data)
                if (previousQuestion !== newState.currentQuestion.question) {
                    resetButtons();
                }
                return newState;
            });
        }
    );

    const resetButtons = () => {
        setSelected(null);
        setSubmitted(false);
    }

    const handleSelect = (idx: number) => {
        if (!submitted) setSelected(idx);
    };

    const handleSubmit = () => {
        if (selected !== null && !submitted && !state.closed) {
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
            if (submitted) {
                if (e.key === "n" || e.key === "N") {
                    if (state.closed) {
                        handleAdvance();
                    }
                }
                return;
            }

            if (e.key >= "1" && e.key <= "9") {
                const idx = parseInt(e.key, 10) - 1;
                if (state.currentQuestion.choices && idx < state.currentQuestion.choices.length) {
                    setSelected(idx);
                }
            } else if (e.key === "Enter") {
                if (selected !== null) {
                    handleSubmit();
                }
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selected, submitted, state.currentQuestion.choices]);

    if (state.isFinished) {
        return (
            <div className="game-result p-8 max-w-xl mx-auto bg-white rounded shadow flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
                <div className="mb-4 w-full">
                    <h3 className="text-lg font-semibold mb-2">Final Scores</h3>
                    <ul className="space-y-2">
                        {state.players.map((player) => (
                            <li key={player.user.username} className="flex justify-between px-4 py-2 bg-gray-100 rounded">
                                <span>{player.user.username}</span>
                                <span className="font-mono">{player.points} pts</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <Link href="/dashboard" className="mt-6 px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700">Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="game-room p-2 sm:p-6 max-w-4xl mx-auto bg-white rounded shadow flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">Trivia Question</h2>
                <div className="mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="text-lg font-semibold">{state.currentQuestion.question}</div>
                    <div className="text-lg font-mono px-3 py-1 bg-gray-200 rounded self-end sm:self-auto">
                        ⏰ {state.time_remaining ?? 0}s
                    </div>
                </div>
                <div className="mb-6">
                    <div className="grid grid-cols-1 gap-2">
                        {state.currentQuestion.choices?.map((choice, idx) => {
                            let buttonColor = "bg-gray-50 border-gray-300";
                            const answerIndex = state.currentQuestion.answer

                            if ((submitted || state.closed) && idx === answerIndex) {
                                buttonColor = "bg-green-100 border-green-600";
                            }

                            if ((submitted || state.closed) && selected === idx && idx !== answerIndex) {
                                buttonColor = "bg-red-100 border-red-600";
                            }

                            if (!submitted && !state.closed && selected === idx) {
                                buttonColor = "bg-blue-100 border-blue-500";
                            }
                            return (
                                <button
                                    type="button"
                                    key={choice}
                                    className={`border rounded px-4 py-2 text-left w-full ${buttonColor}`}
                                    onClick={() => handleSelect(idx)}
                                    disabled={submitted}
                                >
                                    <span className="font-bold mr-2">{idx + 1}.</span> {choice}
                                </button>
                            )
                        })}
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between w-full mt-4 gap-2">
                        <button
                            type="button"
                            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                            onClick={handleSubmit}
                            disabled={selected === null || submitted || state.closed}
                        >
                            Submit Answer
                        </button>

                        <button
                            type="button"
                            className="w-full sm:w-auto px-6 py-2 bg-violet-600 text-white rounded disabled:opacity-50"
                            onClick={handleAdvance}
                            disabled={!state.closed}
                        >
                            Next Question
                        </button>
                    </div>
                    {submitted && <div className="mt-2 text-green-600">Answer submitted!</div>}
                </div>
            </div>

            <div className="w-full sm:w-64 flex-shrink-0 mt-4 sm:mt-0">
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
