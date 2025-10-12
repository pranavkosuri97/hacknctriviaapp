// builtin

// external

// internal


export interface QueueRequest {
    userId: string;
    status: QueueStatus;
}

export enum QueueStatus {
    JOIN = "join",
    LEAVE = "leave"
}

export interface QueueMessage {
    gameId: string;
}