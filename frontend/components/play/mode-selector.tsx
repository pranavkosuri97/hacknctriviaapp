"use client";
// builtin

// external
import { useEffect, useId, useState } from "react";

// internal
import { formatGameMode, GAME_MODES, GameMode, parseGameMode } from "@/lib/game/modes";
import { useWebSocket } from "@/hooks/useWebsocket";
import { mapUserToPlayer, type QueueMessage, type QueueRequest, QueueResponse, QueueStatus } from "@/lib/game/queue-ws-types";
import type { User } from "@/lib/db/user/types";
import { useRouter } from "next/navigation";

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
if (!WEBSOCKET_URL) throw new Error("Environment variable NEXT_PUBLIC_WEBSOCKET_URL is not set!");

interface GameModeSelectorProps {
    user: User;
}

export default function GameModeSelector({ user }: GameModeSelectorProps) {
    const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.NORMAL);
    const [loading, setLoading] = useState(false);
    const [queueTime, setQueueTime] = useState(0);
    const router = useRouter();
    const selectorId = useId();
    const { send } = useWebSocket<QueueRequest, QueueMessage>(`${WEBSOCKET_URL}/ws/lobby/${user.user_id}`, (data) => {
        console.log(data);
        if (data.type === QueueResponse.GAME_FOUND) {
            router.push(`/play/${data.game_id}`);
        }
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
        send({ player: mapUserToPlayer(user), type: QueueStatus.JOIN });
    };

    const handleStopQueue = () => {
        setLoading(false);
        send({ player: mapUserToPlayer(user), type: QueueStatus.LEAVE });
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