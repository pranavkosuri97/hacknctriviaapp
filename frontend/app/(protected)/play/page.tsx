// builtin

// external

// internal
import GameModeSelector from "@/components/play/mode-selector";
import { getUserById } from "@/lib/db/user/crud";
import type { User } from "@/lib/db/user/types";
import { getCurrentUserClient } from "@/lib/supabase/server";

export default async function QueueGamePage() {
    const { userId, client } = await getCurrentUserClient();

    const user: User | null = await getUserById(client, userId);

    if (!user) {
        throw new Error("User not found!");
    }

    return (
        <GameModeSelector user={user} />
    );
}
