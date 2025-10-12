// builtin

// external

// internal
import type { GameMessage, GameSnapshot } from "./game-ws-types";
import type { GameState } from "./types";


export function getSelectedLetter(index: number): string {
    if (index < 0) return '';
    const code = 'A'.charCodeAt(0) + index;
    if (code > 'Z'.charCodeAt(0)) return '';
    return String.fromCharCode(code);
}

export function getNewGameState(previous: GameState, data: GameMessage): GameState {
    switch (data.type) {
        case "game_started": {
            const { question, time_remaining, players } = data.payload;
            const mappedPlayers = players.map(p => ({
                user: {
                    user_id: p.id,
                    username: p.name,
                    rating: p.elo,
                },
                points: 0,
                answered: false,
            }));
            return {
                ...previous,
                currentQuestion: {
                    question: question.prompt,
                    choices: question.choices,
                    answer: ""
                },
                players: mappedPlayers,
                closed: false,
                time_remaining,
            };
        }
        case "question_advanced": {
            const { question } = data.payload;
            return {
                ...previous,
                currentQuestion: {
                    question: question.prompt,
                    choices: question.choices,
                    answer: ""
                },
                closed: false,

            };
        }
        case "answer_received": {
            const { snapshot } = data.payload;
            return mapSnapshotToGameState(previous, snapshot);
        }
        case "timer_update": {
            const { snapshot } = data.payload;
            return mapSnapshotToGameState(previous, snapshot);
        }
        case "game_ended": {
            const { snapshot } = data.payload;
            return mapSnapshotToGameState(previous, snapshot);
        }
        case "error": {
            return previous;
        }
        default:
            return previous;
    }
}

function mapSnapshotToGameState(previous: GameState, snapshot: GameSnapshot): GameState {
    console.log("Snapshot", snapshot);
    const mappedPlayers = snapshot.players.map((p, idx) => ({
        user: {
            user_id: p.id,
            username: p.name,
            rating: p.elo,
        },
        points: snapshot.scores[`player${idx + 1}`] ?? 0,
        answered: snapshot.current_answers.includes(p.id),
    }));

    return {
        ...previous,
        currentQuestion: snapshot.current_question ? {
            question: snapshot.current_question.prompt ?? "",
            choices: snapshot.current_question.choices ?? "",
            answer: ""
        } : {
            question: "",
            choices: [],
            answer: ""
        },
        players: mappedPlayers,
        closed: snapshot.can_advance,
        time_remaining: snapshot.time_remaining,
        isFinished: snapshot.is_finished
    };
}