import { Portal } from "@portalsdk/core";
import type { ChannelHandle, ChannelStatus } from "@portalsdk/core";
import type { BombAttempt, BombState, ModuleId, ModuleState } from "../../src/bomb/portal/types.ts";
import { validate } from "./validate.ts";
import "./validators/wires.ts";
import "./validators/symbols.ts";
import "./validators/keypad.ts";
import "./validators/valve.ts";

const PUBLIC_PORTAL_KEY = process.env.PUBLIC_PORTAL_KEY ?? "";

if (!PUBLIC_PORTAL_KEY) {
  console.error("[agent] Falta PUBLIC_PORTAL_KEY en .env");
  process.exit(1);
}

const portal = new Portal({ apiKey: PUBLIC_PORTAL_KEY });
const bomb: ChannelHandle<BombState> = portal.channel<BombState>("bomb", {
  history: 10,
  metadata: { kind: "agent" },
});
const attempts: ChannelHandle<BombAttempt> = portal.channel<BombAttempt>("bomb-attempts", {
  history: 10,
});

function initialModules(): ModuleState[] {
  return [
    { id: 1, unlocked: true, defused: false, strikes: 0 },
    { id: 2, unlocked: false, defused: false, strikes: 0 },
    { id: 3, unlocked: false, defused: false, strikes: 0 },
    { id: 4, unlocked: false, defused: false, strikes: 0 },
  ];
}

const MAX_STRIKES = 3;

function totalStrikes(): number {
  return state.modules.reduce((acc, m) => acc + m.strikes, 0);
}

function explode(reason: string): void {
  state.status = "exploded";
  state.timerMs = 0;
  void publish();
  console.log(`[agent] BOMBA EXPLOTO: ${reason}`);
  setTimeout(() => {
    reset();
    void publish();
    console.log("[agent] Reset de bomba");
  }, 5000);
}

const state: BombState = {
  status: "idle",
  modules: initialModules(),
  timerMs: 300_000,
  progress: 0,
  updatedAt: 0,
};

async function publish(): Promise<void> {
  state.updatedAt = Date.now();
  await bomb.send({ content: { ...state } });
}

function reset(): void {
  state.status = "idle";
  state.modules = initialModules();
  state.timerMs = 300_000;
  state.progress = 0;
}

function waitReady(): Promise<void> {
  return new Promise((resolve) => {
    const check = (): void => {
      const s = bomb.getSnapshot().status;
      if (s === "ready" || s === "blocked") resolve();
      else setTimeout(check, 200);
    };
    check();
  });
}

async function boot(): Promise<void> {
  await waitReady();
  if (bomb.getSnapshot().status === "blocked") {
    console.error("[agent] Canal bomb bloqueado (revisar PUBLIC_PORTAL_KEY)");
    process.exit(1);
  }
  await publish();
  console.log("[agent] Bomba publicada, esperando jugadores...");
}

function humanCount(): number {
  const p = bomb.getSnapshot().presence;
  if (!p || p.kind !== "detailed") return 0;
  return p.participants.filter((m) => m.metadata?.kind !== "agent").length;
}

bomb.on("presence", () => {
  if (state.status !== "idle") return;
  if (humanCount() >= 4) {
    state.status = "armed";
    void publish();
    console.log("[agent] 4 jugadores listos, bomba armada");
  }
});

attempts.on("message", (m) => {
  const { module, attempt } = m.content;
  const mod = state.modules.find((x) => x.id === module);
  if (!mod) return;
  if (mod.defused || !mod.unlocked) return;
  if (state.status !== "armed") return;
  if (!validate(module, attempt)) {
    mod.strikes += 1;
    console.log(`[agent] M${module} fallo (strike ${mod.strikes}) de ${m.sender.id}`);
    void publish();
    if (totalStrikes() >= MAX_STRIKES) {
      explode("3 strikes");
    }
    return;
  }
  mod.defused = true;
  const nextId = module < 4 ? (module + 1) as ModuleId : null;
  if (nextId !== null) {
    const next = state.modules.find((x) => x.id === nextId);
    if (next) next.unlocked = true;
  }
  state.progress = state.modules.filter((x) => x.defused).length / state.modules.length;
  console.log(`[agent] M${module} desactivado por ${m.sender.id}`, JSON.stringify(attempt));
  if (state.modules.every((x) => x.defused)) {
    state.status = "defused";
    state.timerMs = 0;
    console.log("[agent] BOMBA DESACTIVADA");
  }
  void publish();
});

async function tick(): Promise<void> {
  if (state.status !== "armed") return;
  state.timerMs = Math.max(0, state.timerMs - 1000);
  if (state.timerMs === 0) {
    explode("timer");
    return;
  }
  await publish();
}

void boot();
setInterval(() => void tick(), 1000);

bomb.on("status", (s: ChannelStatus, e) =>
  console.log("[agent] bomb status:", s, e?.message ?? "")
);
attempts.on("status", (s: ChannelStatus, e) =>
  console.log("[agent] attempts status:", s, e?.message ?? "")
);

bomb.acquire();
attempts.acquire();

process.on("SIGINT", () => {
  bomb.release();
  attempts.release();
  process.exit(0);
});
