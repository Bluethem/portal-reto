import { Portal } from "@portalsdk/core";
import { generateLevel } from "../../agent/room/generator";

const START_TIMER_MS = 180_000;
const LEVEL_BONUS_MS = 60_000;
const CUT_PENALTY_MS = 15_000;
const EFFECTS_MIN_LEVEL = 4;
const EFFECTS_EXTRA_MIN_LEVEL = 5;
const FREEZE_MS = 4_000;
const LOCK_CUT_MS = 1_500;
const SCRAMBLE_MS = 2_000;
const BLIND_MS = 3_000;
const EXTRA_GLOBAL_CHANCE = 0.5;
const PERIODIC_EFFECT_INTERVAL_MS = 25_000;

function activeEffects(j) {
  const now = Date.now();
  j.effects = j.effects.filter((e) => e.expiresAt > now);
  return j.effects;
}

function addEffect(j, effect) {
  j.effects.push(effect);
}

function randomGlobalEffect(now) {
  const roll = Math.random();
  if (roll < 0.4) return { kind: "blind", expiresAt: now + BLIND_MS };
  if (roll < 0.7) return { kind: "scramble", expiresAt: now + SCRAMBLE_MS };
  return { kind: "lockCut", expiresAt: now + LOCK_CUT_MS };
}

function maybePeriodicEffect(j, roomId) {
  const now = Date.now();
  if (j.level < EFFECTS_EXTRA_MIN_LEVEL) return;
  if (now < j.nextEffectAt) return;
  j.nextEffectAt = now + PERIODIC_EFFECT_INTERVAL_MS;
  addEffect(j, randomGlobalEffect(now));
  console.log(`[judge] ${roomId} efecto periódico (nivel ${j.level})`);
}

export class JudgeDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.portal = null;
    this.index = null;
    this.judges = new Map();
    this.started = false;
  }

  async fetch(request) {
    await this.ensureStarted();
    return new Response("ok");
  }

  async alarm() {
    try {
      await this.ensureStarted();
      this.tick();
    } catch (err) {
      console.error("[judge] alarm error:", err);
    }
    await this.rearm();
  }

  async rearm() {
    const active = [...this.judges.values()].some((j) => j.started && !j.finished);
    const cadence = active ? 1000 : 5000;
    await this.state.storage.setAlarm(Date.now() + cadence);
  }

  async ensureStarted() {
    if (this.started) return;
    this.started = true;
    const key = this.env.PUBLIC_PORTAL_KEY ?? "";
    console.log(`[judge] key set=${key.length > 0} len=${key.length} prefix=${key.slice(0, 3)}`);
    console.log("[judge] iniciando Portal client en Workers...");
    this.portal = new Portal({ apiKey: key });
    this.index = this.portal.channel("rooms-index", { history: 50 });
    this.index.acquire();
    this.index.on("status", (s, err) => {
      console.log("[judge] rooms-index status:", s, err?.message ?? "");
      if (s === "ready") this.watchRooms();
    });
    this.index.on("presence", () => this.watchRooms());
    await this.state.storage.setAlarm(Date.now() + 5000);
    console.log("[judge] juez DO listo, observando rooms-index...");
  }

  tick() {
    this.watchRooms();
    this.tickGames();
  }

  watchRooms() {
    const rooms = this.index
      .getSnapshot()
      .messages.map((m) => m.content)
      .filter((r) => Date.now() - r.updatedAt <= 10_000)
      .map((r) => r.id);
    for (const id of rooms) this.bootJudge(id);
  }

  bootJudge(roomId) {
    if (this.judges.has(roomId)) return;
    const room = this.portal.channel(`room-${roomId}`, {
      history: 20,
      metadata: { kind: "agent" },
    });
    const actions = this.portal.channel(`room-${roomId}-actions`, { history: 20 });
    room.acquire();
    actions.acquire();

    const j = {
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
      started: false,
      finished: false,
    };
    this.judges.set(roomId, j);

    room.on("message", (m) => {
      const content = m.content;
      if ("type" in content && content.type === "start" && !j.started) {
        j.started = true;
        this.startLevel(j);
        console.log(`[judge] ${roomId} partida iniciada`);
      }
    });

    actions.on("message", (m) => {
      if (!j.started || j.finished) return;
      if (m.content.type !== "cut") return;
      const label = m.content.label;
      const expected = j.order[j.cutCount];
      console.log(`[judge] ${roomId} corte: ${label} (esperado ${expected ?? "-"})`);
      if (label === expected) {
        const c = j.cables.find((c) => c.label === label);
        if (c) c.cut = true;
        j.cutCount++;
        if (j.cutCount === j.order.length) {
          j.level++;
          j.timerMs = Math.min(j.timerMs + LEVEL_BONUS_MS, START_TIMER_MS + LEVEL_BONUS_MS * 10);
          this.startLevel(j);
          console.log(`[judge] ${roomId} nivel ${j.level - 1} superado`);
        } else {
          this.publish(j);
        }
      } else {
        j.timerMs = Math.max(0, j.timerMs - CUT_PENALTY_MS);
        if (j.level >= EFFECTS_MIN_LEVEL) {
          addEffect(j, { kind: "freeze", userId: m.sender.id, expiresAt: Date.now() + FREEZE_MS });
          if (j.level >= EFFECTS_EXTRA_MIN_LEVEL && Math.random() < EXTRA_GLOBAL_CHANCE) {
            addEffect(j, randomGlobalEffect(Date.now()));
          }
        }
        this.publish(j);
        console.log(`[judge] ${roomId} corte mal (-15s): ${label} esperado ${expected}`);
      }
    });

    console.log(`[judge] juez activo para ${roomId}`);
  }

  startLevel(j) {
    const gen = generateLevel(j.level, j.roomSeed);
    j.cables = gen.cables;
    j.order = gen.order;
    j.rules = gen.rules;
    j.cutCount = 0;
    j.effects = [];
    j.nextEffectAt = Date.now() + PERIODIC_EFFECT_INTERVAL_MS;
    console.log(`[judge] ${j.roomId} nivel ${j.level} seed=${gen.seed} soluciones=${gen.solutions} reglas=${gen.rules.steps.length}`);
    this.publish(j);
  }

  publish(j) {
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

  tickGames() {
    for (const j of this.judges.values()) {
      if (!j.started || j.finished) continue;
      j.timerMs = Math.max(0, j.timerMs - 1000);
      if (j.timerMs === 0) {
        j.finished = true;
        void j.room.send({
          content: {
            status: "finished",
            level: j.level,
            cables: j.cables,
            rules: j.rules,
            cutCount: j.cutCount,
            timerMs: 0,
            effects: [],
            updatedAt: Date.now(),
          },
        });
        continue;
      }
      maybePeriodicEffect(j, j.roomId);
      this.publish(j);
    }
  }
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS, ...headers },
  });
}

