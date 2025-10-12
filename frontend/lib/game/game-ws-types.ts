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

export interface StartedMessage {
    type: GameResponse.STARTED;
    payload: StartedSnapshot;
}

interface StartedSnapshot {
    game_id: string;
    question: GameQuestion;
    question_number: number;
    total_questions: number;
    time_remaining: number;
    players: GamePlayer[];
}

interface GamePlayer {
    id: string;
    name: string;
    elo: number;
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
    snapshot: GameSnapshot;
}

interface GameQuestion {
    prompt: string;
    choices: string[]
}

interface TimerMessage {
    type: GameResponse.TIMER;
    payload: TimerSnapshot;
    snapshot: GameSnapshot;
}

interface TimerSnapshot {
    game_id: string;
    time_remaining: number;
    question_number: number;
    snapshot: GameSnapshot;
}

export enum GameResponse {
    STARTED = "game_started",
    ERROR = "error",
    QUESTION_ADVANCED = "question_advanced",
    ANSWER = "answer_received",
    TIMER = "timer_update",
    ENDED = "game_ended",
}

export interface EndedMessage {
    type: GameResponse.ENDED;
    payload: EndedSnapshot;
}

export interface EndedSnapshot {
    snapshot: GameSnapshot;
}

export interface AnswerSnapshot {
    game_id: string;
    player_id: string;
    answer: string;
    is_correct: boolean;
    points_earned: number;
    current_scores: { [key: string]: number }
    question_number: number;
    can_advance: boolean;
    snapshot: GameSnapshot;
}

export interface GameSnapshot {
    game_id: string;
    is_running: boolean;
    is_finished: boolean;
    current_question_inde: number;
    can_advance: boolean;
    total_question: number;
    time_remaining: number;
    scores: { [key: string]: number }
    current_question: GameQuestion;
    current_answers: string[];
    players: GamePlayer[];
}

export type GameMessage = StartedMessage | EndedMessage | QuestionAdvancedMessage | AnswerMessage | TimerMessage | ErrorMessage;