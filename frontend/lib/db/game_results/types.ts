// builtin

// external

// internal

export interface BackendGameRow {
    id: string;
    created_at?: string;
    reason: string;
    winner: string;
    player_1: string;
    player_2: string;
    p1_elo: number | null;
    p2_elo: number | null;
}

export enum GameOutcome {
    WIN = "WIN",
    DRAW = "DRAW",
    LOSS = "LOSS",
}

export interface GameResult {
    id: string;
    game_id: string;
    ordinal: number;
    result: GameOutcome;
    rating_change: number;
    rating_result: number;
}