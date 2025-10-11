// builtin

// external

// internal


export enum GameMode {
    NORMAL = "normal"
}

export const GAME_MODES: GameMode[] = [GameMode.NORMAL];

export function parseGameMode(input: string): GameMode {
    const normalized = input.trim().toLowerCase();
    for (const mode of GAME_MODES) {
        if (mode.toLowerCase() === normalized) {
            return mode;
        }
    }
    return GameMode.NORMAL;
}

export function formatGameMode(mode: GameMode): string {
    const str = mode.toString();
    return str.charAt(0).toUpperCase() + str.slice(1);
}