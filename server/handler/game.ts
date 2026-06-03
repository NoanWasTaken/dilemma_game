import type { Server, Socket } from "socket.io";
import type { Room, Proposal, Duel } from "../../types";

export function registerGameHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
) {
  socket.on("proposal:submit", (roomId: string, text: string) => {
    if (typeof text !== "string") return;
    const cleanText = text.substring(0, 150).trim(); // Prevent too long strings
    if (!cleanText) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (room.state !== "SUBMISSION") {
      socket.emit("proposal:error", "Ce n'est pas la phase de soumission");
      return;
    }

    if (player.mustSubmitTwoProposals && player.submittedCount >= 2) {
      socket.emit("proposal:error", "Vous avez déjà soumis vos 2 propositions");
      return;
    }

    if (!player.mustSubmitTwoProposals && player.submittedCount >= 1) {
      socket.emit("proposal:error", "Vous avez déjà soumis votre proposition");
      return;
    }
    if (room.proposals.length == room.targetedProposalCount) {
      socket.emit(
        "proposal:error",
        "Le nombre de propositions ciblé a déjà été atteint",
      );
      return;
    }
    const proposal: Proposal = {
      id: crypto.randomUUID(),
      text: cleanText,
      authorId: player.id,
      eliminated: false,
    };

    room.proposals.push(proposal);
    player.submittedCount++;
    socket.emit("proposal:submitted", proposal);
    console.log(`[GAME] ${roomId} — event: proposal submitted (${cleanText})`);

    if (room.proposals.length == room.targetedProposalCount) {
      // Démarrer les duels
      room.state = "DUELS";
      room.bracket.push(generateRound(room.proposals, 0));
      startDuel(io, room, rooms);
    }

    io.to(roomId).emit("room:updated", room);
  });

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
    if (duel.votes.hasOwnProperty(player.id)) {
      socket.emit("duel:error", "Vous avez déjà voté pour ce duel");
      return;
    }

    duel.votes[player.id] = vote;
    socket.emit("duel:voted", duel);
    console.log(
      `[GAME] ${roomId} — event: duel voted (${player.id} -> ${vote})`,
    );
    if (Object.keys(duel.votes).length === room.players.length) {
      resolveDuel(io, room, duel, rooms);
    } else {
      io.to(roomId).emit("room:updated", room);
    }
  });
}

function generateRound(proposals: Proposal[], roundIndex: number): Duel[] {
  const duels: Duel[] = [];
  const shuffledProposals = [...proposals].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffledProposals.length; i += 2) {
    duels.push({
      id: crypto.randomUUID(),
      roundIndex: roundIndex,
      proposalA: shuffledProposals[i],
      proposalB: shuffledProposals[i + 1],
      votes: {},
      winner: null,
      endsAt: null,
    });
  }
  return duels;
}

function startDuel(io: Server, room: Room, rooms: Map<string, Room>) {
  const duel = room.bracket[room.currentRound][room.currentDuelIndex!];
  if (!duel) return;

  // Calculer endsAt si timer activé
  if (room.settings.timer) {
    duel.endsAt = Date.now() + room.settings.timer * 1000;

    setTimeout(() => {
      // Vérifier que la room existe encore et que c'est toujours le même duel
      const currentRoom = rooms.get(room.id);
      if (!currentRoom) return;

      const currentDuel =
        currentRoom.bracket[currentRoom.currentRound][
          currentRoom.currentDuelIndex!
        ];
      if (!currentDuel || currentDuel.id !== duel.id) return;
      if (currentDuel.winner !== null) return; // déjà terminé

      // Forcer la fin du duel
      resolveDuel(io, currentRoom, currentDuel, rooms);
    }, room.settings.timer * 1000);
  }

  io.to(room.id).emit("room:updated", room);
}

function resolveDuel(
  io: Server,
  room: Room,
  duel: Duel,
  rooms: Map<string, Room>,
) {
  // Déterminer le gagnant
  const votesA = Object.values(duel.votes).filter((v) => v === "A").length;
  const votesB = Object.values(duel.votes).filter((v) => v === "B").length;

  if (votesA > votesB) {
    duel.winner = "A";
  } else if (votesB > votesA) {
    duel.winner = "B";
  } else {
    duel.winner = Math.random() < 0.5 ? "A" : "B";
  }

  // Progression
  if (room.currentDuelIndex! >= room.bracket[room.currentRound].length - 1) {
    const winners = room.bracket[room.currentRound]
      .map((d) => {
        if (d.winner === "A") return d.proposalA;
        if (d.winner === "B") return d.proposalB;
        return null;
      })
      .filter((p): p is Proposal => p !== null);

    if (winners.length === 1) {
      room.state = "RESULTS";
      console.log(
        `[GAME] ${room.id} — fin de partie : "${winners[0].text}" est le gagnant`,
      );
      io.to(room.id).emit("room:updated", room);
    } else {
      console.log(
        `[GAME] ${room.id} — round ${room.currentRound + 1} terminé, ${winners.length} gagnants`,
      );
      room.currentRound++;
      room.currentDuelIndex = 0;
      room.bracket.push(generateRound(winners, room.currentRound));
      startDuel(io, room, rooms); // démarre le prochain duel
    }
  } else {
    room.currentDuelIndex!++;
    startDuel(io, room, rooms); // démarre le prochain duel
  }
}
