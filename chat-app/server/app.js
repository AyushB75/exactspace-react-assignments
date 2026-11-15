import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import { USERS, MAX_MESSAGE_LENGTH } from "../shared/constants.js";

// State lives for the server's lifetime. IDs make acknowledged retries idempotent.
export function createChatServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { maxHttpBufferSize: 16384 });
  const messages = [];
  const messageRequests = new Map();
  const likeRequests = new Set();
  app.get("/api/health", (_request, response) =>
    response.json({ status: "ok" }),
  );
  app.use(express.static(fileURLToPath(new URL("../dist", import.meta.url))));

  io.on("connection", (socket) => {
    socket.emit("messages:sync", messages);
    socket.on("message:send", (payload, acknowledge = () => {}) => {
      const ack = typeof acknowledge === "function" ? acknowledge : () => {};
      if (
        !payload ||
        typeof payload.requestId !== "string" ||
        payload.requestId.length > 100 ||
        !payload.requestId ||
        typeof payload.text !== "string" ||
        !payload.text.trim() ||
        payload.text.length > MAX_MESSAGE_LENGTH
      ) {
        return ack({
          error: "Enter a message between 1 and 2,000 characters.",
        });
      }
      if (messageRequests.has(payload.requestId))
        return ack({ message: messageRequests.get(payload.requestId) });
      const message = {
        id: randomUUID(),
        text: payload.text.trim(),
        username: USERS[Math.floor(Math.random() * USERS.length)],
        likes: 0,
        createdAt: new Date().toISOString(),
      };
      messages.push(message);
      messageRequests.set(payload.requestId, message);
      io.emit("message:created", message);
      ack({ message });
    });
    socket.on("message:like", (payload, acknowledge = () => {}) => {
      const ack = typeof acknowledge === "function" ? acknowledge : () => {};
      if (
        !payload ||
        typeof payload.requestId !== "string" ||
        !payload.requestId ||
        payload.requestId.length > 100
      )
        return ack({ error: "Invalid like request." });
      const message = messages.find((item) => item.id === payload.messageId);
      if (!message)
        return ack({ error: "This message is no longer available." });
      if (!likeRequests.has(payload.requestId)) {
        message.likes += 1;
        likeRequests.add(payload.requestId);
        io.emit("message:updated", message);
      }
      ack({ message });
    });
  });
  return { app, httpServer, io };
}
