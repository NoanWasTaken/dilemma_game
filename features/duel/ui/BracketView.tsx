"use client";

import { Room } from "@/types";

type Props = {
  room: Room;
};

export default function BracketView({ room }: Props) {
  return (
    <div>
      <p>Récap du bracket :</p>
      {room.bracket.map((round, roundIndex) => (
        <div key={roundIndex}>
          <p>
            {roundIndex === room.bracket.length - 1
              ? "Finale"
              : `Round ${roundIndex + 1}`}
          </p>
          {round.map((duel) => (
            <p key={duel.id}>
              {duel.proposalA.text} vs {duel.proposalB.text} →{" "}
              {duel.winner === "A"
                ? duel.proposalA.text
                : duel.proposalB.text}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
