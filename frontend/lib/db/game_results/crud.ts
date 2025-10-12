// builtin

// external

// internal
import { GameOutcome, type BackendGameRow, type GameResult } from "./types";

function resolveBackendUrl(): string {
    const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL;

    if (!baseUrl) {
        throw new Error("Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL or BACKEND_URL.");
    }

    return baseUrl.replace(/\/$/, "");
}

function deriveOutcome(row: BackendGameRow, playerId: string): GameOutcome {
    if (row.winner === "draw") {
        return GameOutcome.DRAW;
    }

    const isPlayer1 = row.player_1 === playerId;
    const didWin = (row.winner === "player1" && isPlayer1) || (row.winner === "player2" && !isPlayer1);

    return didWin ? GameOutcome.WIN : GameOutcome.LOSS;
}

function getPlayerElo(row: BackendGameRow, playerId: string): number | null {
    if (row.player_1 === playerId) {
        return row.p1_elo ?? null;
    }
    if (row.player_2 === playerId) {
        return row.p2_elo ?? null;
    }
    return null;
}

export async function getGameResultsByPlayerId(
    playerId: string,
    limit = 5,
): Promise<GameResult[]> {
    const response = await fetch(`${resolveBackendUrl()}/games/${playerId}`);

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Failed to fetch player history: ${response.status} ${detail}`);
    }

    const payload: { games?: BackendGameRow[] } = await response.json();
    const games = payload.games ?? [];

    const filtered = games.filter((row) => row.player_1 === playerId || row.player_2 === playerId);
    const sliceStart = Math.max(filtered.length - Math.max(limit, 1), 0);
    const limited = filtered.slice(sliceStart);

    let previousRating: number | null = null;
    if (sliceStart > 0) {
        const priorRow = filtered[sliceStart - 1];
        previousRating = getPlayerElo(priorRow, playerId);
    }

    const results: GameResult[] = [];

    limited.forEach((row, idx) => {
        const playerElo = getPlayerElo(row, playerId);
        if (playerElo == null) {
            return;
        }

        const ratingChange = previousRating == null ? 0 : playerElo - previousRating;

        results.push({
            id: row.id,
            game_id: row.id,
            ordinal: sliceStart + idx,
            result: deriveOutcome(row, playerId),
            rating_change: ratingChange,
            rating_result: playerElo,
        });

        previousRating = playerElo;
    });

    return results;
}

