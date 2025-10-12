"use client";
// builtin

// external
import { useEffect, useId, useState } from "react";

// internal
import { formatGameMode, GAME_MODES, GameMode, parseGameMode } from "@/lib/game/modes";
import { useWebSocket } from "@/hooks/useWebsocket";
import { type QueueMessage, type QueueRequest, QueueStatus } from "@/lib/game/queue-ws-types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error("Environment variable NEXT_PUBLIC_BACKEND_URL is not set!");

interface GameModeSelectorProps {
    userId: string;
}

export default function GameModeSelector({ userId }: GameModeSelectorProps) {
    const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.NORMAL);
    const [loading, setLoading] = useState(false);
    const [queueTime, setQueueTime] = useState(0);
    const selectorId = useId();
    const { send } = useWebSocket<QueueRequest, QueueMessage>(`${BACKEND_URL}/lobby/${userId}`, (data) => {
        console.log(data);
    });

    useEffect(() => {
        let timer: NodeJS.Timeout | undefined;
        if (loading) {
            timer = setInterval(() => {
                setQueueTime(t => t + 1);
            }, 1000);
        } else {
            setQueueTime(0);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [loading]);

    const handleQueue = () => {
        setLoading(true);
        send({ userId, status: QueueStatus.JOIN });
    };

    const handleStopQueue = () => {
        setLoading(false);
        send({ userId, status: QueueStatus.LEAVE });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-3xl font-bold mb-6">Queue a Game</h1>
            <div className="mb-4 w-64">
                <label htmlFor={selectorId} className="block mb-2 font-medium">Game Mode</label>
                <select
                    id={selectorId}
                    className="w-full border rounded px-3 py-2"
                    value={selectedMode}
                    onChange={e => setSelectedMode(parseGameMode(e.target.value))}
                    disabled={loading}
                >
                    {GAME_MODES.map(mode => (
                        <option key={mode} value={mode}>{formatGameMode(mode)}</option>
                    ))}
                </select>
            </div>
            <div className="mb-4">
                {loading && (
                    <div className="flex flex-col items-center">
                        <div className="text-blue-600 font-semibold mb-1">Queuing...</div>
                        <div className="text-lg">{queueTime}s</div>
                    </div>
                )}
            </div>
            {!loading ? (
                <button
                    type="button"
                    className="px-6 py-2 bg-blue-600 text-white rounded font-semibold disabled:opacity-50"
                    onClick={handleQueue}
                >
                    Queue Game
                </button>
            ) : (
                <button
                    type="button"
                    className="px-6 py-2 bg-red-600 text-white rounded font-semibold"
                    onClick={handleStopQueue}
                >
                    Stop Queue
                </button>
            )}
        </div>
    );
}