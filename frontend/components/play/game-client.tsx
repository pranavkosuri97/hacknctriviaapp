"use client";
// builtin

// external
import { useParams } from "next/navigation";

// internal
import GameRoom from "./game-room";
import type { GameState } from "@/lib/game/types";


export const sampleGameState: GameState = {
    players: [
        {
            user: { user_id: "u1", first_name: "a", last_name: "b", username: "Alice" },
            points: 10,
            answered: true,
        },
        {
            user: { user_id: "u2", first_name: "a", last_name: "b", username: "Bob" },
            points: 8,
            answered: false,
        },
        {
            user: { user_id: "u3", first_name: "a", last_name: "b", username: "Charlie" },
            points: 12,
            answered: true,
        },
    ],
    currentQuestion: {
        question: "What is the capital of France?",
        choices: ["Berlin", "Madrid", "Paris", "Rome"],
        answer: "Paris",
    },
    answering: undefined,
};

export default function GameRoomClient() {
    const { id } = useParams();


    return (
        <>
            <div>Game: {id}</div>
            <GameRoom
                gameState={sampleGameState}
                currentUserId="u2"
                onAnswer={() => { }}
            />
        </>
    );
}