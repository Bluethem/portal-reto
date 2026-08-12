export type Role = "judge" | "cutter";

export interface PlayerMeta {
  userId: string;
  name: string;
  host: boolean;
  role: Role | null;
  color?: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  host: boolean;
  color?: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  mode: "public" | "private";
  players: number;
  hostId: string;
  hostName: string;
  playing?: boolean;
  updatedAt: number;
}

export type RoomEvent =
  | { type: "judge"; judgeId: string }
  | { type: "start" }
  | { type: "hint"; text: string; remaining: number; target: string }
  | { type: "kick"; targetId: string };

export interface ChatMessage {
  type: "chat";
  text: string;
  name: string;
}

export interface ChatEntry {
  id: string;
  name: string;
  text: string;
  self: boolean;
  status: "pending" | "sent" | "failed";
}

export interface Cable {
  label: string;
  color: number;
  row: number;
  toRow: number;
  cut: boolean;
}

export interface LevelRules {
  summary: string;
  steps: string[];
}

export interface StateEffect {
  kind: "freeze" | "blind" | "lockCut";
  userId?: string;
  expiresAt: number;
}

export interface RoomState {
  status: "lobby" | "playing" | "finished";
  level: number;
  cables: Cable[];
  rules: LevelRules;
  cutCount: number;
  timerMs: number;
  effects: StateEffect[];
  lastCut: { id: string; ok: boolean } | null;
  hintRemaining?: number;
  members?: { id: string; role: Role }[];
  updatedAt: number;
}

export type RoomAction =
  | { type: "cut"; label: string; id?: string }
  | { type: "hint-request" };

export interface CursorMessage {
  type: "cursor";
  x: number;
  y: number;
  name: string;
  userId: string;
}

export type RoomContent =
  | RoomEvent
  | ChatMessage
  | CursorMessage;
