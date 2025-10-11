"use client";
// builtin 

// external

// internal

import { useEffect, useState } from "react";
import type { GameState } from "../../lib/game/types";

interface GameRoomProps {
    gameState: GameState;
    onAnswer: (choiceIndex: number) => void;
    currentUserId: string;
}

export default function GameRoom({ gameState, onAnswer, currentUserId }: GameRoomProps) {
    const { currentQuestion, players } = gameState;
    const [selected, setSelected] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const handleSelect = (idx: number) => {
        if (!submitted) setSelected(idx);
    };

    const handleSubmit = () => {
        if (selected !== null && !submitted) {
            onAnswer(selected);
            setSubmitted(true);
        }
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: Just wrong
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (submitted) return;

            if (e.key >= "1" && e.key <= "9") {
                const idx = parseInt(e.key, 10) - 1;
                if (currentQuestion.choices && idx < currentQuestion.choices.length) {
                    setSelected(idx);
                }
            }

            if (e.key === "Enter") {
                if (selected !== null) {
                    handleSubmit();
                }
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selected, submitted, currentQuestion.choices]);

    return (
        <div className="game-room p-6 max-w-4xl mx-auto bg-white rounded shadow flex flex-row gap-8">
            <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4">Trivia Question</h2>
                <div className="mb-6">
                    <div className="text-lg font-semibold mb-2">{currentQuestion.question}</div>
                    <div className="grid grid-cols-1 gap-2">
                        {currentQuestion.choices?.map((choice, idx) => (
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
                    <button
                        type="button"
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                        onClick={handleSubmit}
                        disabled={selected === null || submitted}
                    >
                        Submit Answer
                    </button>
                    {submitted && <div className="mt-2 text-green-600">Answer submitted!</div>}
                </div>
            </div>

            <div className="w-64 flex-shrink-0">
                <h3 className="text-lg font-semibold mb-2">Players</h3>
                <ul className="space-y-1">
                    {players.map((player) => {
                        const isCurrent = player.user.user_id === currentUserId;
                        const submittedColor = !isCurrent && player.answered ? "bg-blue-200" : "";
                        return (
                            <li
                                key={player.user.username}
                                className={`grid grid-cols-2 items-center px-2 py-1 rounded ${isCurrent ? "bg-yellow-100" : submittedColor || "bg-gray-100"}`}
                            >
                                <span>{player.user.username}</span>
                                <span className="font-mono text-right">{player.points} pts</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};
