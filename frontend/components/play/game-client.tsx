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
            user: { user_id: "u1", username: "Alice", rating: 100 },
            points: 10,
            answered: true,
        },
        {
            user: { user_id: "u2", username: "Bob", rating: 120 },
            points: 8,
            answered: false,
        },
    ],
    currentQuestion: {
        question: "What is the capital of France?",
        choices: ["Berlin", "Madrid", "Paris", "Rome"],
        answer: "Paris",
    },
    closed: false,
    time_remaining: 100,
    isFinished: false,
};

export interface GameRoomClientProp {
    userId: string;
}

export default function GameRoomClient({ userId }: GameRoomClientProp) {
    const { id } = useParams();

    return (
        <GameRoom
            gameState={sampleGameState}
            userId={userId}
            gameId={id as string}
        />
    );
}