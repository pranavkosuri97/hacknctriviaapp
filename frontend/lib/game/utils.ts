// builtin

// external

// internal
import type { GameMessage } from "./game-ws-types";
import type { GameState } from "./types";


export function getSelectedLetter(index: number): string {
    if (index < 0) return '';
    const code = 'A'.charCodeAt(0) + index;
    if (code > 'Z'.charCodeAt(0)) return '';
    return String.fromCharCode(code);
}

export function getNewGameState(previous: GameState, data: GameMessage): GameState {
    switch (data.type) {
        case "question_advanced": {
            const { question } = data.payload;
            return {
                ...previous,
                currentQuestion: {
                    question: question.prompt,
                    choices: question.choices,
                    answer: ""
                },
                answering: undefined,
                closed: false,
            };
        }
        case "answer_ack": {
            const { player_id, is_correct, points_earned, current_scores, can_advance } = data.payload;
            // Update players array
            const updatedPlayers = previous.players.map(player => {
                if (player.user.user_id === player_id) {
                    return {
                        ...player,
                        points: (current_scores.get(player_id) ?? player.points),
                        answered: true,
                    };
                }

                return {
                    ...player,
                    points: (current_scores.get(player.user.user_id) ?? player.points),
                };
            });
            return {
                ...previous,
                players: updatedPlayers,
                closed: can_advance,
            };
        }
        case "timer_update": {
            return {
                ...previous,
                time_remaining: data.payload.time_remaining
            };
        }
        case "error": {
            return previous;
        }
        default:
            return previous;
    }
}