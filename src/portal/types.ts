export type Role = "judge" | "cutter";

export interface PlayerMeta {
  name: string;
  host: boolean;
  role: Role | null;
}

export interface RoomInfo {
  id: string;
  name: string;
  mode: "public" | "private";
  players: number;
  hostId: string;
  hostName: string;
  updatedAt: number;
}

export type RoomEvent =
  | { type: "judge"; judgeId: string }
  | { type: "start" };

export interface ChatMessage {
  type: "chat";
  text: string;
  name: string;
}

export interface ChatEntry {
  id: string;
  name: string;
  text: string;
}

export interface Cable {
  label: string;
  color: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface LevelRules {
  summary: string;
  steps: string[];
}

export interface RoomState {
  status: "lobby" | "playing" | "finished";
  level: number;
  cables: Cable[];
  rules: LevelRules;
  cutCount: number;
  timerMs: number;
  updatedAt: number;
}

export type RoomAction =
  | { type: "cut"; label: string };

export interface CursorMessage {
  type: "cursor";
  x: number;
  y: number;
  name: string;
}

export type RoomContent =
  | RoomEvent
  | ChatMessage
  | CursorMessage;
