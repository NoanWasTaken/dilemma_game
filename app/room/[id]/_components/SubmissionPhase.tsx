"use client";

import { Player, Room } from "@/types";
import { useSubmission } from "@/features/submission/hooks/useSubmission";
import ProposalForm from "@/features/submission/ui/ProposalForm";

type Props = {
  room: Room;
  currentPlayer: Player | null;
};

export default function SubmissionPhase({ room, currentPlayer }: Props) {
  const {
    proposal,
    setProposal,
    canSubmitMore,
    handleSubmit,
    visibleProposals,
  } = useSubmission(room, currentPlayer);

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
        <ProposalForm
          proposal={proposal}
          setProposal={setProposal}
          handleSubmit={handleSubmit}
        />
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
                {" — "}
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
