// builtin

// external

// internal

export interface GameRequest {
    type: GameAction;
    answer?: string;
}

export enum GameAction {
    SUBMIT = "submit_answer",
    ADVANCE = "advance_question",
    LEAVE = "leave",
}

export interface AnswerMessage {
    type: GameResponse.ANSWER;
    payload: AnswerSnapshot;
}

interface ErrorMessage {
    type: GameResponse.ERROR;
    message: string;
}

interface QuestionAdvancedMessage {
    type: GameResponse.QUESTION_ADVANCED;
    payload: QuestionSnapshot;
}

interface QuestionSnapshot {
    game_id: string;
    question: GameQuestion;
    question_number: number;
    total_questions: number;
    time_remaining: number;
}

interface GameQuestion {
    prompt: string;
    choices: string[]
}

interface TimerMessage {
    type: GameResponse.TIMER;
    payload: TimerSnapshot;
}

interface TimerSnapshot {
    game_id: string;
    time_remaining: number;
    question_number: number;
}

export enum GameResponse {
    ERROR = "error",
    QUESTION_ADVANCED = "question_advanced",
    ANSWER = "answer_ack",
    TIMER = "timer_update"
}

export interface AnswerSnapshot {
    game_id: string;
    player_id: string;
    answer: string;
    is_correct: boolean,
    points_earned: number,
    current_scores: Map<string, number>,
    question_number: number,
    can_advance: boolean,
}

export type GameMessage = QuestionAdvancedMessage | AnswerMessage | TimerMessage | ErrorMessage;