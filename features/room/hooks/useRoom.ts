"use client";

import socket from "@/lib/socket";
import { Player, Room } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useRoom() {
  const { id } = useParams();
  const roomId = id as string;
  const router = useRouter();

  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  useEffect(() => {
    socket.emit("room:join", roomId);

    const savedName = localStorage.getItem(`player_${roomId}`);
    const savedToken = localStorage.getItem(`player_token_${roomId}`);
    if (savedName) {
      socket.emit("player:join", roomId, savedName, savedToken);
    }

    socket.on("room:updated", (updatedRoom: Room) => {
      if (updatedRoom.id === roomId) {
        setRoom(updatedRoom);
        const playerInRoom =
          updatedRoom.players.find((p) => p.id === socket.id) ?? null;
        setCurrentPlayer(playerInRoom);
        if (playerInRoom) {
          setHasJoined(true);
          setPlayerName(playerInRoom.name);
        }
      }
    });

    socket.on("room:error", (message: string) => {
      alert(message);
    });

    socket.on("player:token", (token: string) => {
      try {
        localStorage.setItem(`player_token_${roomId}`, token);
      } catch {}
    });

    socket.on("player:kicked", () => {
      alert("Vous avez été expulsé de la room");
      router.push("/");
    });

    return () => {
      socket.off("room:updated");
      socket.off("room:error");
      socket.off("player:kicked");
      socket.off("player:token");
    };
  }, [roomId, router]);

  const joinRoom = (name: string) => {
    localStorage.setItem(`player_${roomId}`, name);
    socket.emit("player:join", roomId, name);
  };

  const leaveRoom = () => {
    socket.emit("room:leave", roomId);
    router.push("/");
  };

  return {
    room,
    currentPlayer,
    hasJoined,
    playerName,
    setPlayerName,
    joinRoom,
    leaveRoom,
    roomId,
  };
}
