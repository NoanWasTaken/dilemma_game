"use client";

import socket from "@/lib/socket";
import { Player, Room } from "@/types";
import { useState } from "react";

export function useSubmission(room: Room, currentPlayer: Player | null) {
  const [proposal, setProposal] = useState("");

  const canSubmitMore = currentPlayer
    ? currentPlayer.mustSubmitTwoProposals
      ? currentPlayer.submittedCount < 2
      : currentPlayer.submittedCount < 1
    : false;

  const handleSubmit = () => {
    if (!proposal.trim()) return;
    socket.emit("proposal:submit", room.id, proposal.trim());
    setProposal("");
  };

  const myProposals = room.proposals.filter(
    (p) => p.authorId === currentPlayer?.id,
  );

  const visibleProposals = room.settings.anonymousProposals
    ? myProposals
    : room.proposals;

  return {
    proposal,
    setProposal,
    canSubmitMore,
    handleSubmit,
    myProposals,
    visibleProposals,
  };
}
