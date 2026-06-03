// /app/room/[id]/components/DuelsPhase.tsx
"use client";

import socket from "@/lib/socket";
import { Player, Room } from "@/types";
import { useEffect, useState } from "react";

type Props = {
  room: Room;
  currentPlayer: Player | null;
  roomId: string;
};

export default function DuelsPhase({ room, currentPlayer, roomId }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const duel = room.bracket[room.currentRound]?.[room.currentDuelIndex!];

  // Timer countdown
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

  if (!duel) return <p>Chargement du duel...</p>;

  const hasVoted = currentPlayer
    ? duel.votes.hasOwnProperty(currentPlayer.id)
    : false;
  const myVote = currentPlayer ? duel.votes[currentPlayer.id] : null;

  const totalRounds = Math.log2(room.targetedProposalCount);
  const roundLabel =
    room.currentRound === totalRounds - 1
      ? "Finale"
      : `Round ${room.currentRound + 1} / ${totalRounds}`;

  return (
    <div>
      <h1>Phase de duels</h1>
      <p>{roundLabel}</p>
      <p>
        Duel {room.currentDuelIndex! + 1} /{" "}
        {room.bracket[room.currentRound].length}
      </p>

      {timeLeft !== null && <p>Temps restant : {timeLeft}s</p>}

      <div>
        {/* Proposition A */}
        <button
          onClick={() => socket.emit("duel:vote", roomId, duel.id, "A")}
          disabled={hasVoted || duel.winner !== null}
        >
          {duel.proposalA.text}
          {!room.settings.anonymousProposals && (
            <span>
              {" "}
              —{" "}
              {room.players.find((p) => p.id === duel.proposalA.authorId)
                ?.name ?? "Inconnu"}
            </span>
          )}
          {myVote === "A" && " ✓"}
        </button>

        <p>VS</p>

        {/* Proposition B */}
        <button
          onClick={() => socket.emit("duel:vote", roomId, duel.id, "B")}
          disabled={hasVoted || duel.winner !== null}
        >
          {duel.proposalB.text}
          {!room.settings.anonymousProposals && (
            <span>
              {" "}
              —{" "}
              {room.players.find((p) => p.id === duel.proposalB.authorId)
                ?.name ?? "Inconnu"}
            </span>
          )}
          {myVote === "B" && " ✓"}
        </button>
      </div>

      {/* Résultat du duel en cours */}
      {duel.winner !== null && (
        <p>
          Gagnant :{" "}
          {duel.winner === "A" ? duel.proposalA.text : duel.proposalB.text}
        </p>
      )}

      {/* Votes en temps réel */}
      <p>
        Votes : {Object.keys(duel.votes).length} / {room.players.length}
      </p>

      {/* Bouton host peut passer */}
      {room.settings.hostCanSkip && currentPlayer?.isHost && (
        <button onClick={() => socket.emit("duel:next", roomId)}>Passer</button>
      )}
    </div>
  );
}
