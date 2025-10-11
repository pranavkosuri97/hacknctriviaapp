// builtin

// external
import type { SupabaseClient } from '@supabase/supabase-js';

// internal
import type { User } from './types';

// CREATE - Insert a new user
export async function createUser(
    supabase: SupabaseClient,
    userData: Omit<User, 'user_id'>
): Promise<User> {
    const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
    }

    return data as User;
}

// READ - Get user by ID
export async function getUserById(
    supabase: SupabaseClient,
    id: string
): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null; // User not found
        }
        throw new Error(`Failed to get user: ${error.message}`);
    }

    return data as User;
}

// READ - Get user by username
export async function getUserByUsername(
    supabase: SupabaseClient,
    username: string
): Promise<User | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null; // User not found
        }
        throw new Error(`Failed to get user: ${error.message}`);
    }

    return data as User;
}

// READ - Get all users (with optional pagination)
export async function getAllUsers(
    supabase: SupabaseClient,
    options?: {
        limit?: number;
        offset?: number;
        orderBy?: keyof User;
        ascending?: boolean;
    }
): Promise<User[]> {
    let query = supabase.from('users').select('*');

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to get users: ${error.message}`);
    }

    return data as User[];
}

// UPDATE - Update user by ID
export async function updateUser(
    supabase: SupabaseClient,
    id: string,
    updates: Partial<Omit<User, 'user_id'>>
): Promise<User> {
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update user: ${error.message}`);
    }

    return data as User;
}

// DELETE - Delete user by ID
export async function deleteUser(
    supabase: SupabaseClient,
    id: string
): Promise<boolean> {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', id);

    if (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
    }

    return true;
}

// UTILITY - Check if username exists
export async function usernameExists(
    supabase: SupabaseClient,
    username: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from('users')
        .select('user_id')
        .eq('username', username)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to check username: ${error.message}`);
    }

    return !!data;
}

// UTILITY - Search users by name
export async function searchUsersByName(
    supabase: SupabaseClient,
    searchTerm: string,
    limit: number = 10
): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .limit(limit);

    if (error) {
        throw new Error(`Failed to search users: ${error.message}`);
    }

    return data as User[];
}


