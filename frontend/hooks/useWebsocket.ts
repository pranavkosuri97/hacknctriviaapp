import { useEffect, useRef, useCallback, useState } from "react";

type WSStatus = "CONNECTING" | "OPEN" | "CLOSED" | "ERROR";

export function useWebSocket<I, O>(
  url: string,
  onMessage: (data: O) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const queueRef = useRef<I[]>([]);
  const [status, setStatus] = useState<WSStatus>("CONNECTING");

  // Keep latest onMessage without forcing a reconnect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    setStatus("CONNECTING");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("OPEN");
      // Flush queued messages
      while (queueRef.current.length && ws.readyState === WebSocket.OPEN) {
        const next = queueRef.current.shift()!;
        ws.send(JSON.stringify(next));
      }
    };

    ws.onmessage = (event) => {
      try {
        onMessageRef.current(JSON.parse(event.data) as O);
      } catch (e) {
        // optionally report parse errors
        // console.error("WS message parse error", e);
      }
    };

    ws.onerror = () => setStatus("ERROR");
    ws.onclose = () => setStatus("CLOSED");

    return () => {
      // Close the same instance we opened
      if (wsRef.current === ws) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [url]);

  const send = useCallback((data: I) => {
    const ws = wsRef.current;
    if (!ws) {
      // not created yet; queue
      queueRef.current.push(data);
      return;
    }
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      // not open yet; queue
      queueRef.current.push(data);
    }
  }, []);

  const isOpen = status === "OPEN";

  return { send, status, isOpen };
}
