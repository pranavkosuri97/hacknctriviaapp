// builtin

// external
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// internal
import { getCurrentUserClient } from "@/lib/supabase/server";
import { getUserById, updateUser, usernameExists } from "@/lib/db/user/crud";
import type { User } from "@/lib/db/user/types";

// GET - Get current user's profile
export async function GET() {
    try {
        const { userId, client } = await getCurrentUserClient();

        const user = await getUserById(client, userId);

        if (!user) {
            return NextResponse.json(
                { error: "Profile not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ user });

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

// PUT - Update user's profile
export async function PUT(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { first_name, last_name, username }: Partial<Omit<User, 'user_id'>> = body;

        // Validate required fields if provided
        if (first_name !== undefined && !first_name?.trim()) {
            return NextResponse.json(
                { error: "First name cannot be empty" },
                { status: 400 }
            );
        }

        if (last_name !== undefined && !last_name?.trim()) {
            return NextResponse.json(
                { error: "Last name cannot be empty" },
                { status: 400 }
            );
        }

        // Validate username format if provided
        if (username !== undefined) {
            if (!username?.trim()) {
                return NextResponse.json(
                    { error: "Username cannot be empty" },
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
        }

        const { userId, client } = await getCurrentUserClient();

        // Get current user
        const currentUser = await getUserById(client, userId);
        if (!currentUser) {
            return NextResponse.json(
                { error: "Profile not found" },
                { status: 404 }
            );
        }

        // Check if username already exists (if username is being changed)
        if (username && username !== currentUser.username) {
            const usernameAlreadyExists = await usernameExists(client, username);
            if (usernameAlreadyExists) {
                return NextResponse.json(
                    { error: "Username already exists. Please choose a different one." },
                    { status: 409 }
                );
            }
        }

        // Prepare update data (only include provided fields)
        const updateData: Partial<Omit<User, 'user_id'>> = {};
        if (first_name !== undefined) updateData.first_name = first_name.trim();
        if (last_name !== undefined) updateData.last_name = last_name.trim();
        if (username !== undefined) updateData.username = username.trim();

        // If no fields to update
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No fields provided for update" },
                { status: 400 }
            );
        }

        // Update user profile
        const updatedUser = await updateUser(client, userId, updateData);

        return NextResponse.json(
            {
                message: "Profile updated successfully",
                user: updatedUser
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("API error:", error);

        // Handle redirect from getCurrentUserClient (not authenticated)
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
