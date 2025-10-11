// builtin

// external

// internal
import type { SupabaseClient } from "@supabase/supabase-js";
import { createUser, usernameExists } from "../db/user/crud";
import type { User } from "../db/user/types";


export async function createProfile(client: SupabaseClient, userData: Omit<User, 'user_id'>) {
    const usernameAlreadyExists = await usernameExists(client, userData.username);
    if (usernameAlreadyExists) {
        throw new Error("Username already exists. Please choose a different one.");
    }

    try {
        await createUser(client, userData);
    } catch (error) {
        throw new Error(`Failed to create profile: ${(error as Error).message}`);
    }
};