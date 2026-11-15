import { createChatServer } from "./app.js";
const { httpServer, io } = createChatServer();
const port = Number(process.env.PORT || 3001);
httpServer.listen(port, () =>
  console.log(`Team chat server: http://localhost:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => io.close(() => process.exit(0)));
