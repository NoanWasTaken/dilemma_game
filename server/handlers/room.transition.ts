import type { Server, Socket } from "socket.io";
import type { Room, Player } from "@/types";
import { getTargetCount, generateRoomId } from "../lib/room.utils";

export function registerRoomTransitionHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
) {
  socket.on("room:start", (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return;

    if (!room.players.every((p) => p.isReady)) {
      socket.emit("room:error", "Tous les joueurs ne sont pas prêts");
      return;
    }

    const target = getTargetCount(room.players.length);
    room.targetedProposalCount = target;

    const extras = target - room.players.length;
    const shuffled = [...room.players].sort(() => Math.random() - 0.5);
    shuffled.slice(0, extras).forEach((p) => {
      const player = room.players.find((rp) => rp.id === p.id);
      if (player) player.mustSubmitTwoProposals = true;
    });

    room.state = "SUBMISSION";
    io.to(roomId).emit("room:updated", room);
  });

  socket.on("room:leave", (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex((p) => p.id === socket.id);
    if (playerIndex === -1) return;

    room.players.splice(playerIndex, 1);
    socket.leave(roomId);

    if (room.players.length === 0) {
      rooms.delete(roomId);
    } else {
      if (!room.players.some((p) => p.isHost)) {
        room.players[0].isHost = true;
      }
      io.to(roomId).emit("room:updated", room);
    }
  });

  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms.entries()) {
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) continue;

      const disconnectedName = player.name;

      player.isConnected = false;
      io.to(roomId).emit("room:updated", room);

      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (!currentRoom) return;

        const p = currentRoom.players.find(
          (p) => p.name === disconnectedName && !p.isConnected,
        );
        if (!p) return;

        currentRoom.players = currentRoom.players.filter(
          (pl) => pl.name !== disconnectedName,
        );

        if (currentRoom.players.length === 0) {
          rooms.delete(roomId);
          return;
        }

        if (!currentRoom.players.some((p) => p.isHost)) {
          currentRoom.players[0].isHost = true;
        }

        io.to(roomId).emit("room:updated", currentRoom);
      }, 30000);
    }
  });

  socket.on("room:next", (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return;

    const newRoomId = generateRoomId();
    const newRoom: Room = {
      id: newRoomId,
      state: "LOBBY",
      settings: { ...room.settings },
      players: [],
      proposals: [],
      bracket: [],
      currentRound: 0,
      currentDuelIndex: 0,
      targetedProposalCount: 2,
    };

    rooms.set(newRoomId, newRoom);

    io.to(roomId).emit("room:next", { newRoomId, hostName: player.name });
  });

  socket.on(
    "room:transfer",
    (oldRoomId: string, newRoomId: string, playerName: string) => {
      if (typeof playerName !== "string") return;
      const cleanPlayerName = playerName.substring(0, 20);

      const newRoom = rooms.get(newRoomId);
      if (!newRoom || newRoom.state !== "LOBBY") return;

      socket.leave(oldRoomId);
      socket.join(newRoomId);

      const existingPlayer = newRoom.players.find((p) => p.id === socket.id);
      if (!existingPlayer) {
        if (newRoom.players.length >= newRoom.settings.maxPlayers) return;

        const player: Player = {
          id: socket.id,
          name: cleanPlayerName,
          isHost: newRoom.players.length === 0,
          isReady: false,
          mustSubmitTwoProposals: false,
          submittedCount: 0,
          token: crypto.randomUUID(),
        };
        newRoom.players.push(player);
      }

      const oldRoom = rooms.get(oldRoomId);
      if (oldRoom) {
        oldRoom.players = oldRoom.players.filter((p) => p.id !== socket.id);

        if (oldRoom.players.length === 0) {
          rooms.delete(oldRoomId);
        } else {
          if (!oldRoom.players.some((p) => p.isHost)) {
            oldRoom.players[0].isHost = true;
          }
          io.to(oldRoomId).emit("room:updated", oldRoom);
        }
      }

      io.to(newRoomId).emit("room:updated", newRoom);
    },
  );
}
