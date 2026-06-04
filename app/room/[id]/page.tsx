"use client";

import { useRoom } from "@/features/room/hooks/useRoom";
import LobbyPhase from "./_components/LobbyPhase";
import SubmissionPhase from "./_components/SubmissionPhase";
import DuelsPhase from "./_components/DuelsPhase";
import ResultsPhase from "./_components/ResultsPhase";

function PhaseWrapper({
  roomId,
  onLeave,
  children,
}: {
  roomId: string;
  onLeave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <span>Room {roomId}</span>
        <button onClick={onLeave} style={{ marginLeft: "auto" }}>
          Quitter
        </button>
      </div>
      {children}
    </div>
  );
}

export default function RoomPage() {
  const {
    room,
    currentPlayer,
    hasJoined,
    playerName,
    setPlayerName,
    joinRoom,
    leaveRoom,
    roomId,
  } = useRoom();

  if (!hasJoined) {
    return (
      <div>
        <h1>Rejoindre la room {roomId}</h1>
        <input
          type="text"
          placeholder="Entrez votre pseudo"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button onClick={() => joinRoom(playerName)} disabled={!playerName}>
          Rejoindre
        </button>
      </div>
    );
  }

  if (!room) return null;

  switch (room.state) {
    case "SUBMISSION":
      return (
        <PhaseWrapper roomId={roomId} onLeave={leaveRoom}>
          <SubmissionPhase room={room} currentPlayer={currentPlayer} />
        </PhaseWrapper>
      );
    case "DUELS":
      return (
        <PhaseWrapper roomId={roomId} onLeave={leaveRoom}>
          <DuelsPhase room={room} currentPlayer={currentPlayer} />
        </PhaseWrapper>
      );
    case "RESULTS":
      return (
        <PhaseWrapper roomId={roomId} onLeave={leaveRoom}>
          <ResultsPhase
            room={room}
            roomId={roomId}
            currentPlayer={currentPlayer}
          />
        </PhaseWrapper>
      );
    default:
      return (
        <LobbyPhase
          room={room}
          currentPlayer={currentPlayer}
          roomId={roomId}
          playerName={playerName}
          onLeave={leaveRoom}
        />
      );
  }
}
