"use client";

import socket from "@/lib/socket";
import { Player, Room } from "@/types";

type Props = {
  room: Room;
  currentPlayer: Player | null;
  roomId: string;
};

export default function LobbySettings({ room, currentPlayer, roomId }: Props) {
  if (!currentPlayer?.isHost) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <p>Catégorie : {room.settings.category || "—"}</p>
        <p>Nombre maximum de joueurs : {room.settings.maxPlayers ?? "—"}</p>
        <p>
          Timer :{" "}
          {!room.settings.timer ? "Désactivé" : `${room.settings.timer}s`}
        </p>
        <p>
          Propositions anonymes :{" "}
          {room.settings.anonymousProposals ? "Oui" : "Non"}
        </p>
        <p>
          Le host peut passer les tours :{" "}
          {room.settings.hostCanSkip ? "Oui" : "Non"}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label>
        Catégorie :
        <input
          type="text"
          placeholder="Catégorie"
          value={room.settings.category}
          onChange={(e) =>
            socket.emit("room:settings", roomId, { category: e.target.value })
          }
        />
      </label>
      <label>
        Nombre maximum de joueurs :
        <input
          type="number"
          min={2}
          max={16}
          value={room.settings.maxPlayers ?? ""}
          onChange={(e) =>
            socket.emit("room:settings", roomId, {
              maxPlayers: parseInt(e.target.value) || 2,
            })
          }
        />
      </label>
      <label>
        Timer :
        <input
          type="checkbox"
          checked={room.settings.timer !== null}
          onChange={(e) =>
            socket.emit("room:settings", roomId, {
              timer: e.target.checked ? 30 : null,
            })
          }
        />
        {room.settings.timer !== null && (
          <input
            type="number"
            min={15}
            value={room.settings.timer ?? ""}
            onChange={(e) =>
              socket.emit("room:settings", roomId, {
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
          checked={room.settings.anonymousProposals}
          onChange={(e) =>
            socket.emit("room:settings", roomId, {
              anonymousProposals: e.target.checked,
            })
          }
        />
      </label>
      <label>
        Le host peut passer les tours :
        <input
          type="checkbox"
          checked={room.settings.hostCanSkip}
          onChange={(e) =>
            socket.emit("room:settings", roomId, {
              hostCanSkip: e.target.checked,
            })
          }
        />
      </label>
    </div>
  );
}
