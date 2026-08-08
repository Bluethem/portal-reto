import { joinRoom } from "../portal/client";
import type { Role } from "../portal/types";
import { getUsername } from "../shared/username";
import { mountBoard } from "../board/board";
import { mountDirector } from "../director/director";

const REQUIRED_PLAYERS = 4;
const ALIVE_INTERVAL_MS = 2000;
const ALIVE_TIMEOUT_MS = 8000;

export function bootRoom(roomId: string, isHost: boolean, roomName: string): void {
  const root = document.getElementById("app");
  if (!root) return;

  const username = getUsername() ?? "anon";
  const client = joinRoom(roomId, { name: username, host: isHost, role: null });

  root.innerHTML = `
    <div class="min-h-screen flex flex-col">
      <header class="bg-slate-gray w-full flex-none">
        <div class="flex items-center justify-between w-full px-10 py-2 max-w-[1200px] mx-auto h-16">
          <div class="flex items-center gap-10 min-w-0">
            <span class="text-heading-sm font-extrabold text-sunbeam-yellow lowercase shrink-0">cable rush</span>
            <span id="room-id" class="text-body-sm text-paper-white truncate">Operación: ${escapeHtml(roomName)}</span>
          </div>
          <a href="/" class="text-body-sm text-paper-white hover:text-sunbeam-yellow transition-colors flex items-center gap-2 shrink-0">
            <span class="material-symbols-outlined text-[18px]">logout</span> Salir
          </a>
        </div>
      </header>
      <main class="flex-1 w-full max-w-[1200px] mx-auto px-10 py-7">
        <div id="lobby-layout" class="grid grid-cols-1 lg:grid-cols-12 gap-7">
          <section class="lg:col-span-8 flex flex-col gap-6">
            <div id="lobby-state" class="bg-surface-container rounded-card px-6 py-2 text-subheading text-carbon font-bold">
              Esperando jugadores...
            </div>
            <div id="hud" class="hidden bg-paper-white rounded-card shadow-pill p-6 flex items-center justify-between gap-5">
              <span id="level" class="text-heading-sm text-carbon font-bold">Nivel 1</span>
              <span id="progress" class="text-body-sm text-on-surface-variant">Cortes 0/0</span>
              <span id="timer" class="text-heading-sm font-extrabold text-carbon">--:--</span>
            </div>
            <div id="stage"></div>
            <div id="comms" class="bg-sand rounded-[16px] rounded-bl-none p-6 relative">
              <h3 class="text-heading-sm text-carbon font-bold mb-2">Comms tácticas</h3>
              <div id="chat-log" class="space-y-3 max-h-56 overflow-y-auto"></div>
              <form id="chat-form" class="mt-6 relative">
                <input
                  id="chat-input"
                  maxlength="200"
                  placeholder="Envía un mensaje..."
                  autocomplete="off"
                  class="w-full bg-fog border border-outline-variant rounded-[6px] py-1 pl-6 pr-12 text-body-sm text-carbon placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-electric-violet"
                />
                <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 text-electric-violet">
                  <span class="material-symbols-outlined">send</span>
                </button>
              </form>
            </div>
          </section>
          <aside class="lg:col-span-4 flex flex-col gap-7">
            <div class="flex justify-between items-end">
              <h2 class="text-heading text-carbon font-bold">Squad</h2>
              <span id="squad-count" class="text-subheading text-electric-violet">0 / 4</span>
            </div>
            <div id="players" class="flex flex-col gap-4"></div>
            <div id="start-area" class="mt-auto pt-7">
              <button
                id="start-btn"
                disabled
                class="w-full bg-electric-violet text-paper-white text-heading-sm font-bold py-7 rounded-[34px] shadow-pill hover:bg-secondary-container transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Iniciar partida
              </button>
              <p id="start-hint" class="text-center text-caption text-slate-gray mt-4">Esperando al equipo completo.</p>
            </div>
          </aside>
        </div>
        <div id="gameover" class="hidden fixed inset-0 z-50 bg-surface/90 backdrop-blur flex items-center justify-center px-10">
          <div class="bg-paper-white rounded-card shadow-pill p-10 max-w-md w-full text-center">
            <span class="material-symbols-outlined text-[56px] text-error">bolt</span>
            <h2 class="text-display text-carbon">Operación terminada</h2>
            <p class="text-body-sm text-on-surface-variant mt-2">El equipo llegó hasta el</p>
            <div class="mt-6 bg-sand rounded-[16px] p-6">
              <p class="text-caption text-slate-gray">Nivel alcanzado</p>
              <p id="go-level" class="text-display text-carbon font-extrabold">1</p>
            </div>
            <a href="/" class="block mt-7 w-full bg-electric-violet text-paper-white text-body font-bold py-3 rounded-full shadow-pill hover:bg-secondary-container transition-colors">
              Volver al menú
            </a>
          </div>
        </div>
      </main>
    </div>
  `;

  const statusEl = document.getElementById("lobby-state");
  const playersEl = document.getElementById("players");
  const squadCountEl = document.getElementById("squad-count");
  const timerEl = document.getElementById("timer");
  const levelEl = document.getElementById("level");
  const progressEl = document.getElementById("progress");
  const hudEl = document.getElementById("hud");
  const startBtn = document.getElementById("start-btn") as HTMLButtonElement | null;
  const startHintEl = document.getElementById("start-hint");
  const chatLogEl = document.getElementById("chat-log");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input") as HTMLInputElement | null;
  const gameoverEl = document.getElementById("gameover");
  const goLevelEl = document.getElementById("go-level");

  let announced = false;
  let judgeAnnounced = false;
  let started = false;
  let judgeId: string | null = null;
  let selfRole: Role | null = null;
  let cleanup: (() => void) | null = null;
  const lastSeen = new Map<string, number>();

  function mountByRole(role: Role): void {
    const stage = document.getElementById("stage");
    if (!stage) return;
    stage.replaceChildren();
    cleanup?.();
    cleanup = role === "judge" ? mountDirector(stage, client) : mountBoard(stage, client, username);
  }

  function statusBadge(player: { id: string; host: boolean }): string {
    if (player.id === judgeId) return "Director";
    if (started) return "Cortador";
    if (player.host) return "Host de operación";
    return "Operativo";
  }

  function renderPlayers(list: { id: string; name: string; host: boolean }[]): void {
    if (!playersEl) return;
    playersEl.replaceChildren();
    for (const p of list.slice(0, REQUIRED_PLAYERS)) {
      const card = document.createElement("div");
      card.className =
        "bg-surface-highest rounded-card p-4 flex items-center justify-between border-l-[6px] border-electric-violet";
      const icon = p.host ? "host" : "person";
      card.innerHTML = `
        <div class="flex items-center gap-4 min-w-0">
          <div class="w-12 h-12 bg-sunbeam-yellow rounded-full flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-carbon">${icon}</span>
          </div>
          <div class="min-w-0">
            <p class="font-bold text-body text-carbon leading-none truncate">${escapeHtml(p.name)}</p>
            <p class="text-caption text-slate-gray">${statusBadge(p)}</p>
          </div>
        </div>
        <span class="font-bold text-caption text-electric-violet shrink-0">${p.id === judgeId ? "DIRECTOR" : started ? "EN CAMPO" : "LISTO"}</span>
      `;
      playersEl.appendChild(card);
    }
    for (let i = list.length; i < REQUIRED_PLAYERS; i++) {
      const empty = document.createElement("div");
      empty.className =
        "bg-fog rounded-card p-4 flex items-center justify-center border border-dashed border-slate-gray h-[88px]";
      empty.innerHTML = `
        <p class="text-caption text-slate-gray flex items-center gap-2">
          <span class="material-symbols-outlined">person_add</span>
          Esperando jugador...
        </p>
      `;
      playersEl.appendChild(empty);
    }
    if (squadCountEl) squadCountEl.textContent = `${list.length} / 4`;
  }

  const chatById = new Map<string, { name: string; text: string }>();

  function renderChat(): void {
    if (!chatLogEl) return;
    chatLogEl.replaceChildren();
    for (const { name, text } of chatById.values()) {
      const row = document.createElement("div");
      row.className = "flex gap-4 items-start";
      const who = document.createElement("span");
      who.className = "font-bold text-electric-violet shrink-0";
      who.textContent = `${name}:`;
      const msg = document.createElement("p");
      msg.className = "text-body-sm text-carbon";
      msg.textContent = text;
      row.append(who, msg);
      chatLogEl.appendChild(row);
    }
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
  }

  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      void client.sendChat(text, username);
      chatInput.value = "";
    });
  }

  function updateLobbyBanner(): void {
    if (!statusEl) return;
    if (started) {
      statusEl.textContent = "¡Partida en curso!";
      return;
    }
    const count = client.getPlayers().length;
    if (count >= REQUIRED_PLAYERS && judgeId) {
      statusEl.textContent = "Juez elegido. Esperando que el host inicie...";
    } else if (count >= REQUIRED_PLAYERS) {
      statusEl.textContent = "¡4 jugadores! Designando juez...";
    } else {
      statusEl.textContent = `Esperando jugadores (${count}/4)...`;
    }
  }

  function updateStartArea(): void {
    const count = client.getPlayers().length;
    const full = count >= REQUIRED_PLAYERS;
    if (!startBtn) return;
    if (!isHost) {
      startBtn.disabled = true;
      if (startHintEl) {
        startHintEl.textContent = judgeId
          ? "El host iniciará la operación."
          : "Esperando la designación del juez...";
      }
      return;
    }
    startBtn.disabled = !(judgeId && full);
    if (startHintEl) {
      startHintEl.textContent = judgeId && full
        ? "Equipo completo. ¡Inicia la operación!"
        : full
          ? "Designando juez..."
          : "Esperando al equipo completo.";
    }
  }

  function applyJudge(id: string): void {
    judgeId = id;
    judgeAnnounced = true;
    selfRole = id === client.getSelfId() ? "judge" : "cutter";
    client.setMeta({ name: username, host: isHost, role: selfRole });
    updateLobbyBanner();
    updateStartArea();
  }

  function applyStart(): void {
    started = true;
    mountByRole(selfRole ?? "cutter");
    updateLobbyBanner();
  }

  function maybeAnnounceJudge(list: { id: string; name: string; host: boolean }[]): void {
    if (!isHost || announced) return;
    if (list.length !== REQUIRED_PLAYERS) return;
    announced = true;
    const judge = list[Math.floor(Math.random() * list.length)];
    applyJudge(judge.id);
    void client.sendEvent({ type: "judge", judgeId: judge.id });
  }

  client.subscribeStatus((s) => {
    if (s === "ready") updateStartArea();
  });

  client.subscribePresence((list) => {
    for (const p of list) lastSeen.set(p.id, Date.now());
    renderPlayers(list);
    updateLobbyBanner();
    updateStartArea();
    maybeAnnounceJudge(list);
    if (isHost) publish();
  });

  function publish(): void {
    const list = client.getPlayers();
    void client.publishRoom({
      id: roomId,
      name: roomName,
      mode: roomId.startsWith("prv-") ? "private" : "public",
      players: list.length,
      hostId: client.getSelfId(),
      hostName: username,
      updatedAt: Date.now(),
    });
  }

  if (isHost) {
    publish();
    const interval = setInterval(publish, 5000);
    window.addEventListener("beforeunload", () => clearInterval(interval));
  }

  client.subscribeChat((m) => {
    if (chatById.has(m.id)) return;
    chatById.set(m.id, { name: m.name, text: m.text });
    renderChat();
  });

  client.subscribeEvents((e) => {
    if (e.type === "judge") {
      applyJudge(e.judgeId);
      renderPlayers(client.getPlayers());
    }
    if (e.type === "start") applyStart();
  });

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (judgeAnnounced) {
        applyStart();
        void client.sendEvent({ type: "start" });
      }
    });
  }

  client.subscribeState((s) => {
    if (!s) return;
    if (hudEl) hudEl.classList.remove("hidden");
    if (timerEl) {
      const secs = Math.max(0, Math.round(s.timerMs / 1000));
      const text = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
      timerEl.textContent = text;
      timerEl.classList.toggle("text-error", secs <= 30);
    }
    if (s.status === "finished") {
      if (timerEl) timerEl.textContent = "00:00";
      if (gameoverEl && goLevelEl) {
        goLevelEl.textContent = String(s.level);
        gameoverEl.classList.remove("hidden");
      }
      return;
    }
    if (levelEl) levelEl.textContent = `Nivel ${s.level}`;
    if (progressEl) progressEl.textContent = `Cortes ${s.cutCount}/${s.cables.length}`;
  });

  const aliveInterval = setInterval(() => client.sendAlive(), ALIVE_INTERVAL_MS);

  const pruneInterval = setInterval(() => {
    const now = Date.now();
    const stale = [...lastSeen.entries()].filter(([, t]) => now - t > ALIVE_TIMEOUT_MS).map(([id]) => id);
    if (stale.length === 0) return;
    for (const id of stale) lastSeen.delete(id);
    renderPlayers(client.getPlayers().filter((p) => lastSeen.has(p.id)));
  }, 1000);

  client.subscribeActivity((users) => {
    const now = Date.now();
    for (const id of users) lastSeen.set(id, now);
  });

  window.addEventListener("beforeunload", () => {
    clearInterval(aliveInterval);
    clearInterval(pruneInterval);
    client.release();
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
