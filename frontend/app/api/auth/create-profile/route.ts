// builtin

// external
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// internal
import { getCurrentUserClient } from "@/lib/supabase/server";
import { createUser, getUserById, usernameExists } from "@/lib/db/user/crud";
import type { User } from "@/lib/db/user/types";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { first_name, last_name, username }: Omit<User, 'user_id'> = body;

        if (!first_name?.trim() || !last_name?.trim() || !username?.trim()) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        if (username.length < 3) {
            return NextResponse.json(
                { error: "Username must be at least 3 characters" },
                { status: 400 }
            );
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return NextResponse.json(
                { error: "Username can only contain letters, numbers, and underscores" },
                { status: 400 }
            );
        }

        const { userId, client } = await getCurrentUserClient();

        const existingUser = await getUserById(client, userId);
        if (existingUser) {
            return NextResponse.json(
                { error: "Profile already exists" },
                { status: 409 }
            );
        }

        const usernameAlreadyExists = await usernameExists(client, username);
        if (usernameAlreadyExists) {
            return NextResponse.json(
                { error: "Username already exists. Please choose a different one." },
                { status: 409 }
            );
        }

        const userData = {
            user_id: userId,
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            username: username.trim(),
        };

        const newUser = await createUser(client, userData);

        return NextResponse.json(
            {
                message: "Profile created successfully",
                user: newUser
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("API error:", error);

        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}