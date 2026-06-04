import type { Server, Socket } from "socket.io";
import type { Room, Player } from "@/types";
import { generateRoomId } from "../lib/room.utils";

export function registerRoomJoinHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
) {
  socket.on("room:create", () => {
    const roomId = generateRoomId();

    const room: Room = {
      id: roomId,
      state: "LOBBY",
      settings: {
        category: "",
        maxPlayers: 16,
        timer: null,
        anonymousProposals: false,
        hostCanSkip: false,
      },
      players: [],
      proposals: [],
      bracket: [],
      currentRound: 0,
      currentDuelIndex: 0,
      targetedProposalCount: 2,
    };
    rooms.set(roomId, room);

    setTimeout(() => {
      const r = rooms.get(roomId);
      if (r && r.players.length === 0) {
        rooms.delete(roomId);
      }
    }, 30000);

    socket.join(roomId);
    socket.emit("room:created", room);
  });

  socket.on("room:join", (roomId: string) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit("room:error", "Room introuvable");
      return;
    }

    socket.join(roomId);
    socket.emit("room:updated", room);
  });

  socket.on(
    "player:join",
    (roomId: string, playerName: string, clientToken?: string) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit("room:error", "Room introuvable");
        return;
      }

      if (room.state !== "LOBBY") {
        socket.emit("room:error", "Partie déjà en cours");
        return;
      }

      if (typeof playerName !== "string") return;
      const cleanPlayerName = playerName.substring(0, 20);

      const existingPlayer = room.players.find(
        (p) => p.name === cleanPlayerName,
      );
      if (existingPlayer) {
        if (existingPlayer.token !== clientToken) {
          socket.emit("room:error", "Ce pseudo est déjà pris");
          return;
        }
        existingPlayer.id = socket.id;
        existingPlayer.isConnected = true;
        io.to(roomId).emit("room:updated", room);
        return;
      }

      const nameAlreadyTaken = room.players.some(
        (p) => p.name === cleanPlayerName && p.id !== socket.id,
      );
      if (nameAlreadyTaken) {
        socket.emit("room:error", "Ce pseudo est déjà pris");
        return;
      }

      if (room.players.length >= room.settings.maxPlayers) {
        socket.emit("room:error", "Room pleine");
        return;
      }
      const token = crypto.randomUUID();

      const player: Player = {
        id: socket.id,
        name: cleanPlayerName,
        isHost: room.players.length === 0,
        isReady: false,
        mustSubmitTwoProposals: false,
        submittedCount: 0,
        isConnected: true,
        token,
      };

      socket.emit("player:token", token);
      room.players.push(player);
      io.to(roomId).emit("room:updated", room);
    },
  );
}
