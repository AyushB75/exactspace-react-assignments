// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as connect } from "socket.io-client";
import { createChatServer } from "./app.js";
import { USERS } from "../shared/constants.js";
let server, url, clients;
const once = (socket, event) =>
  new Promise((resolve) => socket.once(event, resolve));
const emit = (socket, event, payload) =>
  new Promise((resolve, reject) =>
    socket
      .timeout(2000)
      .emit(event, payload, (error, response) =>
        error ? reject(error) : resolve(response),
      ),
  );
async function client() {
  const socket = connect(url, {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: false,
  });
  clients.push(socket);
  const synced = once(socket, "messages:sync");
  socket.connect();
  return { socket, history: await synced };
}
beforeEach(async () => {
  clients = [];
  server = createChatServer();
  await new Promise((resolve) =>
    server.httpServer.listen(0, "127.0.0.1", resolve),
  );
  url = `http://127.0.0.1:${server.httpServer.address().port}`;
});
afterEach(async () => {
  clients.forEach((socket) => socket.disconnect());
  await new Promise((resolve) => server.io.close(resolve));
});
describe("Socket.IO chat server", () => {
  it("broadcasts messages to both clients and assigns only allowed usernames", async () => {
    const a = await client();
    const b = await client();
    expect(a.history).toEqual([]);
    const receivedA = once(a.socket, "message:created");
    const receivedB = once(b.socket, "message:created");
    const result = await emit(a.socket, "message:send", {
      requestId: "send-1",
      text: "Hello @Bob 👋",
    });
    expect(await receivedA).toEqual(result.message);
    expect(await receivedB).toEqual(result.message);
    expect(USERS).toContain(result.message.username);
    expect(result.message.likes).toBe(0);
  });
  it("synchronizes concurrent likes, keeps messages independent, and makes retries idempotent", async () => {
    const a = await client();
    const b = await client();
    const { message } = await emit(a.socket, "message:send", {
      requestId: "send-1",
      text: "First",
    });
    const second = await emit(a.socket, "message:send", {
      requestId: "send-2",
      text: "Second",
    });
    const duplicate = await emit(a.socket, "message:send", {
      requestId: "send-1",
      text: "First",
    });
    expect(duplicate.message.id).toBe(message.id);
    await Promise.all([
      emit(a.socket, "message:like", {
        requestId: "like-1",
        messageId: message.id,
      }),
      emit(b.socket, "message:like", {
        requestId: "like-2",
        messageId: message.id,
      }),
    ]);
    const retry = await emit(a.socket, "message:like", {
      requestId: "like-1",
      messageId: message.id,
    });
    expect(retry.message.likes).toBe(2);
    const c = await client();
    expect(c.history).toHaveLength(2);
    expect(c.history[0].likes).toBe(2);
    expect(c.history[1].id).toBe(second.message.id);
    expect(c.history[1].likes).toBe(0);
  });
  it("resynchronizes missed messages and likes after a client reconnects", async () => {
    const a = await client();
    const b = await client();
    b.socket.disconnect();
    const { message } = await emit(a.socket, "message:send", {
      requestId: "offline-message",
      text: "While you were away",
    });
    await emit(a.socket, "message:like", {
      requestId: "offline-like",
      messageId: message.id,
    });
    const synced = once(b.socket, "messages:sync");
    b.socket.connect();
    expect(await synced).toEqual([
      expect.objectContaining({ text: "While you were away", likes: 1 }),
    ]);
  });
  it("rejects empty, malformed and oversized messages and unknown likes without crashing", async () => {
    const a = await client();
    for (const payload of [
      null,
      {},
      { requestId: "a", text: "  " },
      { requestId: "b", text: "x".repeat(2001) },
    ])
      expect(await emit(a.socket, "message:send", payload)).toHaveProperty(
        "error",
      );
    expect(
      await emit(a.socket, "message:like", {
        requestId: "c",
        messageId: "missing",
      }),
    ).toHaveProperty("error");
    expect(await emit(a.socket, "message:like", null)).toHaveProperty("error");
    const { history } = await client();
    expect(history).toEqual([]);
    expect((await fetch(`${url}/api/health`)).status).toBe(200);
  });
});
