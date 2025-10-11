// builtin

// external

// internal
import type { GameResult } from "../db/game_results/types";
import type { GraphData, GraphPoint } from "./types";


export function getRatingData(results: GameResult[], daysBack: number): GraphData {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);

    if (results.length === 0) return { points: [] };

    // Find the first result within the timescale
    const firstInTimescaleIdx = results.findIndex(r => new Date(r.played_at) >= cutoff);
    let preFirstRating = 0;
    if (firstInTimescaleIdx > 0) {
        // rating before first game in timescale
        preFirstRating = results[firstInTimescaleIdx].rating_result - results[firstInTimescaleIdx].rating_change;
    } else if (firstInTimescaleIdx === 0) {
        preFirstRating = results[0].rating_result - results[0].rating_change;
    } else {
        // No games in timescale, use last known rating
        preFirstRating = results.length > 0 ? results[0].rating_result - results[0].rating_change : 0;
    }

    const dayMap = new Map<string, { rating: number; gameIds: string[]; change: number }>();
    let lastRating = preFirstRating;
    results.forEach((result) => {
        const dateStr = new Date(result.played_at).toLocaleDateString();
        if (!dayMap.has(dateStr)) {
            dayMap.set(dateStr, { rating: result.rating_result, gameIds: [formatGameId(result.game_id ?? "start")], change: result.rating_change });
        } else {
            const entry = dayMap.get(dateStr);
            if (entry) {
                entry.rating = result.rating_result;
                entry.gameIds.push(formatGameId(result.game_id ?? "start"));
                entry.change += result.rating_change;
            }
        }
    });

    const firstDate = results[firstInTimescaleIdx] ? new Date(results[firstInTimescaleIdx].played_at) : cutoff;
    const startDate = cutoff > firstDate ? cutoff : firstDate;
    const endDate = new Date();

    const previousDate = new Date(startDate)
    previousDate.setDate(previousDate.getDate() - 1);
    const points: GraphPoint[] = [];
    // Add the cutoff/start point with preFirstRating
    points.push({
        date: previousDate.toLocaleDateString(),
        rating: preFirstRating,
        gameId: "",
        change: 0,
    });

    lastRating = preFirstRating;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toLocaleDateString();
        if (dayMap.has(dateStr)) {
            const entry = dayMap.get(dateStr);
            if (entry) {
                points.push({
                    date: dateStr,
                    rating: entry.rating,
                    gameId: entry.gameIds.join(", "),
                    change: entry.change,
                });
                lastRating = entry.rating;
            }
        } else {
            points.push({
                date: dateStr,
                rating: lastRating,
                gameId: "",
                change: 0,
            });
        }
    }

    return { points };
}

export function getAccumulatedChange(sortedResults: GameResult[]): number {
    return sortedResults.reduce((sum, r) => sum + r.rating_change, 0);
}

export function getFilteredResults(sortedResults: GameResult[], timescale_days: number): GameResult[] {
    if (timescale_days === Infinity) {
        return sortedResults;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timescale_days);
    return sortedResults.filter(r => new Date(r.played_at) >= cutoff);
}

export function formatGameId(gameId: string): string {
    const idx = gameId.indexOf("-");
    return idx !== -1 ? gameId.slice(0, idx) : gameId;
}