import { Portal } from "@portalsdk/core";
import type { ChannelHandle, ChannelStatus, DetailedPresence } from "@portalsdk/core";
import type { BombAttempt, BombState, ModuleId, Role } from "./types";

export interface PlayerPresence {
  id: string;
  role: Role | null;
  host: boolean;
}

export interface BombClient {
  getChannelStatus(): ChannelStatus;
  getRole(): Role | null;
  subscribeChannelStatus(cb: (s: ChannelStatus) => void): () => void;
  subscribeBomb(cb: (state: BombState | null) => void): () => void;
  subscribePresence(cb: (players: PlayerPresence[]) => void): () => void;
  subscribeRole(cb: (role: Role | null) => void): () => void;
  sendAttempt(module: ModuleId, attempt: unknown): Promise<void>;
}

const apiKey = import.meta.env.PUBLIC_PORTAL_KEY as string;

const portal = new Portal({ apiKey });
const bomb: ChannelHandle<BombState> = portal.channel<BombState>("bomb", { history: 10 });
const attempts: ChannelHandle<BombAttempt> = portal.channel<BombAttempt>("bomb-attempts", {
  history: 10,
});

let selfId = "";
let selfHost = false;
let role: Role | null = null;
let lastState: BombState | null = null;

const bombListeners = new Set<(state: BombState | null) => void>();
const statusListeners = new Set<(s: ChannelStatus) => void>();
const presenceListeners = new Set<(players: PlayerPresence[]) => void>();
const roleListeners = new Set<(role: Role | null) => void>();

function players(): PlayerPresence[] {
  const presence = bomb.getSnapshot().presence as DetailedPresence | undefined;
  if (!presence || presence.kind !== "detailed") return [];
  return presence.participants.map((p) => ({
    id: p.id,
    role: (p.metadata?.role as Role | undefined) ?? null,
    host: (p.metadata?.host as boolean | undefined) ?? false,
  }));
}

function assignRole(): void {
  if (selfId === "") return;
  const list = players();
  if (list.length === 0) return;
  const ids = list.map((p) => p.id).sort();
  const idx = ids.indexOf(selfId);
  if (idx < 0 || idx >= 4) return;
  const next = (idx + 1) as Role;
  const host = idx === 0;
  if (next !== role || host !== selfHost) {
    role = next;
    selfHost = host;
    bomb.setMetadata({ role, host });
    for (const cb of roleListeners) cb(role);
  }
}

function emit(): void {
  const snap = bomb.getSnapshot();
  const content = snap.messages.at(-1)?.content ?? null;
  lastState = content;
  for (const cb of bombListeners) cb(content);
  for (const cb of statusListeners) cb(snap.status);
  for (const cb of presenceListeners) cb(players());
}

bomb.on("status", (s) => {
  if (s !== "ready") return;
  selfId = bomb.getSnapshot().me?.id ?? "";
  assignRole();
  emit();
});

bomb.on("presence", () => {
  assignRole();
  emit();
});

bomb.subscribe(emit);

bomb.acquire();
attempts.acquire();

export function connectBomb(): BombClient {
  return {
    getChannelStatus: () => bomb.getSnapshot().status,
    getRole: () => role,
    subscribeChannelStatus: (cb) => {
      statusListeners.add(cb);
      cb(bomb.getSnapshot().status);
      return () => statusListeners.delete(cb);
    },
    subscribeBomb: (cb) => {
      bombListeners.add(cb);
      cb(lastState);
      return () => bombListeners.delete(cb);
    },
    subscribePresence: (cb) => {
      presenceListeners.add(cb);
      cb(players());
      return () => presenceListeners.delete(cb);
    },
    subscribeRole: (cb) => {
      roleListeners.add(cb);
      cb(role);
      return () => roleListeners.delete(cb);
    },
    sendAttempt: async (module, attempt) => {
      await attempts.send({ content: { module, attempt } });
    },
  };
}
