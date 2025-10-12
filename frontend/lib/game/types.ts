// builtin

// external

// internal
import type { User } from "../db/user/types";

export interface GameState {
    players: Player[];
    currentQuestion: Question;
    answering: Player | undefined;
    time_remaining: number;
    closed: boolean;
}

export interface Player {
    user: Omit<Omit<User, "first_name">, "last_name">;
    points: number;
    answered: boolean;
}

export interface Question {
    question: string;
    choices: string[];
    answer: string;
}