"use client";

import socket from "@/lib/socket";
import { Player, Room } from "@/types";
import { useEffect, useState } from "react";

export function useDuel(room: Room, currentPlayer: Player | null) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const duel = room.bracket[room.currentRound]?.[room.currentDuelIndex!];

  useEffect(() => {
    if (!duel?.endsAt) {
      return;
    }

    const update = () => {
      const remaining = Math.max(
        0,
        Math.ceil((duel.endsAt! - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => {
      clearInterval(interval);
      setTimeLeft(null);
    };
  }, [duel?.endsAt]);

  const hasVoted = currentPlayer
    ? Object.hasOwn(duel?.votes ?? {}, currentPlayer.id)
    : false;
  const myVote = currentPlayer ? duel?.votes[currentPlayer.id] : null;

  const totalRounds = Math.log2(room.targetedProposalCount);
  const roundLabel =
    room.currentRound === totalRounds - 1
      ? "Finale"
      : `Round ${room.currentRound + 1} / ${totalRounds}`;

  const handleVote = (vote: "A" | "B") => {
    if (!duel) return;
    socket.emit("duel:vote", room.id, duel.id, vote);
  };

  return {
    duel,
    timeLeft,
    hasVoted,
    myVote,
    totalRounds,
    roundLabel,
    handleVote,
  };
}
