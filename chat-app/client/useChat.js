import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function mergeMessage(messages, incoming) {
  const index = messages.findIndex((message) => message.id === incoming.id);
  if (index < 0) return [...messages, incoming];
  return messages.map((message) =>
    message.id === incoming.id
      ? { ...incoming, likes: Math.max(message.likes, incoming.likes) }
      : message,
  );
}
export function useChat() {
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const socket = io({ autoConnect: false });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);
      setError("");
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => {
      setConnected(false);
      setError("Cannot reach the chat server. Reconnecting automatically…");
    });
    socket.on("messages:sync", (history) => setMessages(history));
    socket.on("message:created", (message) =>
      setMessages((previous) => mergeMessage(previous, message)),
    );
    socket.on("message:updated", (message) =>
      setMessages((previous) => mergeMessage(previous, message)),
    );
    socket.connect();
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
  function publish(event, payload) {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket?.connected)
        return reject(
          new Error("You are offline. Wait for the connection and try again."),
        );
      socket.timeout(7000).emit(event, payload, (failure, result) => {
        if (failure || result?.error || !result?.message)
          return reject(
            new Error(result?.error || "Confirmation timed out. Please retry."),
          );
        setMessages((previous) => mergeMessage(previous, result.message));
        resolve(result.message);
      });
    });
  }
  return { messages, connected, error, publish };
}
