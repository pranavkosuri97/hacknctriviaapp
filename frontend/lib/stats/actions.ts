// builtin

// external

// internal
import type { GameResult } from "../db/game_results/types";
import type { GraphData, GraphPoint } from "./types";


export function getRatingData(results: GameResult[], maxGames: number): GraphData {
    if (results.length === 0) {
        return { points: [] };
    }

    const count = maxGames === Infinity ? results.length : Math.max(1, Math.floor(maxGames));
    const source = results.slice(-count).slice(-5);

    const points: GraphPoint[] = source.map((result) => ({
        date: `Game ${result.ordinal + 1}`,
        rating: result.rating_result,
        gameId: formatGameId(result.game_id),
        change: result.rating_change,
    }));

    return { points };
}

export function getAccumulatedChange(sortedResults: GameResult[]): number {
    return sortedResults.reduce((sum, r) => sum + r.rating_change, 0);
}

export function getFilteredResults(sortedResults: GameResult[], maxGames: number): GameResult[] {
    if (maxGames === Infinity) {
        return sortedResults;
    }

    const count = Math.max(1, Math.floor(maxGames));
    return sortedResults.slice(-count);
}

export function formatGameId(gameId: string): string {
    const idx = gameId.indexOf("-");
    return idx !== -1 ? gameId.slice(0, idx) : gameId;
}