// builtin

// external

// internal


export interface GraphData {
    points: GraphPoint[];
}

export interface GraphPoint {
    date: string;
    rating: number;
    gameId: string;
    change: number;
}

export const TIME_SCALES = [
    { label: "1 Week", value: 7 },
    { label: "2 Weeks", value: 14 },
    { label: "Month", value: 30 },
    { label: "Year", value: 365 },
    { label: "All Time", value: Infinity },
];