"use client";
// builtin

// external
import { useParams } from "next/navigation";

// internal
import GameRoom from "./game-room";
import type { GameState } from "@/lib/game/types";


export const sampleGameState: GameState = {
    players: [],
    currentQuestion: {
        question: "",
        choices: [],
        answer: "",
    },
    currentQuestionIndex: 0,
    closed: false,
    time_remaining: 0,
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