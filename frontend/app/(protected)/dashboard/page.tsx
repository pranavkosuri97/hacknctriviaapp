// builtin

// external
import { Card, Button } from "pixel-retroui";
import Link from "next/link";

// internal
import type { GameResult } from "@/lib/db/game_results/types";
import { getGameResultsByPlayerId } from "@/lib/db/game_results/crud";
import { getUserById } from "@/lib/db/user/crud";
import type { User } from "@/lib/db/user/types";
import { getCurrentUserClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardStatistics from "@/components/dashboard/dashboard-statistics";


export default async function Dashboard() {
    const { userId, client } = await getCurrentUserClient();

    const user: User | null = await getUserById(client, userId);

    if (!user) {
        redirect("/auth/create-profile");
    }

    const userGames: GameResult[] = await getGameResultsByPlayerId(userId);

    return (
        <div className="flex flex-col w-full min-h-[60vh] max-h-screen overflow-hidden pb-12 items-center justify-center">
            <h1 className="pt-12 text-3xl font-minecraft flex-none">Welcome back, {user.first_name}</h1>
            <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6 flex-1 items-stretch justify-center w-full">
                {/* Left: Statistics */}
                <Card bg="#ffffff" textColor="#000000" className="flex-1 min-h-full max-w-xl rounded-xl shadow-md p-4 md:p-6 flex flex-col justify-between min-w-[320px]">
                    <h2 className="text-2xl font-minecraft mb-4">Recent Statistics</h2>
                    <DashboardStatistics
                        player={user}
                        results={userGames}
                    />
                    <Link href="/stats" className="mt-4 text-blue-600 hover:underline">More Statistics</Link>
                </Card>

                {/* Right: Play */}
                <Card bg="#6a0dad" textColor="#ffffff" className="flex-1 min-h-full max-w-xl rounded-xl shadow-md p-4 md:p-6 flex items-center justify-center min-w-[320px]">
                    <div className="flex flex-col items-center justify-center w-full">
                        <h2 className="text-2xl font-minecraft text-white mb-4">Ready to Play?</h2>
                        <Button bg="#ffffff" textColor="#6a0dad" className="w-full text-lg text-center transition mb-4 flex items-center justify-center gap-2">
                            <Link href="/play">
                                Play Now
                            </Link>
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}