import type { Server, Socket } from "socket.io";
import type { Room } from "@/types";

export function registerRoomManageHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
) {
  socket.on(
    "room:settings",
    (roomId: string, settings: Partial<Room["settings"]>) => {
      const room = rooms.get(roomId);

      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player || !player.isHost) return;

      if (typeof settings.maxPlayers === "number") {
        settings.maxPlayers = Math.max(2, Math.min(16, settings.maxPlayers));
      }

      room.settings = { ...room.settings, ...settings };
      io.to(roomId).emit("room:updated", room);
    },
  );

  socket.on("player:ready", (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    player.isReady = !player.isReady;
    io.to(roomId).emit("room:updated", room);
  });

  socket.on("player:kick", (roomId: string, playerId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const requester = room.players.find((p) => p.id === socket.id);
    if (!requester?.isHost) return;

    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      rooms.delete(roomId);
      return;
    }

    const kickedSocket = io.sockets.sockets.get(playerId);
    if (kickedSocket) {
      kickedSocket.leave(roomId);
      kickedSocket.emit("player:kicked");
    }
    io.to(roomId).emit("room:updated", room);
  });
}
