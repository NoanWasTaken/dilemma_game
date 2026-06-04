type Player = {
  id: string; //crypto.randomUUID()
  name: string;
  isHost: boolean;
  isReady: boolean;
  mustSubmitTwoProposals: boolean;
  submittedCount: number;
  isConnected?: boolean;
  token: string; //crypto.randomUUID()
};

type Proposal = {
  id: string;
  text: string;
  authorId: string;
  eliminated: boolean;
};

type RoomSettings = {
  category: string;
  maxPlayers: number;
  timer: number | null;
  anonymousProposals: boolean;
  hostCanSkip: boolean;
};

type Duel = {
  id: string;
  roundIndex: number;
  proposalA: Proposal;
  proposalB: Proposal;
  votes: Record<string, "A" | "B">;
  winner: "A" | "B" | null;
  endsAt: number | null;
};

type RoomState = "LOBBY" | "SUBMISSION" | "DUELS" | "RESULTS";

type Room = {
  id: string;
  state: RoomState;
  settings: RoomSettings;
  players: Player[];
  proposals: Proposal[];
  bracket: Duel[][]; //bracket[roundIndex][duelIndex]
  currentRound: number;
  currentDuelIndex: number | null;
  targetedProposalCount: number; //puissance de 2
};

export type { Player, Proposal, RoomSettings, Duel, RoomState, Room };
