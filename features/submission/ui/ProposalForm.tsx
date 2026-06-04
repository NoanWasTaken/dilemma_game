"use client";

type Props = {
  proposal: string;
  setProposal: (value: string) => void;
  handleSubmit: () => void;
};

export default function ProposalForm({
  proposal,
  setProposal,
  handleSubmit,
}: Props) {
  return (
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
  );
}
