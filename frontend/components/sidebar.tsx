"use client"
// builtin

// external
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import NavigationLogout from "./auth/navbar-logout";

// internal

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: "🏠" },
    { name: "Statistics", href: "/stats", icon: "📊" },
    { name: "Play", href: "/play", icon: "🎮" },
    { name: "Settings", href: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    return (
        <aside
            className={`top-0 left-0 h-screen bg-white dark:bg-zinc-900 shadow-lg z-40 transition-all duration-300 flex flex-col ${collapsed ? "w-16" : "w-56"}`}
        >
            <button
                type="button"
                className="p-2 focus:outline-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                <span className="text-xl">{collapsed ? "→" : "←"}</span>
            </button>
            <nav className="flex-1 mt-4">
                <ul className="space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${collapsed ? "justify-center" : ""} ${isActive ? "bg-blue-600 text-white dark:bg-blue-700" : "hover:bg-blue-100 dark:hover:bg-blue-900"}`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    {!collapsed && <span className="font-medium">{item.name}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div className="p-2 mt-auto">
                <NavigationLogout collapsed={collapsed} />
            </div>
        </aside>
    );
}
