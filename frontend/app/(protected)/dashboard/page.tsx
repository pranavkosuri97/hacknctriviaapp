// builtin

// external
import Link from "next/link";

// internal
import type { GameResult } from "@/lib/db/game_results/types";
import { getGameResultsByPlayerId } from "@/lib/db/game_results/crud";
import { getUserById } from "@/lib/db/user/crud";
import type { User } from "@/lib/db/user/types";
import { getCurrentUserClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlayerStatistics from "@/components/dashboard/player-statistics";


export default async function Dashboard() {
    const { userId, client } = await getCurrentUserClient();

    const user: User | null = await getUserById(client, userId);

    if (!user) {
        redirect("/auth/create-profile");
    }

    const userGames: GameResult[] = await getGameResultsByPlayerId(client, userId);

    return (
        <div>
            Dashboard

            <Link href="/play">
                Play a game
            </Link>

            <PlayerStatistics player={user} results={userGames} />
        </div>
    );
}