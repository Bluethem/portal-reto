export type ModuleId = 1 | 2 | 3 | 4;
export type Role = ModuleId;

export type BombStatus = "idle" | "armed" | "defused" | "exploded";

export interface ModuleState {
  id: ModuleId;
  unlocked: boolean;
  defused: boolean;
  strikes: number;
}

export interface BombState {
  status: BombStatus;
  modules: ModuleState[];
  timerMs: number;
  progress: number;
  updatedAt: number;
}

export interface BombAttempt {
  module: ModuleId;
  attempt: unknown;
}
