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
            user: { user_id: "u1", first_name: "a", last_name: "b", username: "Alice", rating: 100 },
            points: 10,
            answered: true,
        },
        {
            user: { user_id: "u2", first_name: "a", last_name: "b", username: "Bob", rating: 120 },
            points: 8,
            answered: false,
        },
        {
            user: { user_id: "u3", first_name: "a", last_name: "b", username: "Charlie", rating: 110 },
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
    closed: false,
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