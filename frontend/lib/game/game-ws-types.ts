// builtin

// external

// internal

export interface GameRequest {
    player: string;
    answer: number;
    type: GameAction;
}

export enum GameAction {
    SUBMIT = "submit_answer",
    ADVANCE = "advance_question",
    LEAVE = "leave",
}

export interface GameMessage {
    type: GameResponse;
    message?: string;
    payload?: GameSnapshot;
}

export enum GameResponse {
    ERROR = "error",
    ANSWER = "answer_ack"
}

export interface GameSnapshot {
    game_id: string;
    player_id: string;
}