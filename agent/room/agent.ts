import { Portal } from "@portalsdk/core";
import type { ChannelHandle, ChannelStatus, DetailedPresence } from "@portalsdk/core";
import type { RoomAction, RoomState, RoomEvent, RoomInfo, LevelRules, Cable, StateEffect } from "../../src/portal/types.ts";
import { generateLevel } from "./generator.ts";

const PUBLIC_PORTAL_KEY = process.env.PUBLIC_PORTAL_KEY ?? "";

if (!PUBLIC_PORTAL_KEY) {
  console.error("[agent] Falta PUBLIC_PORTAL_KEY en .env");
  process.exit(1);
}

const portal = new Portal({ apiKey: PUBLIC_PORTAL_KEY });
const index: ChannelHandle<RoomInfo> = portal.channel<RoomInfo>("rooms-index", { history: 50 });

const START_TIMER_MS = 180_000;
const LEVEL_BONUS_MS = 60_000;
const CUT_PENALTY_MS = 15_000;
const EFFECTS_MIN_LEVEL = 4;
const EFFECTS_EXTRA_MIN_LEVEL = 5;
const FREEZE_MS = 4_000;
const LOCK_CUT_MS = 1_500;
const BLIND_MS = 3_000;
const EXTRA_GLOBAL_CHANCE = 0.5;
const PERIODIC_EFFECT_INTERVAL_MS = 25_000;

interface Judge {
  roomId: string;
  room: ChannelHandle<RoomState | RoomEvent>;
  actions: ChannelHandle<RoomAction>;
  roomSeed: number;
  level: number;
  cables: Cable[];
  order: string[];
  rules: LevelRules;
  cutCount: number;
  timerMs: number;
  effects: StateEffect[];
  nextEffectAt: number;
  timer: ReturnType<typeof setInterval> | null;
  tick: ReturnType<typeof setInterval> | null;
  started: boolean;
  finished: boolean;
}

const judges = new Map<string, Judge>();

function isHuman(count: number, room: ChannelHandle<RoomState | RoomEvent>): boolean {
  const p = room.getSnapshot().presence as DetailedPresence | undefined;
  if (!p || p.kind !== "detailed") return false;
  return p.participants.filter((x) => x.metadata?.kind !== "agent").length === count;
}

function activeEffects(j: Judge): StateEffect[] {
  const now = Date.now();
  j.effects = j.effects.filter((e) => e.expiresAt > now);
  return j.effects;
}

function addEffect(j: Judge, effect: StateEffect): void {
  j.effects.push(effect);
}

function randomGlobalEffect(now: number): StateEffect {
  const roll = Math.random();
  if (roll < 0.5) return { kind: "blind", expiresAt: now + BLIND_MS };
  return { kind: "lockCut", expiresAt: now + LOCK_CUT_MS };
}

function maybePeriodicEffect(j: Judge): void {
  const now = Date.now();
  if (j.level < EFFECTS_EXTRA_MIN_LEVEL) return;
  if (now < j.nextEffectAt) return;
  j.nextEffectAt = now + PERIODIC_EFFECT_INTERVAL_MS;
  addEffect(j, randomGlobalEffect(now));
  console.log(`[agent] ${j.roomId} efecto periódico (nivel ${j.level})`);
}

function publish(j: Judge): void {
  void j.room.send({
    content: {
      status: "playing",
      level: j.level,
      cables: j.cables,
      rules: j.rules,
      cutCount: j.cutCount,
      timerMs: j.timerMs,
      effects: activeEffects(j),
      updatedAt: Date.now(),
    },
  });
}

function startLevel(j: Judge): void {
  const gen = generateLevel(j.level, j.roomSeed);
  j.cables = gen.cables;
  j.order = gen.order;
  j.rules = gen.rules;
  j.cutCount = 0;
  j.effects = [];
  j.nextEffectAt = Date.now() + PERIODIC_EFFECT_INTERVAL_MS;
  console.log(`[agent] ${j.roomId} nivel ${j.level} seed=${gen.seed} soluciones=${gen.solutions} reglas=${gen.rules.steps.length}`);
  publish(j);
}

