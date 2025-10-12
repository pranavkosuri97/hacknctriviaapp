// builtin

import { User } from "../db/user/types";

// external

// internal


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

export interface QueueMessage {
    gameId: string;
}

export function mapUserToPlayer(user: User): QueuePlayerData {
    return {
        name: user.username,
        id: user.user_id,
        elo: user.rating
    };
}