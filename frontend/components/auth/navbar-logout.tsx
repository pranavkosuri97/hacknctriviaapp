"use client"
// builtin

// external
import { useRouter } from "next/navigation";

// internal
import { createClient } from "@/lib/supabase/client";

interface NavigationLogoutProps {
    collapsed: boolean
}

export default function NavigationLogout({ collapsed }: NavigationLogoutProps) {
    const router = useRouter();

    const logout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/auth/login");
    };

    return (
        <button
            type="button"
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all cursor-pointer hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 w-full ${collapsed ? "justify-center" : ""}`}
            onClick={logout}
        >
            <span className="text-xl">🚪</span>
            {!collapsed && <span className="font-medium">Sign Out</span>}
        </button>
    );
}