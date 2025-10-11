// builtin

// external

// internal
import type { GameResult } from "@/lib/db/game_results/types";
import { getGameResultsByPlayerId } from "@/lib/db/game_results/crud";
import { getUserById } from "@/lib/db/user/crud";
import type { User } from "@/lib/db/user/types";
import { getCurrentUserClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardStatistics from "@/components/dashboard/dashboard-statistics";
import Link from "next/link";


export default async function Dashboard() {
    const { userId, client } = await getCurrentUserClient();

    const user: User | null = await getUserById(client, userId);

    if (!user) {
        redirect("/auth/create-profile");
    }

    const userGames: GameResult[] = await getGameResultsByPlayerId(client, userId);

    return (
        <div className="flex flex-col w-full min-h-[60vh] max-h-screen overflow-hidden pb-12 items-center justify-center">
            <h1 className="pt-12 text-3xl font-bold flex-none">Welcome back, {user.first_name}</h1>
            <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6 flex-1 items-stretch justify-center w-full">
                {/* Left: Statistics */}
                <div className="flex-1 min-h-full max-w-xl bg-white dark:bg-zinc-900 rounded-xl shadow-md p-4 md:p-6 flex flex-col justify-between min-w-[320px]">
                    <h2 className="text-2xl font-bold mb-4">Recent Statistics</h2>
                    <DashboardStatistics
                        player={user}
                        results={userGames}
                    />
                    <Link href="/stats" className="mt-4 text-blue-600 hover:underline">More Statistics</Link>
                </div>

                {/* Right: Play */}
                <div className="flex-1 min-h-full max-w-xl bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md p-4 md:p-6 flex items-center justify-center min-w-[320px]">
                    <div className="flex flex-col items-center justify-center w-full">
                        <h2 className="text-2xl font-bold text-white mb-4">Ready to Play?</h2>
                        <Link href="/play" className="w-full flex flex-col items-center">
                            <button type="button" className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-full shadow hover:bg-blue-100 transition-all text-lg">
                                Play Now
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}