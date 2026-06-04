"use client";

import { Player, Room } from "@/types";
import { useDuel } from "@/features/duel/hooks/useDuel";
import DuelCard from "@/features/duel/ui/DuelCard";

type Props = {
  room: Room;
  currentPlayer: Player | null;
};

export default function DuelsPhase({ room, currentPlayer }: Props) {
  const { duel, timeLeft, hasVoted, myVote, roundLabel, handleVote } =
    useDuel(room, currentPlayer);

  if (!duel) return <p>Chargement du duel...</p>;

  return (
    <DuelCard
      duel={duel}
      room={room}
      currentPlayer={currentPlayer}
      hasVoted={hasVoted}
      myVote={myVote}
      timeLeft={timeLeft}
      roundLabel={roundLabel}
      onVote={handleVote}
    />
  );
}
