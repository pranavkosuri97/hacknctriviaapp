// builtin

// external

// internal
import type { User } from "../db/user/types";

export interface GameState {
    players: Player[];
    currentQuestion: Question;
    answering: Player | undefined;
    closed: boolean;
}

export interface Player {
    user: User;
    points: number;
    answered: boolean;
}

export interface Question {
    question: string;
    choices: string[];
    answer: string;
}