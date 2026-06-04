import type { Server, Socket } from "socket.io";
import type { Room, Proposal } from "@/types";
import { generateRound, startDuel } from "../lib/duel.engine";

export function registerGameSubmissionHandlers(
  io: Server,
  socket: Socket,
  rooms: Map<string, Room>,
) {
  socket.on("proposal:submit", (roomId: string, text: string) => {
    if (typeof text !== "string") return;
    const cleanText = text.substring(0, 150).trim();
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

    if (room.proposals.length == room.targetedProposalCount) {
      room.state = "DUELS";
      room.currentRound = 0;
      room.currentDuelIndex = 0;
      room.bracket.push(generateRound(room.proposals, 0));
      startDuel(io, room, rooms);
    }

    io.to(roomId).emit("room:updated", room);
  });
}
