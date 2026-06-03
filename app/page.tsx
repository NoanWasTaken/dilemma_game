"use client";
import { useEffect, useState } from "react";
import socket from "../lib/socket";
import { useRouter } from "next/navigation";
import { Room } from "@/types";

export default function Home() {
  const [actionType, setActionType] = useState<"CREATE_ROOM" | "JOIN_ROOM">(
    "JOIN_ROOM",
  );
  const [isJoining, setIsJoining] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();

  useEffect(() => {
    socket.on("room:created", (room: Room) => {
      router.push(`/room/${room.id}`);
    });

    socket.on("room:updated", (room: Room) => {
      if (isJoining) {
        router.push(`/room/${room.id}`);
      }
    });

    socket.on("room:error", (message: string) => {
      setIsJoining(false); // on reset si erreur
      console.error(message);
    });

    return () => {
      socket.off("room:created");
      socket.off("room:updated");
      socket.off("room:error");
    };
  }, [router, isJoining]); // isJoining dans les dépendances

  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-4">
        <h1>Bienvenue sur Dilemma Game</h1>
        <form action="">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder={`${actionType === "CREATE_ROOM" ? "Nom de la salle" : "Code de la salle"}...`}
          />
        </form>
        <div>
          <button onClick={() => setActionType("CREATE_ROOM")}>
            Créer une salle
          </button>
          <button onClick={() => setActionType("JOIN_ROOM")}>
            Rejoindre une salle
          </button>
        </div>
        <button
          onClick={
            actionType === "CREATE_ROOM"
              ? () => socket.emit("room:create")
              : () => {
                  setIsJoining(true);
                  socket.emit("room:join", roomCode);
                }
          }
        >
          {actionType === "CREATE_ROOM" ? "Commencer" : "Rejoindre"}
        </button>
      </main>
    </div>
  );
}
