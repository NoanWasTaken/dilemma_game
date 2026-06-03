// /app/room/[id]/components/SubmissionPhase.tsx
"use client";

import socket from "@/lib/socket";
import { Player, Room } from "@/types";
import { useState } from "react";

type Props = {
  room: Room;
  currentPlayer: Player | null;
  roomId: string;
};

export default function SubmissionPhase({
  room,
  currentPlayer,
  roomId,
}: Props) {
  const [proposal, setProposal] = useState("");

  const canSubmitMore = currentPlayer
    ? currentPlayer.mustSubmitTwoProposals
      ? currentPlayer.submittedCount < 2
      : currentPlayer.submittedCount < 1
    : false;

  const handleSubmit = () => {
    if (!proposal.trim()) return;
    socket.emit("proposal:submit", roomId, proposal.trim());
    setProposal("");
  };

  const myProposals = room.proposals.filter(
    (p) => p.authorId === currentPlayer?.id,
  );

  const visibleProposals = room.settings.anonymousProposals
    ? myProposals
    : room.proposals;

  return (
    <div>
      <h1>Phase de soumission</h1>
      <p>Catégorie : {room.settings.category}</p>
      <p>
        Propositions soumises : {room.proposals.length} /{" "}
        {room.targetedProposalCount}
      </p>

      {currentPlayer?.mustSubmitTwoProposals && (
        <p>Vous avez été désigné pour soumettre 2 propositions.</p>
      )}

      {canSubmitMore ? (
        <div>
          <input
            type="text"
            placeholder="Votre proposition..."
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
          />
          <button onClick={handleSubmit} disabled={!proposal.trim()}>
            Soumettre
          </button>
        </div>
      ) : (
        <p>
          Vous avez soumis toutes vos propositions. En attente des autres
          joueurs...
        </p>
      )}

      <div>
        <p>
          {room.settings.anonymousProposals
            ? "Vos propositions :"
            : "Propositions soumises :"}
        </p>
        {visibleProposals.map((p) => (
          <p key={p.id}>
            {p.text}
            {!room.settings.anonymousProposals && (
              <span>
                {" "}
                —{" "}
                {room.players.find((pl) => pl.id === p.authorId)?.name ??
                  "Inconnu"}
              </span>
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
