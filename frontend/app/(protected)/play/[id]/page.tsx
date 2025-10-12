// builtin

// external

// internal
import GameRoomClient from "@/components/play/game-client";
import { getCurrentUserClient } from "@/lib/supabase/server";

export default async function GamePage() {

    const { userId } = await getCurrentUserClient();

    return (
        <GameRoomClient userId={userId} />
    );
}