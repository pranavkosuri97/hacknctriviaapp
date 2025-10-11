"use client"
// builtin

// external

// internal
import { getFilteredResults, getRatingData } from "@/lib/stats/actions";
import type { User } from "@/lib/db/user/types";
import type { GameResult } from "@/lib/db/game_results/types";
import { RatingGraph } from "../stats/rating-graph";


export interface DashboardStatisticsProps {
    player: User;
    results: GameResult[];
}

const TIME_SCALE = 7;

export default function DashboardStatistics({ player, results }: DashboardStatisticsProps) {

    const sortedResults = [...results].sort((a: GameResult, b: GameResult) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());
    const currentRating = player.rating;

    const filteredResults = getFilteredResults(sortedResults, TIME_SCALE);
    const ratingData = getRatingData(filteredResults, TIME_SCALE);

    return (
        <div className="w-full p-2">
            <div className="mb-2 text-lg font-semibold">Current Rating: {currentRating}</div>
            <div className="mb-4 flex items-center justify-center w-full">
                <div className="w-full">
                    <RatingGraph data={ratingData} />
                </div>
            </div>
        </div>
    );
}