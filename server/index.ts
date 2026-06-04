import { Server as Engine } from "@socket.io/bun-engine";
import { Server } from "socket.io";
import { Hono } from "hono";
import type { Room } from "@/types";
import { registerRoomJoinHandlers } from "./handlers/room.join";
import { registerRoomManageHandlers } from "./handlers/room.manage";
import { registerRoomTransitionHandlers } from "./handlers/room.transition";
import { registerGameSubmissionHandlers } from "./handlers/game.submission";
import { registerGameDuelHandlers } from "./handlers/game.duel";
import { cors } from "hono/cors";

const rooms = new Map<string, Room>();

const io = new Server({
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
const engine = new Engine({
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
io.bind(engine);

io.on("connection", (socket) => {
  registerRoomJoinHandlers(io, socket, rooms);
  registerRoomManageHandlers(io, socket, rooms);
  registerRoomTransitionHandlers(io, socket, rooms);
  registerGameSubmissionHandlers(io, socket, rooms);
  registerGameDuelHandlers(io, socket, rooms);
});

const app = new Hono();
app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
  }),
);

const { websocket } = engine.handler();

const serverConfig = {
  port: 3001,
  idleTimeout: 30,

  fetch(req: Request, server: unknown) {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/socket.io/")) {
      const response = engine.handleRequest(req, server);

      if (response instanceof Response) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Access-Control-Allow-Origin", "http://localhost:3000");
        newHeaders.set("Access-Control-Allow-Methods", "GET, POST");
        newHeaders.set("Access-Control-Allow-Headers", "Content-Type");

        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      }

      return response;
    }

    return app.fetch(req, server);
  },
  websocket,
};

export default serverConfig;