function b64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signHmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}

async function mintVoiceToken(apiKey, apiSecret, room, identity, name) {
  const header = { alg: "HS256", typ: "JWT", kid: apiKey };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
    sub: identity,
    name,
    video: {
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    nbf: now - 10,
    exp: now + 3600,
    jti: crypto.randomUUID(),
  };
  const enc = new TextEncoder();
  const h = b64url(enc.encode(JSON.stringify(header)));
  const p = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await signHmac(apiSecret, `${h}.${p}`);
  return `${h}.${p}.${sig}`;
}

async function handleVoiceToken(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const apiKey = env.LIVEKIT_API_KEY ?? "";
  const apiSecret = env.LIVEKIT_API_SECRET ?? "";
  if (!apiKey || !apiSecret) {
    return json({ error: "voice unavailable" }, 503);
  }
  const url = new URL(request.url);
  const room = (url.searchParams.get("room") ?? "").slice(0, 40);
  const identity = (url.searchParams.get("identity") ?? "").slice(0, 40);
  const name = (url.searchParams.get("name") ?? "").slice(0, 16);
  if (!room || !/^anon_[A-Za-z0-9]+$/.test(identity)) {
    return json({ error: "bad request" }, 400);
  }
  try {
    const token = await mintVoiceToken(apiKey, apiSecret, room, identity, name);
    return json({ token });
  } catch (err) {
    console.error("[judge] token error:", err);
    return json({ error: "token failed" }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/voice-token") return handleVoiceToken(request, env);
    const id = env.JUDGE.idFromName("global");
    const stub = env.JUDGE.get(id);
    return stub.fetch(request);
  },
  async scheduled(_controller, env) {
    const id = env.JUDGE.idFromName("global");
    const stub = env.JUDGE.get(id);
    await stub.fetch(new Request("https://cron"));
  },
};
