// builtin

// external

// interal


export interface GameResult {
    id: number;
    game_id: string;
    player_id: string;
    played_at: Date;
    result: GameOutcome;
    rating_change: number;
    rating_result: number;
}

export enum GameOutcome {
    WIN = "win",
    DRAW = "draw",
    LOSS = "loss",
}