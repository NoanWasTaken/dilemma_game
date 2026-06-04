"use client";

import socket from "@/lib/socket";
import { Player, Room } from "@/types";
import { useCallback } from "react";

type Props = {
  room: Room;
  currentPlayer: Player | null;
  roomId: string;
};

export default function PlayerList({ room, currentPlayer, roomId }: Props) {
  const handleReady = useCallback(() => {
    socket.emit("player:ready", roomId);
  }, [roomId]);

  const handleKick = useCallback(
    (playerId: string) => {
      socket.emit("player:kick", roomId, playerId);
    },
    [roomId],
  );

  const handleStart = useCallback(() => {
    socket.emit("room:start", roomId);
  }, [roomId]);

  return (
    <section style={{ marginBottom: "20px" }}>
      <h2>
        Joueurs ({room.players.length} / {room.settings.maxPlayers ?? "—"})
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {room.players.map((player) => (
          <div
            key={player.id}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span>
              {player.name}
              {player.isConnected === false && " (déconnecté)"}
              {player.isHost && " (Host)"}
              {player.id === socket.id && " (Vous)"}
              {" — "}
              {player.isReady ? "Prêt ✓" : "Pas prêt"}
            </span>
            {currentPlayer?.isHost && player.id !== socket.id && (
              <button onClick={() => handleKick(player.id)}>Kick</button>
            )}
          </div>
        ))}
      </div>

      <section style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <button onClick={handleReady}>
          {currentPlayer?.isReady ? "Annuler" : "Prêt"}
        </button>
        {currentPlayer?.isHost && (
          <button onClick={handleStart}>Lancer la partie</button>
        )}
      </section>
    </section>
  );
}
