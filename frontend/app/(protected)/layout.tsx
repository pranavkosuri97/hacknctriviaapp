// builtin

// external
import { redirect } from "next/navigation";

// internal
import { getCurrentUserClient } from "@/lib/supabase/server";
import { getUserById } from "@/lib/db/user/crud";
import type { User } from "@/lib/db/user/types";


export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId, client } = await getCurrentUserClient();
    const user: User | null = await getUserById(client, userId);

    if (!user) {
        redirect("/auth/create-profile");
    }

    return (
        <div>
            {children}
        </div>
    );
}