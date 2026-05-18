import type { Server, Socket } from "socket.io";
import type { Room, Player } from "../../types";

function getTargetCount(playerCount: number): number {
  return Math.pow(2, Math.ceil(Math.log2(playerCount)));
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
) {
  // Créer une room
  socket.on("room:create", (playerName: string) => {
    const roomId = generateRoomId();

    const player: Player = {
      id: socket.id,
      name: playerName,
      isHost: true,
      isReady: false,
      mustSubmitTwo: false,
      submittedCount: 0,
    };

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
      players: [player],
      proposals: [],
      bracket: [],
      currentRound: 0,
      currentDuelIndex: 0,
      targetedProposalCount: 2,
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit("room:created", room);
  });

  // Rejoindre une room
  socket.on("room:join", (roomId: string, playerName: string) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit("room:error", "Room introuvable");
      return;
    }

    if (room.state !== "LOBBY") {
      socket.emit("room:error", "Partie déjà en cours");
      return;
    }

    if (room.players.length >= room.settings.maxPlayers) {
      socket.emit("room:error", "Room pleine");
      return;
    }

    const player: Player = {
      id: socket.id,
      name: playerName,
      isHost: false,
      isReady: false,
      mustSubmitTwo: false,
      submittedCount: 0,
    };

    room.players.push(player);
    socket.join(roomId);

    // Broadcast à toute la room
    io.to(roomId).emit("room:updated", room);
  });

  // Mettre à jour les settings (host uniquement)
  socket.on(
    "room:settings",
    (roomId: string, settings: Partial<Room["settings"]>) => {
      const room = rooms.get(roomId);

      if (!room) return;
      if (room.players.find((p) => p.id === socket.id)?.isHost === false)
        return;

      room.settings = { ...room.settings, ...settings };
      io.to(roomId).emit("room:updated", room);
    },
  );

  // Joueur prêt
  socket.on("room:ready", (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    player.isReady = true;
    io.to(roomId).emit("room:updated", room);
  });

  // Lancer la partie (host uniquement)≥
  socket.on("room:start", (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player?.isHost) return;

    if (!room.players.every((p) => p.isReady)) {
      socket.emit("room:error", "Tous les joueurs ne sont pas prêts");
      return;
    }

    // Calcul du nombre de propositions cible
    const target = getTargetCount(room.players.length);
    room.targetedProposalCount = target;

    // Désigner aléatoirement qui soumet 2 props
    const extras = target - room.players.length;
    const shuffled = [...room.players].sort(() => Math.random() - 0.5);
    shuffled.slice(0, extras).forEach((p) => {
      const player = room.players.find((rp) => rp.id === p.id);
      if (player) player.mustSubmitTwo = true;
    });

    room.state = "SUBMISSION";
    io.to(roomId).emit("room:updated", room);
  });

  // Déconnexion
  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      const room = rooms.get(roomId);
      if (!room) continue;

      room.players = room.players.filter((p) => p.id !== socket.id);

      if (room.players.length === 0) {
        rooms.delete(roomId);
        continue;
      }

      // Si c'était le host, on passe le rôle au suivant
      if (!room.players.some((p) => p.isHost)) {
        room.players[0].isHost = true;
      }

      io.to(roomId).emit("room:updated", room);
    }
  });
}
