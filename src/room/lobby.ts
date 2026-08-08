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
    <h1>Cable Rush</h1>
    <p id="room-id">Room: ${roomName}</p>
    <p id="status">conectando...</p>
    <div id="players"></div>
    <p id="lobby-state">Esperando jugadores...</p>
    ${isHost ? '<button id="start-btn" disabled>Iniciar partida</button>' : ""}
    <div id="stage"></div>
    <p id="timer">Timer: --:--</p>
    <div id="chat">
      <div id="chat-log"></div>
      <form id="chat-form">
        <input id="chat-input" maxlength="200" placeholder="Escribe un mensaje..." autocomplete="off" />
        <button type="submit">Enviar</button>
      </form>
    </div>
    <a href="/">← Volver al menú</a>
  `;

  const statusEl = document.getElementById("status");
  const playersEl = document.getElementById("players");
  const stateEl = document.getElementById("lobby-state");
  const timerEl = document.getElementById("timer");
  const startBtn = document.getElementById("start-btn") as HTMLButtonElement | null;
  const chatLogEl = document.getElementById("chat-log");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input") as HTMLInputElement | null;

  let announced = false;
  let started = false;
  let judgeAnnounced = false;
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

  function renderPlayers(list: { id: string; name: string; host: boolean }[]): void {
    if (!playersEl) return;
    playersEl.replaceChildren();
    const byId = new Map<string, { id: string; name: string; host: boolean }>();
    for (const p of list) byId.set(p.id, p);
    for (const p of byId.values()) {
      const div = document.createElement("div");
      div.textContent = `${p.host ? "[host] " : ""}${p.name}`;
      playersEl.appendChild(div);
    }
  }

  const chatById = new Map<string, { name: string; text: string }>();

  function renderChat(): void {
    if (!chatLogEl) return;
    chatLogEl.replaceChildren();
    for (const { name, text } of chatById.values()) {
      const div = document.createElement("div");
      div.textContent = `${name}: ${text}`;
      chatLogEl.appendChild(div);
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

  function applyJudge(judgeId: string): void {
    judgeAnnounced = true;
    selfRole = judgeId === client.getSelfId() ? "judge" : "cutter";
    client.setMeta({ name: username, host: isHost, role: selfRole });
    if (stateEl) stateEl.textContent = "Juez elegido. Esperando que el host inicie...";
    if (startBtn) startBtn.disabled = client.getPlayers().length < REQUIRED_PLAYERS;
  }

  function applyStart(): void {
    started = true;
    mountByRole(selfRole ?? "cutter");
    if (stateEl) stateEl.textContent = "¡Partida en curso!";
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
    if (statusEl) statusEl.textContent = s;
  });

  client.subscribePresence((list) => {
    for (const p of list) lastSeen.set(p.id, Date.now());
    renderPlayers(list);
    if (stateEl) {
      stateEl.textContent =
        started
          ? "¡Partida en curso!"
          : list.length >= REQUIRED_PLAYERS
            ? "¡4 jugadores! Esperando al juez..."
            : `Esperando jugadores (${list.length}/4)`;
    }
    if (startBtn) startBtn.disabled = !(judgeAnnounced && list.length >= REQUIRED_PLAYERS);
    maybeAnnounceJudge(list);
    if (isHost) publish();
  });

  let lastPublish = 0;

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
    if (e.type === "judge") applyJudge(e.judgeId);
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
    if (!timerEl) return;
    if (!s) return;
    if (s.status === "finished") {
      if (stateEl) stateEl.textContent = `¡Fin de la partida! Nivel alcanzado: ${s.level}`;
      timerEl.textContent = "Timer: 00:00";
      return;
    }
    const secs = Math.max(0, Math.round(s.timerMs / 1000));
    timerEl.textContent = `Timer: ${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
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
