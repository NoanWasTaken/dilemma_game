"use client";

import { Duel, Player, Room } from "@/types";

type Props = {
  duel: Duel;
  room: Room;
  currentPlayer: Player | null;
  hasVoted: boolean;
  myVote: "A" | "B" | null;
  timeLeft: number | null;
  roundLabel: string;
  onVote: (vote: "A" | "B") => void;
};

export default function DuelCard({
  duel,
  room,
  currentPlayer,
  hasVoted,
  myVote,
  timeLeft,
  roundLabel,
  onVote,
}: Props) {
  return (
    <div>
      <h1>Phase de duels</h1>
      <p>{roundLabel}</p>
      <p>
        Duel{" "}
        {room.bracket[room.currentRound].findIndex((d) => d.id === duel.id) +
          1}{" "}
        / {room.bracket[room.currentRound].length}
      </p>

      {timeLeft !== null && <p>Temps restant : {timeLeft}s</p>}

      <div>
        <button
          onClick={() => onVote("A")}
          disabled={hasVoted || duel.winner !== null}
        >
          {duel.proposalA.text}
          {!room.settings.anonymousProposals && (
            <span>
              {" — "}
              {room.players.find((p) => p.id === duel.proposalA.authorId)
                ?.name ?? "Inconnu"}
            </span>
          )}
          {myVote === "A" && " ✓"}
        </button>

        <p>VS</p>

        <button
          onClick={() => onVote("B")}
          disabled={hasVoted || duel.winner !== null}
        >
          {duel.proposalB.text}
          {!room.settings.anonymousProposals && (
            <span>
              {" — "}
              {room.players.find((p) => p.id === duel.proposalB.authorId)
                ?.name ?? "Inconnu"}
            </span>
          )}
          {myVote === "B" && " ✓"}
        </button>
      </div>

      {duel.winner !== null && (
        <p>
          Gagnant :{" "}
          {duel.winner === "A" ? duel.proposalA.text : duel.proposalB.text}
        </p>
      )}

      <p>
        Votes : {Object.keys(duel.votes).length} / {room.players.length}
      </p>

      {room.settings.hostCanSkip && currentPlayer?.isHost && (
        <button onClick={() => {}}>Passer</button>
      )}
    </div>
  );
}
