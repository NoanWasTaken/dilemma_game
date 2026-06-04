import type { Server, Socket } from "socket.io";
import type { Room } from "@/types";
import { resolveDuel } from "../lib/duel.engine";

export function registerGameDuelHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
) {
  socket.on("duel:vote", (roomId: string, duelId: string, vote: "A" | "B") => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (room.state !== "DUELS") {
      socket.emit("duel:error", "Ce n'est pas la phase de duels");
      return;
    }
    if (room.currentDuelIndex === null) {
      socket.emit("duel:error", "Aucun duel en cours");
      return;
    }

    const duel = room.bracket[room.currentRound][room.currentDuelIndex];
    if (!duel || duel.id !== duelId) {
      socket.emit("duel:error", "Duel introuvable ou expiré");
      return;
    }
    if (Object.hasOwn(duel.votes, player.id)) {
      socket.emit("duel:error", "Vous avez déjà voté pour ce duel");
      return;
    }

    duel.votes[player.id] = vote;
    socket.emit("duel:voted", duel);
    if (Object.keys(duel.votes).length === room.players.length) {
      resolveDuel(io, room, duel, rooms);
    } else {
      io.to(roomId).emit("room:updated", room);
    }
  });
}
