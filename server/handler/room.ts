import type { Server, Socket } from "socket.io";
import type { Room, Player } from "@/types";

export function getTargetCount(playerCount: number): number {
  return Math.pow(2, Math.ceil(Math.log2(playerCount)));
}

function generateRoomId(): string {
  return crypto.randomUUID().substring(0, 6).toUpperCase();
}

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
) {
  // Créer une room
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
        console.log(`[ROOM] ${roomId} — supprimée pour inactivité`);
      }
    }, 30000);

    socket.join(roomId);
    socket.emit("room:created", room);
    console.log(`[ROOM] ${roomId} — event: created`);
  });

  // Rejoindre une room
  socket.on("room:join", (roomId: string) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit("room:error", "Room introuvable");
      return;
    }

    if (room.state !== "LOBBY") {
      socket.emit("room:error", "Partie déjà en cours");
      return;
    }

    socket.join(roomId);
    socket.emit("room:updated", room); // on lui envoie l'état actuel de la room
  });

  socket.on("player:join", (roomId: string, playerName: string) => {
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
    const cleanPlayerName = playerName.substring(0, 20); // Limite de 20 char

    const existingPlayer = room.players.find((p) => p.id === socket.id);
    if (existingPlayer) {
      existingPlayer.name = cleanPlayerName;
      io.to(roomId).emit("room:updated", room);
      return;
    }

    if (room.players.length >= room.settings.maxPlayers) {
      socket.emit("room:error", "Room pleine");
      return;
    }

    const player: Player = {
      id: socket.id,
      name: cleanPlayerName,
      isHost: room.players.length === 0, // Le premier joueur est le host
      isReady: false,
      mustSubmitTwoProposals: false,
      submittedCount: 0,
    };

    room.players.push(player);
    io.to(roomId).emit("room:updated", room);
    console.log(`[ROOM] ${roomId} — event: player joined (${cleanPlayerName})`);
  });

  // Mettre à jour les settings (host uniquement)
  socket.on(
    "room:settings",
    (roomId: string, settings: Partial<Room["settings"]>) => {
      const room = rooms.get(roomId);

      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player || !player.isHost) return; // Faille de sécurité corrigée

      // Validation basique des données
      if (typeof settings.maxPlayers === "number") {
        settings.maxPlayers = Math.max(2, Math.min(16, settings.maxPlayers));
      }

      room.settings = { ...room.settings, ...settings };
      io.to(roomId).emit("room:updated", room);
    },
  );

  // Joueur prêt
  socket.on("player:ready", (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    player.isReady = !player.isReady; // toggle
    io.to(roomId).emit("room:updated", room);
    console.log(`[ROOM] ${roomId} — event: player ready (${player.name})`);
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
    console.log(`[ROOM] ${roomId} — event: player kicked (${playerId})`);
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
      if (player) player.mustSubmitTwoProposals = true;
    });

    room.state = "SUBMISSION";
    io.to(roomId).emit("room:updated", room);
    console.log(`[ROOM] ${roomId} — event: game started`);
  });

  // Quitter volontairement une room
  socket.on("room:leave", (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex((p) => p.id === socket.id);
    if (playerIndex === -1) return;

    room.players.splice(playerIndex, 1);
    socket.leave(roomId);

    if (room.players.length === 0) {
      rooms.delete(roomId);
      console.log(`[ROOM] ${roomId} — supprimée car vide suite au départ`);
    } else {
      if (!room.players.some((p) => p.isHost)) {
        room.players[0].isHost = true;
      }
      io.to(roomId).emit("room:updated", room);
      console.log(`[ROOM] ${roomId} — event: player left (${socket.id})`);
    }
  });

  // Déconnexion
  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log(
            `[ROOM] ${roomId} — supprimée car vide suite à déconnexion`,
          );
        } else {
          // Si c'était le host, on passe le rôle au suivant
          if (!room.players.some((p) => p.isHost)) {
            room.players[0].isHost = true;
          }
          io.to(roomId).emit("room:updated", room);
          console.log(`[ROOM] ${roomId} — event: player left (${socket.id})`);
        }
      }
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
      settings: { ...room.settings }, // copie des settings
      players: [],
      proposals: [],
      bracket: [],
      currentRound: 0,
      currentDuelIndex: 0,
      targetedProposalCount: 2,
    };

    rooms.set(newRoomId, newRoom);

    // Notifie tous les joueurs qu'une nouvelle room est disponible
    io.to(roomId).emit("room:next", { newRoomId, hostName: player.name });

    console.log(`[ROOM] ${roomId} — nouvelle partie créée : ${newRoomId}`);
  });
  socket.on(
    "room:transfer",
    (oldRoomId: string, newRoomId: string, playerName: string) => {
      if (typeof playerName !== "string") return;
      const cleanPlayerName = playerName.substring(0, 20);

      const newRoom = rooms.get(newRoomId);
      if (!newRoom || newRoom.state !== "LOBBY") return; // L'attaquant ne peut plus outrepasser la limite LOBBY

      socket.leave(oldRoomId);
      socket.join(newRoomId);

      const existingPlayer = newRoom.players.find((p) => p.id === socket.id);
      if (!existingPlayer) {
        if (newRoom.players.length >= newRoom.settings.maxPlayers) return; // Limite stricte

        const player: Player = {
          id: socket.id,
          name: cleanPlayerName,
          isHost: newRoom.players.length === 0, // le premier transféré (le host) devient host
          isReady: false,
          mustSubmitTwoProposals: false,
          submittedCount: 0,
        };
        newRoom.players.push(player);
      }

      // Retirer le joueur de l'ancienne room et la supprimer si vide
      const oldRoom = rooms.get(oldRoomId);
      if (oldRoom) {
        oldRoom.players = oldRoom.players.filter((p) => p.id !== socket.id);

        if (oldRoom.players.length === 0) {
          rooms.delete(oldRoomId);
          console.log(
            `[ROOM] ${oldRoomId} — supprimée car vide suite au transfert`,
          );
        } else {
          // Re-désigner un host dans l'ancienne room au cas où l'hôte est parti
          if (!oldRoom.players.some((p) => p.isHost)) {
            oldRoom.players[0].isHost = true;
          }
          io.to(oldRoomId).emit("room:updated", oldRoom);
        }
      }

      io.to(newRoomId).emit("room:updated", newRoom);
      console.log(`[ROOM] ${newRoomId} — joueur transféré : ${playerName}`);
    },
  );
}
