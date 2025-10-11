"use client"
// builtin

// external
import { useId, useState } from "react";

// internal
import type { User } from "@/lib/db/user/types";
import { formatGameId, getAccumulatedChange, getFilteredResults, getRatingData } from "@/lib/stats/actions";
import { GameOutcome, type GameResult } from "@/lib/db/game_results/types";
import { RatingGraph } from "./rating-graph";
import { TIME_SCALES } from "@/lib/stats/types";


export interface PlayerStatisticsProps {
    player: User;
    results: GameResult[];
}

export default function PlayerStatistics({ player, results }: PlayerStatisticsProps) {
    const [selectedScale, setSelectedScale] = useState<number>(14);
    const timeId = useId();

    const sortedResults = [...results].sort((a: GameResult, b: GameResult) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());
    const currentRating = player.rating;

    const filteredResults = getFilteredResults(sortedResults, selectedScale);
    const recentChange = getAccumulatedChange(filteredResults);

    const ratingData = getRatingData(filteredResults, selectedScale === Infinity ? 10000 : selectedScale);

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{player.username}'s Statistics</h2>
            <div className="mb-4 flex items-center gap-6">
                <div className="text-xl font-semibold">Current Rating: <span className="font-mono">{currentRating}</span></div>
                <div className="text-lg">
                    Change: <span className={recentChange > 0 ? "text-green-600" : recentChange < 0 ? "text-red-600" : "text-gray-600"}>
                        {recentChange > 0 ? "+" : ""}{recentChange}
                    </span>
                </div>
            </div>
            <div className="mb-6">
                <label htmlFor={timeId} className="block mb-2 font-medium">Time Scale</label>
                <select
                    id={timeId}
                    className="w-48 border rounded px-3 py-2"
                    value={selectedScale}
                    onChange={e => setSelectedScale(e.target.value === "Infinity" ? Infinity : Number(e.target.value))}
                >
                    {TIME_SCALES.map(scale => (
                        <option key={scale.label} value={scale.value}>{scale.label}</option>
                    ))}
                </select>
            </div>
            <div className="mb-8">
                <RatingGraph data={ratingData} />
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2">Game History</h3>
                <div className="overflow-x-auto bg-white rounded shadow">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">Game ID</th>
                                <th className="px-3 py-2 text-left">Result</th>
                                <th className="px-3 py-2 text-right">Rating Change</th>
                                <th className="px-3 py-2 text-right">New Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults
                                .sort((a: GameResult, b: GameResult) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
                                .map((result: GameResult) => {
                                    if (!result.game_id) return;
                                    let rowColor = "";
                                    if (result.result === GameOutcome.WIN) rowColor = "bg-green-100";
                                    else if (result.result === GameOutcome.LOSS) rowColor = "bg-red-100";
                                    else if (result.result === GameOutcome.DRAW) rowColor = "bg-slate-100";
                                    return (
                                        <tr key={result.id} className={`border-b ${rowColor}`}>
                                            <td className="px-3 py-2">{new Date(result.played_at).toLocaleDateString()}</td>
                                            <td className="px-3 py-2">{formatGameId(result.game_id)}</td>
                                            <td className="px-3 py-2">{result.result}</td>
                                            <td className="px-3 py-2 text-right">{result.rating_change > 0 ? "+" : ""}{result.rating_change}</td>
                                            <td className="px-3 py-2 text-right">{result.rating_result}</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}