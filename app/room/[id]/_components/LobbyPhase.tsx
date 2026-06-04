"use client";

import { Player, Room } from "@/types";
import LobbySettings from "@/features/room/ui/LobbySettings";
import PlayerList from "@/features/room/ui/PlayerList";

type Props = {
  room: Room;
  currentPlayer: Player | null;
  roomId: string;
  playerName: string;
  onLeave: () => void;
};

export default function LobbyPhase({
  room,
  currentPlayer,
  roomId,
  playerName,
  onLeave,
}: Props) {
  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}
      >
        <h1 style={{ margin: 0 }}>Room {roomId}</h1>
        <button onClick={onLeave} style={{ marginLeft: "auto" }}>
          Quitter
        </button>
      </div>
      <p>Bienvenue, {playerName} !</p>

      <section style={{ marginBottom: "20px" }}>
        <h2>Paramètres</h2>
        <LobbySettings
          room={room}
          currentPlayer={currentPlayer}
          roomId={roomId}
        />
      </section>

      <PlayerList room={room} currentPlayer={currentPlayer} roomId={roomId} />
    </div>
  );
}
