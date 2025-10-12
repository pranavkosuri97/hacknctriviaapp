// builtin

// external
import { Card } from "pixel-retroui";

// internal
import GameRoomClient from "@/components/play/game-client";
import { getCurrentUserClient } from "@/lib/supabase/server";

export default async function GamePage() {

    const { userId } = await getCurrentUserClient();

    return (
        <Card bg="#ffffff" textColor="#000000" className="p-6 rounded-xl shadow-md">
            <GameRoomClient userId={userId} />
        </Card>
    );
}