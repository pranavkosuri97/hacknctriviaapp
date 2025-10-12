// builtin

// external
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// internal
import { getCurrentUserClient } from "@/lib/supabase/server";
import { createUser, getUserById, usernameExists } from "@/lib/db/user/crud";
import { DEFAULT_RATING, type User } from "@/lib/db/user/types";

function resolveBackendUrl(): string {
    const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.BACKEND_URL;

    if (!baseUrl) {
        throw new Error("Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL or BACKEND_URL.");
    }

    return baseUrl.replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { game_id, question_number}: { game_id: string; question_number: number} = body;

        const backendUrl = resolveBackendUrl();
        const data = fetch(`${backendUrl}/answers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ game_id: game_id, question_number: question_number })
        }).then(res => res.json()).then(data => data);

        if (!data) {
            return NextResponse.json(
                { error: "Failed to fetch answers" },
                { status: 500 }
            );
        }
        
        return NextResponse.json(
            data,
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in /api/answers:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}