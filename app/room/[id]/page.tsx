// /app/room/[id]/page.tsx
"use client";

import socket from "@/lib/socket";
import { Player, Room } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SubmissionPhase from "./_components/SubmissionPhase";
import DuelsPhase from "./_components/DuelsPhase";
import ResultsPhase from "./_components/ResultsPhase";

export default function RoomPage() {
  const { id } = useParams();
  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);

  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const router = useRouter();

  useEffect(() => {
    socket.emit("room:join", id);

    socket.on("room:updated", (updatedRoom: Room) => {
      if (updatedRoom.id === id) {
        setRoom(updatedRoom);
        const playerInRoom =
          updatedRoom.players.find((p) => p.id === socket.id) ?? null;
        setCurrentPlayer(playerInRoom);
        if (playerInRoom) {
          setHasJoined(true);
        }
      }
    });

    socket.on("room:error", (message: string) => {
      console.error(message);
      alert(message);
    });

    socket.on("player:kicked", () => {
      alert("Vous avez été expulsé de la room");
      router.push("/");
    });

    return () => {
      socket.off("room:updated");
      socket.off("room:error");
      socket.off("player:kicked");
    };
  }, [id, router]);

  if (!hasJoined) {
    return (
      // formulaire pseudo + affichage du code room
      <div>
        <h1>Rejoindre la room {id}</h1>
        <input
          type="text"
          placeholder="Entrez votre pseudo"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button
          onClick={() => {
            socket.emit("player:join", id, playerName);
          }}
          disabled={!playerName}
        >
          Rejoindre
        </button>
      </div>
    );
  }

  function handleLeave() {
    socket.emit("room:leave", id);
    router.push("/");
  }

  const leaveButton = (
    <button onClick={handleLeave} style={{ marginLeft: "auto" }}>
      Quitter
    </button>
  );

  if (room?.state === "SUBMISSION") {
    return (
      <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
          <span>Room {id}</span>
          {leaveButton}
        </div>
        <SubmissionPhase
          room={room}
          currentPlayer={currentPlayer}
          roomId={id as string}
        />
      </div>
    );
  }

  if (room?.state === "DUELS") {
    return (
      <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
          <span>Room {id}</span>
          {leaveButton}
        </div>
        <DuelsPhase
          room={room}
          currentPlayer={currentPlayer}
          roomId={id as string}
        />
      </div>
    );
  }

  if (room?.state === "RESULTS") {
    return (
      <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
          <span>Room {id}</span>
          {leaveButton}
        </div>
        <ResultsPhase
          room={room}
          roomId={id as string}
          currentPlayer={currentPlayer}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
        <h1 style={{ margin: 0 }}>Room {id}</h1>
        {leaveButton}
      </div>
      <p>Bienvenue, {playerName} !</p>

      <section style={{ marginBottom: "20px" }}>
        <h2>Paramètres</h2>
        {currentPlayer?.isHost ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label>
              Catégorie :
              <input
                type="text"
                placeholder="Catégorie"
                value={room?.settings.category}
                onChange={(e) =>
                  socket.emit("room:settings", id, { category: e.target.value })
                }
              />
            </label>
            <label>
              Nombre maximum de joueurs :
              <input
                type="number"
                min={2}
                max={16}
                value={room?.settings.maxPlayers ?? ""}
                onChange={(e) =>
                  socket.emit("room:settings", id, {
                    maxPlayers: parseInt(e.target.value) || 2,
                  })
                }
              />
            </label>
            <label>
              Timer :
              <input
                type="checkbox"
                checked={room?.settings.timer !== null}
                onChange={(e) =>
                  socket.emit("room:settings", id, {
                    timer: e.target.checked ? 30 : null,
                  })
                }
              />
              {room?.settings.timer !== null && (
                <input
                  type="number"
                  min={15}
                  value={room?.settings.timer ?? ""}
                  onChange={(e) =>
                    socket.emit("room:settings", id, {
                      timer: parseInt(e.target.value) || 15,
                    })
                  }
                />
              )}
            </label>
            <label>
              Propositions anonymes :
              <input
                type="checkbox"
                checked={room?.settings.anonymousProposals}
                onChange={(e) =>
                  socket.emit("room:settings", id, {
                    anonymousProposals: e.target.checked,
                  })
                }
              />
            </label>
            <label>
              Le host peut passer les tours :
              <input
                type="checkbox"
                checked={room?.settings.hostCanSkip}
                onChange={(e) =>
                  socket.emit("room:settings", id, {
                    hostCanSkip: e.target.checked,
                  })
                }
              />
            </label>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <p>Catégorie : {room?.settings.category || "—"}</p>
            <p>
              Nombre maximum de joueurs : {room?.settings.maxPlayers ?? "—"}
            </p>
            <p>
              Timer :{" "}
              {!room?.settings.timer ? "Désactivé" : `${room.settings.timer}s`}
            </p>
            <p>
              Propositions anonymes :{" "}
              {room?.settings.anonymousProposals ? "Oui" : "Non"}
            </p>
            <p>
              Le host peut passer les tours :{" "}
              {room?.settings.hostCanSkip ? "Oui" : "Non"}
            </p>
          </div>
        )}
      </section>

      <section style={{ marginBottom: "20px" }}>
        <h2>
          Joueurs ({room?.players.length ?? 0} /{" "}
          {room?.settings.maxPlayers ?? "—"})
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {room?.players.map((player) => (
            <div
              key={player.id}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span>
                {player.name}
                {player.isHost && " (Host)"}
                {player.id === socket.id && " (Vous)"}
                {" — "}
                {player.isReady ? "Prêt ✓" : "Pas prêt"}
              </span>
              {currentPlayer?.isHost && player.id !== socket.id && (
                <button
                  onClick={() => socket.emit("player:kick", id, player.id)}
                >
                  Kick
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => socket.emit("player:ready", id)}>
          {currentPlayer?.isReady ? "Annuler" : "Prêt"}
        </button>
        {currentPlayer?.isHost && (
          <button onClick={() => socket.emit("room:start", id)}>
            Lancer la partie
          </button>
        )}
      </section>
    </div>
  );
}
