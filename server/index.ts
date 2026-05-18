import { Server as Engine } from "@socket.io/bun-engine";
import { Server } from "socket.io";
import { Hono } from "hono";
import type { Room } from "@/types";
import { registerRoomHandlers } from "./handler/room";

const rooms = new Map<string, Room>();

const io = new Server();
const engine = new Engine();

io.bind(engine);

io.on("connection", (socket) => {
  registerRoomHandlers(io, socket, rooms);
});

const app = new Hono();

const { websocket } = engine.handler();

export default {
  port: 3001,
  idleTimeout: 30,

  fetch(req: Request, server: unknown) {
    const url = new URL(req.url);
    if (url.pathname === "/socket.io/") {
      return engine.handleRequest(req, server);
    } else {
      return app.fetch(req, server);
    }
  },
  websocket,
};
