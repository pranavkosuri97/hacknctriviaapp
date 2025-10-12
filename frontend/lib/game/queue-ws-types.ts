// builtin

// external

// internal
import type { User } from "../db/user/types";


export interface QueueRequest {
    player: QueuePlayerData;
    type: QueueStatus;
}

export interface QueuePlayerData {
    name: string;
    id: string;
    elo: number;
}

export enum QueueStatus {
    JOIN = "join",
    LEAVE = "leave"
}

export interface GameFoundMessage {
    type: QueueResponse.GAME_FOUND;
    game_id: string;
    opponent?: Opponent;
}

export interface ErrorMessage {
    type: QueueResponse.ERROR;
    message: string;
}

export interface Opponent {
    name: string;
    id: string;
}

export enum QueueResponse {
    GAME_FOUND = "game_found",
    ERROR = "error"
}

export type QueueMessage = GameFoundMessage | ErrorMessage;

export function mapUserToPlayer(user: User): QueuePlayerData {
    return {
        name: user.username,
        id: user.user_id,
        elo: user.rating
    };
}