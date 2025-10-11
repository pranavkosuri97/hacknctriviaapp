// builtin

// external
import type { SupabaseClient } from '@supabase/supabase-js';

// internal
import type { GameResult } from './types';


export async function getGameResultById(
    supabase: SupabaseClient,
    id: number
): Promise<GameResult | null> {
    const { data, error } = await supabase
        .from('game_results')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw new Error(`Failed to get game result: ${error.message}`);
    }

    return data as GameResult;
}

export async function getGameResultsByGameId(
    supabase: SupabaseClient,
    gameId: string
): Promise<GameResult[]> {
    const { data, error } = await supabase
        .from('game_results')
        .select('*')
        .eq('game_id', gameId);

    if (error) {
        throw new Error(`Failed to get game results: ${error.message}`);
    }

    return data as GameResult[];
}

export async function getGameResultsByPlayerId(
    supabase: SupabaseClient,
    playerId: string
): Promise<GameResult[]> {
    const { data, error } = await supabase
        .from('game_results')
        .select('*')
        .eq('player_id', playerId);

    if (error) {
        throw new Error(`Failed to get game results: ${error.message}`);
    }

    return data as GameResult[];
}

export async function createNewUserGameResult(
    supabase: SupabaseClient,
    player_id: string,
    default_rating: number,
): Promise<GameResult> {
    const result: Omit<GameResult, "id"> = {
        game_id: null,
        player_id,
        played_at: new Date(),
        result: null,
        rating_change: 0,
        rating_result: default_rating,
    }

    const { data, error } = await supabase
        .from('game_results')
        .insert([result])
        .select('*')
        .single();

    if (error) {
        throw new Error(`Failed to create game result: ${error.message}`);
    }

    return data as GameResult;
}

