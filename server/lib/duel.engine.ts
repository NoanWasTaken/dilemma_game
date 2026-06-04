import type { Server } from "socket.io";
import type { Room, Proposal } from "@/types";

export function generateRound(proposals: Proposal[], roundIndex: number) {
  const duels = [];
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

export function startDuel(io: Server, room: Room, rooms: Map<string, Room>) {
  const duel = room.bracket[room.currentRound][room.currentDuelIndex!];
  if (!duel) return;

  if (room.settings.timer) {
    duel.endsAt = Date.now() + room.settings.timer * 1000;

    setTimeout(() => {
      const currentRoom = rooms.get(room.id);
      if (!currentRoom) return;

      const currentDuel =
        currentRoom.bracket[currentRoom.currentRound][
          currentRoom.currentDuelIndex!
        ];
      if (!currentDuel || currentDuel.id !== duel.id) return;
      if (currentDuel.winner !== null) return;

      resolveDuel(io, currentRoom, currentDuel, rooms);
    }, room.settings.timer * 1000);
  }

  io.to(room.id).emit("room:updated", room);
}

export function resolveDuel(
  io: Server,
  room: Room,
  duel: {
    votes: Record<string, "A" | "B">;
    winner: "A" | "B" | null;
    proposalA: Proposal;
    proposalB: Proposal;
  },
  rooms: Map<string, Room>,
) {
  const votesA = Object.values(duel.votes).filter((v) => v === "A").length;
  const votesB = Object.values(duel.votes).filter((v) => v === "B").length;

  if (votesA > votesB) {
    duel.winner = "A";
  } else if (votesB > votesA) {
    duel.winner = "B";
  } else {
    duel.winner = Math.random() < 0.5 ? "A" : "B";
  }

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
      io.to(room.id).emit("room:updated", room);
    } else {
      room.currentRound++;
      room.currentDuelIndex = 0;
      room.bracket.push(generateRound(winners, room.currentRound));
      startDuel(io, room, rooms);
    }
  } else {
    room.currentDuelIndex!++;
    startDuel(io, room, rooms);
  }
}
