// builtin

// external
import { Card } from "pixel-retroui";

// internal
import PlayerStatistics from "@/components/stats/player-statistics";
import { getGameResultsByPlayerId } from "@/lib/db/game_results/crud";
import type { GameResult } from "@/lib/db/game_results/types";
import { getUserById } from "@/lib/db/user/crud";
import type { User } from "@/lib/db/user/types";
import { getCurrentUserClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";


export default async function StatisticsPage() {
    const { userId, client } = await getCurrentUserClient();

    const user: User | null = await getUserById(client, userId);

    if (!user) {
        redirect("/auth/create-profile");
    }

    const userGames: GameResult[] = await getGameResultsByPlayerId(userId);

    return (
        <Card bg="#ffffff" textColor="#000000" className="p-6 rounded-xl shadow-md">
            <PlayerStatistics player={user} results={userGames} />
        </Card>
    );
}