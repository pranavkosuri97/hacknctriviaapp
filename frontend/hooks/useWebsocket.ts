// builtin

// external
import { useEffect, useRef } from "react";

// internal


export function useWebSocket<I, O>(url: string, onMessage: (data: O) => void) {
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        wsRef.current = new WebSocket(url);
        wsRef.current.onmessage = (event) => {
            onMessage(JSON.parse(event.data));
        };
        return () => {
            wsRef.current?.close();
        };
    }, [url, onMessage]);

    const send = (data: I) => {
        wsRef.current?.send(JSON.stringify(data));
    };

    return { send, ws: wsRef.current };
}