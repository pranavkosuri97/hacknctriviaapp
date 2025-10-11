"use client"
// builtin

// external

// internal
import type { GameResult } from "@/lib/db/game_results/types"
import type { User } from "@/lib/db/user/types";


export interface PlayerStatisticsProps {
    player: User;
    results: GameResult[];
}

export default function PlayerStatistics({ player, results }: PlayerStatisticsProps) {
    return (
        <div>
            Statistics
        </div>
    );
}