// builtin

// external

// interal


export interface GameResult {
    id: number;
    game_id: string | null;
    player_id: string;
    played_at: Date;
    result: GameOutcome | null;
    rating_change: number;
    rating_result: number;
}

export enum GameOutcome {
    WIN = "WIN",
    DRAW = "DRAW",
    LOSS = "LOSS",
}