function startTimer(j: Judge): void {
  j.timerMs = START_TIMER_MS;
  j.tick = setInterval(() => {
    j.timerMs = Math.max(0, j.timerMs - 1000);
    if (j.timerMs === 0) {
      j.finished = true;
      void j.room.send({ content: { status: "finished", level: j.level, cables: j.cables, rules: j.rules, cutCount: j.cutCount, timerMs: 0, effects: [], updatedAt: Date.now() } });
      stopTimer(j);
      return;
    }
    maybePeriodicEffect(j);
    publish(j);
  }, 1000);
}

function stopTimer(j: Judge): void {
  if (j.tick) clearInterval(j.tick);
  j.tick = null;
}

function bootJudge(roomId: string): void {
  if (judges.has(roomId)) return;
  const room: ChannelHandle<RoomState | RoomEvent> = portal.channel<RoomState | RoomEvent>(`room-${roomId}`, {
    history: 20,
    metadata: { kind: "agent" },
  });
  const actions: ChannelHandle<RoomAction> = portal.channel<RoomAction>(`room-${roomId}-actions`, {
    history: 20,
  });
  room.acquire();
  actions.acquire();

  const j: Judge = {
    roomId,
    room,
    actions,
    roomSeed: Math.floor(Math.random() * 0x7fffffff),
    level: 1,
    cables: [],
    order: [],
    rules: { summary: "", steps: [] },
    cutCount: 0,
    timerMs: START_TIMER_MS,
    effects: [],
    nextEffectAt: Date.now() + PERIODIC_EFFECT_INTERVAL_MS,
    timer: null,
    tick: null,
    started: false,
    finished: false,
  };
  judges.set(roomId, j);

  room.on("message", (m) => {
    const content = m.content;
    if ("type" in content && content.type === "start" && !j.started) {
      j.started = true;
      startLevel(j);
      startTimer(j);
      console.log(`[agent] ${roomId} partida iniciada`);
    }
  });

  actions.on("message", (m) => {
    if (!j.started || j.finished) return;
    if (m.content.type !== "cut") return;
    const label = m.content.label;
    const expected = j.order[j.cutCount];
    console.log(`[agent] ${roomId} corte: ${label} (esperado ${expected ?? "-"})`);
    if (label === expected) {
      const c = j.cables.find((c) => c.label === label);
      if (c) c.cut = true;
      j.cutCount++;
      if (j.cutCount === j.order.length) {
        j.level++;
        j.timerMs = Math.min(j.timerMs + LEVEL_BONUS_MS, START_TIMER_MS + LEVEL_BONUS_MS * 10);
        startLevel(j);
        console.log(`[agent] ${roomId} nivel ${j.level - 1} superado`);
      } else {
        publish(j);
      }
    } else {
      j.timerMs = Math.max(0, j.timerMs - CUT_PENALTY_MS);
      if (j.level >= EFFECTS_MIN_LEVEL) {
        addEffect(j, { kind: "freeze", userId: m.sender.id, expiresAt: Date.now() + FREEZE_MS });
        if (j.level >= EFFECTS_EXTRA_MIN_LEVEL && Math.random() < EXTRA_GLOBAL_CHANCE) {
          addEffect(j, randomGlobalEffect(Date.now()));
        }
      }
      publish(j);
      console.log(`[agent] ${roomId} corte mal (-15s): ${label} esperado ${expected}`);
    }
  });

  console.log(`[agent] juez activo para ${roomId}`);
}

function watchRooms(): void {
  const rooms = index
    .getSnapshot()
    .messages.map((m) => m.content)
    .filter((r) => Date.now() - r.updatedAt <= 10_000)
    .map((r) => r.id);
  for (const id of rooms) bootJudge(id);
}

index.acquire();
index.on("presence", watchRooms);
index.on("status", () => watchRooms());
setInterval(watchRooms, 5000);
console.log("[agent] agente juez listo, observando rooms-index...");

process.on("SIGINT", () => {
  index.release();
  process.exit(0);
});
