"use client";

import socket from "@/lib/socket";
import { Player, Room } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BracketView from "@/features/duel/ui/BracketView";

type Props = {
  room: Room;
  roomId: string;
  currentPlayer: Player | null;
};

export default function ResultsPhase({ room, roomId, currentPlayer }: Props) {
  const router = useRouter();
  const lastRound = room.bracket[room.bracket.length - 1];
  const lastDuel = lastRound?.[lastRound.length - 1];
  const winner =
    lastDuel?.winner === "A"
      ? lastDuel.proposalA
      : lastDuel?.winner === "B"
        ? lastDuel.proposalB
        : null;

  const winnerAuthor = room.players.find((p) => p.id === winner?.authorId);
  const [nextRoomId, setNextRoomId] = useState<string | null>(null);

  useEffect(() => {
    socket.on(
      "room:next",
      ({ newRoomId }: { newRoomId: string }) => {
        setNextRoomId(newRoomId);
        if (currentPlayer?.isHost) {
          socket.emit("room:transfer", roomId, newRoomId, currentPlayer.name);
          router.push(`/room/${newRoomId}`);
        }
      },
    );

    return () => {
      socket.off("room:next");
    };
  }, [currentPlayer, router, roomId]);

  return (
    <div>
      <h1>Résultats</h1>

      {winner ? (
        <div>
          <p>Le dilemme gagnant est :</p>
          <p>{winner.text}</p>
          {!room.settings.anonymousProposals && winnerAuthor && (
            <p>Proposé par : {winnerAuthor.name}</p>
          )}
        </div>
      ) : (
        <p>Aucun gagnant trouvé.</p>
      )}

      <BracketView room={room} />

      {currentPlayer?.isHost ? (
        <button onClick={() => socket.emit("room:next", roomId)}>
          Nouvelle partie
        </button>
      ) : nextRoomId ? (
        <button
          onClick={() => {
            socket.emit(
              "room:transfer",
              roomId,
              nextRoomId,
              currentPlayer?.name,
            );
            router.push(`/room/${nextRoomId}`);
          }}
        >
          Rejoindre la prochaine partie
        </button>
      ) : (
        <p>En attente de l&apos;hôte...</p>
      )}
    </div>
  );
}
