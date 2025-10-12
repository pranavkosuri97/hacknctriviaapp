// builtin

// external

// internal
import GameModeSelector from "@/components/play/mode-selector";
import { getCurrentUserClient } from "@/lib/supabase/server";

export default async function QueueGamePage() {
    const { userId } = await getCurrentUserClient();

    return (
        <GameModeSelector userId={userId} />
    );
}
