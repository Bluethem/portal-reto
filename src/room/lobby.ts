import { joinRoom } from "../portal/client";
import type { ChatEntry, Role } from "../portal/types";
import { getUsername } from "../shared/username";
import { mountBoard } from "../board/board";
import { mountDirector } from "../director/director";
import { crewmateSvg } from "../ui/crewmate";
import { startLobbyMusic, stopMusic } from "../ui/music";
import { playClick, playJoin, playLeave, playReady, playStart } from "../ui/sound";

const REQUIRED_PLAYERS = 4;
const ALIVE_INTERVAL_MS = 1000;
const ALIVE_TIMEOUT_MS = 3000;
const CREW_COLORS = ["#ffb4a9", "#2196f3", "#4caf50", "#cdcd00", "#a4ffe8", "#c51111"];

export function bootRoom(roomId: string, isHost: boolean, roomName: string): void {
  const root = document.getElementById("app");
  if (!root) return;

  const username = getUsername() ?? "anon";
  const client = joinRoom(roomId, { name: username, host: isHost, role: null });

  root.innerHTML = `
    <div class="min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface analog-texture">
      <nav class="hidden lg:flex flex-col gap-4 p-6 w-64 shrink-0 bg-surface-container border-r-8 border-black block-shadow-md">
        <div class="mb-6">
          <h1 class="text-heading-sm font-display text-primary tracking-tighter uppercase stroke-heavy mb-6">cable rush</h1>
          <div class="flex items-center gap-3 p-3 bg-surface-high border-4 border-black rounded-xl block-shadow">
            <div class="w-12 h-12 rounded-full border-2 border-black overflow-hidden flex-shrink-0 bg-surface-highest flex items-center justify-center">${crewmateSvg("#ffb4a9", 44)}</div>
            <div class="overflow-hidden">
              <div class="text-caption text-secondary truncate uppercase font-bold">${escapeHtml(username)}</div>
              <div class="text-[12px] text-on-surface-variant truncate uppercase">Rank: Defuser</div>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <button type="button" class="flex items-center gap-3 p-3 text-on-surface hover:bg-surface-variant rounded-full border-4 border-transparent hover:border-black transition-transform active:scale-95">
            <span class="material-symbols-outlined text-xl">home</span>
            <span class="text-caption uppercase tracking-wide">Home</span>
          </button>
          <button type="button" class="flex items-center gap-3 p-3 bg-secondary text-on-secondary font-bold rounded-full border-4 border-black block-shadow">
            <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">meeting_room</span>
            <span class="text-caption uppercase tracking-wide">Room</span>
          </button>
        </div>
        <div class="mt-auto pt-4 border-t-4 border-outline-variant flex justify-between items-center text-caption uppercase">
          <span class="text-on-surface-variant">SYS.STAT</span>
          <span class="text-secondary flex items-center gap-1"><div class="w-2 h-2 bg-secondary rounded-full animate-pulse"></div> ONLINE</span>
        </div>
      </nav>
      <main class="flex-1 h-screen flex flex-col overflow-hidden">
        <header class="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-surface-container border-b-8 border-black block-shadow">
          <div class="flex items-center gap-3 min-w-0">
            <span id="room-id" class="text-body-sm text-on-surface truncate">Operación: ${escapeHtml(roomName)}</span>
            <span class="flex items-center gap-1 bg-surface-high border-2 border-black rounded-full px-3 py-1 shrink-0">
              <span class="material-symbols-outlined text-[16px] text-secondary">key</span>
              <span id="room-code" class="text-body-sm font-bold text-secondary tracking-widest">--</span>
              <button id="copy-code" type="button" title="Copiar código" class="text-on-surface hover:text-secondary transition-colors">
                <span class="material-symbols-outlined text-[16px]">content_copy</span>
              </button>
            </span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span id="user-name" class="text-body-sm text-on-surface hidden sm:inline uppercase">${escapeHtml(username)}</span>
            <button id="mic-btn" type="button" title="Micro" class="w-10 h-10 flex items-center justify-center bg-surface-high rounded-full border-4 border-black hover:bg-surface-variant transition-colors">
              <span id="mic-icon" class="material-symbols-outlined text-[20px] text-on-surface">mic</span>
            </button>
            <button id="deafen-btn" type="button" title="Ensordecer" class="w-10 h-10 flex items-center justify-center bg-surface-high rounded-full border-4 border-black hover:bg-surface-variant transition-colors">
              <span id="deafen-icon" class="material-symbols-outlined text-[20px] text-on-surface">headphones</span>
            </button>
            <a id="leave-btn" href="/" class="pressed text-body-sm text-on-surface hover:text-secondary transition-colors flex items-center gap-2 shrink-0 bg-surface-high px-3 py-2 rounded-full border-4 border-black">
              <span class="material-symbols-outlined text-[18px]">logout</span> Salir
            </a>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
          <div class="max-w-[1200px] mx-auto">
            <div class="flex flex-col md:flex-row justify-between items-end gap-4 mb-6 border-b-4 border-outline-variant pb-4">
              <div>
                <h2 class="text-display font-display text-secondary uppercase stroke-heavy">Sala de Espera</h2>
                <p class="text-body-sm text-on-surface-variant uppercase mt-1">Código: <span class="bg-surface-high px-2 py-1 rounded border-2 border-black font-mono tracking-widest text-tertiary">${escapeHtml(roomId.slice(roomId.indexOf("-") + 1))}</span></p>
              </div>
              <div id="lobby-state" class="text-right text-heading-sm text-primary font-bold uppercase animate-pulse">
                Esperando jugadores...
              </div>
            </div>
            <div id="hud" class="hidden mb-6 bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6 flex items-center justify-between gap-5">
              <span id="level" class="text-heading-sm font-display text-secondary uppercase">Nivel 1</span>
              <span id="progress" class="text-body-sm text-on-surface-variant uppercase">Cortes 0/0</span>
              <span id="timer" class="text-heading-sm font-display font-bold text-primary uppercase">--:--</span>
            </div>
            <div id="lobby-layout" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <section id="left-col" class="lg:col-span-8 flex flex-col gap-6">
                <div id="stage"></div>
                <div id="comms" class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6 relative">
                  <h3 class="text-heading-sm font-display text-secondary uppercase mb-2">Comms tácticas</h3>
                  <p id="chat-error" class="hidden text-body-sm text-error font-bold mb-2"></p>
                  <div id="chat-log" class="space-y-3 max-h-72 overflow-y-auto font-mono text-sm"></div>
                  <p id="chat-empty" class="text-caption text-on-surface-variant uppercase mt-1">Sin mensajes aún. Coordiná el corte por voz.</p>
                  <form id="chat-form" class="mt-6 relative">
                    <input
                      id="chat-input"
                      maxlength="200"
                      placeholder="Envía un mensaje..."
                      autocomplete="off"
                      class="w-full bg-surface-high border-4 border-black rounded-lg py-1 pl-6 pr-12 text-body-sm text-carbon placeholder:text-slate-gray focus:outline-none focus:border-secondary"
                    />
                    <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 text-secondary">
                      <span class="material-symbols-outlined">send</span>
                    </button>
                  </form>
                </div>
              </section>
              <div id="splitter" class="hidden lg:block w-1.5 shrink-0 cursor-col-resize bg-outline-variant rounded-full hover:bg-secondary transition-colors self-stretch"></div>
              <aside id="right-col" class="lg:col-span-4 flex flex-col gap-6">
                <div class="flex justify-between items-end">
                  <h2 class="text-heading font-display text-primary uppercase">Squad</h2>
                  <span id="squad-count" class="text-subheading text-secondary">0 / 4</span>
                </div>
                <div id="players" class="flex flex-col gap-4"></div>
                <div id="start-area" class="mt-auto pt-6">
                  <button
                    id="start-btn"
                    disabled
                    class="pressed w-full bg-secondary text-on-secondary text-heading-sm font-bold py-6 rounded-2xl border-8 border-black block-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Iniciar partida
                  </button>
                  <p id="start-hint" class="text-center text-caption text-on-surface-variant uppercase mt-4">Esperando al equipo completo.</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
      <div id="gameover" class="hidden fixed inset-0 z-50 bg-surface/90 backdrop-blur flex items-center justify-center px-6">
        <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-10 max-w-md w-full text-center">
          <span class="material-symbols-outlined text-[56px] text-error">bolt</span>
          <h2 class="text-display font-display text-on-surface uppercase">Operación terminada</h2>
          <p class="text-body-sm text-on-surface-variant uppercase mt-2">El equipo llegó hasta el</p>
          <div class="mt-6 bg-surface-high border-4 border-black rounded-xl p-6">
            <p class="text-caption text-on-surface-variant uppercase">Nivel alcanzado</p>
            <p id="go-level" class="text-display font-display text-primary font-extrabold">1</p>
          </div>
          <a href="/" class="pressed block mt-7 w-full bg-primary text-on-primary text-body font-bold py-3 rounded-full border-4 border-black block-shadow transition-colors uppercase">
            Volver al menú
          </a>
        </div>
      </div>
      <div id="locked-out" class="hidden fixed inset-0 z-50 bg-surface/90 backdrop-blur flex items-center justify-center px-6">
        <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-10 max-w-md w-full text-center">
          <span class="material-symbols-outlined text-[56px] text-tertiary">lock</span>
          <h2 class="text-display font-display text-on-surface uppercase">Partida en curso</h2>
          <p class="text-body-sm text-on-surface-variant uppercase mt-2">La sala ya comenzó y no acepta más jugadores.</p>
          <a href="/" class="pressed block mt-7 w-full bg-primary text-on-primary text-body font-bold py-3 rounded-full border-4 border-black block-shadow transition-colors uppercase">
            Volver al menú
          </a>
        </div>
      </div>
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
  const chatEmptyEl = document.getElementById("chat-empty");
  const chatErrorEl = document.getElementById("chat-error");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input") as HTMLInputElement | null;
  const gameoverEl = document.getElementById("gameover");
  const goLevelEl = document.getElementById("go-level");
  const lockedOutEl = document.getElementById("locked-out");
  const leftCol = document.getElementById("left-col");
  const rightCol = document.getElementById("right-col");
  const stageEl = document.getElementById("stage");
  const lobbyLayoutEl = document.getElementById("lobby-layout");
  const splitter = document.getElementById("splitter");
  const roomCodeEl = document.getElementById("room-code");
  const copyBtn = document.getElementById("copy-code");
  const micBtn = document.getElementById("mic-btn");
  const micIconEl = document.getElementById("mic-icon");
  const deafenBtn = document.getElementById("deafen-btn");
  const deafenIconEl = document.getElementById("deafen-icon");

  const code = roomId.slice(roomId.indexOf("-") + 1);
  if (roomCodeEl) roomCodeEl.textContent = code;

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      playClick();
      void copyRoomCode(copyBtn, code);
    });
  }

  let micMuted = false;
  let deafened = false;

  function refreshAudio(): void {
    if (!micIconEl || !deafenIconEl) return;
    const muted = micMuted || deafened;
    micIconEl.textContent = muted ? "mic_off" : "mic";
    micIconEl.classList.toggle("text-error", muted);
    micIconEl.classList.toggle("text-on-surface", !muted);
    deafenIconEl.textContent = deafened ? "hearing_disabled" : "headphones";
    deafenIconEl.classList.toggle("text-error", deafened);
    deafenIconEl.classList.toggle("text-on-surface", !deafened);
  }

  if (micBtn) {
    micBtn.addEventListener("click", () => {
      playClick();
      micMuted = !micMuted;
      refreshAudio();
    });
  }
  if (deafenBtn) {
    deafenBtn.addEventListener("click", () => {
      playClick();
      deafened = !deafened;
      refreshAudio();
    });
  }

  const startMusicOnce = () => {
    startLobbyMusic();
    window.removeEventListener("pointerdown", startMusicOnce);
    window.removeEventListener("keydown", startMusicOnce);
  };
  window.addEventListener("pointerdown", startMusicOnce);
  window.addEventListener("keydown", startMusicOnce);

  let announced = false;
  let judgeAnnounced = false;
  let started = false;
  let judgeId: string | null = null;
  let selfRole: Role | null = null;
  let cleanup: (() => void) | null = null;
  const lastSeen = new Map<string, number>();

  function activePlayers(): { id: string; name: string; host: boolean }[] {
    return client.getPlayers().filter((p) => lastSeen.has(p.id));
  }

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

  const seenPlayerIds = new Set<string>();

  function renderPlayers(list: { id: string; name: string; host: boolean }[]): void {
    if (!playersEl) return;
    const ids = new Set(list.map((p) => p.id));
    if (seenPlayerIds.size > 0) {
      for (const id of ids) if (!seenPlayerIds.has(id)) playJoin();
      for (const id of seenPlayerIds) if (!ids.has(id)) playLeave();
    }
    if (!started && list.length === REQUIRED_PLAYERS && seenPlayerIds.size < REQUIRED_PLAYERS) playReady();
    seenPlayerIds.clear();
    for (const id of ids) seenPlayerIds.add(id);
    playersEl.replaceChildren();
    for (const [i, p] of list.slice(0, REQUIRED_PLAYERS).entries()) {
      const color = CREW_COLORS[i % CREW_COLORS.length];
      const card = document.createElement("div");
      card.className =
        "bg-surface-container-high border-8 border-black rounded-xl p-4 block-shadow flex items-center gap-4 relative overflow-hidden";
      const ready = p.id !== judgeId && !started;
      const badge = p.id === judgeId ? "DIRECTOR" : started ? "EN CAMPO" : "LISTO";
      const badgeColor = p.id === judgeId
        ? "bg-tertiary text-on-tertiary"
        : started
          ? "bg-secondary text-on-secondary"
          : "bg-surface-variant text-on-surface border-dashed opacity-80";
      card.innerHTML = `
        <div class="absolute inset-0" style="background: ${color}; opacity: 0.08;"></div>
        <div class="w-16 h-20 shrink-0 flex items-center justify-center">${crewmateSvg(color, 56)}</div>
        <div class="flex-1 z-10 min-w-0">
          <p class="font-bold text-body text-on-surface leading-none truncate">${escapeHtml(p.name)}</p>
          <p class="text-caption text-on-surface-variant mt-1 uppercase">${statusBadge(p)}</p>
        </div>
        <span class="z-10 ${badgeColor} px-3 py-1 border-4 border-black rounded text-caption uppercase shrink-0">${badge}</span>
      `;
      playersEl.appendChild(card);
    }
    for (let i = list.length; i < REQUIRED_PLAYERS; i++) {
      const color = CREW_COLORS[i % CREW_COLORS.length];
      const empty = document.createElement("div");
      empty.className =
        "bg-surface-high border-8 border-black rounded-xl p-4 flex items-center justify-center border-dashed h-[88px] opacity-60";
      empty.innerHTML = `
        <div class="w-16 h-20 shrink-0 flex items-center justify-center">${crewmateSvg(color, 48)}</div>
        <p class="text-caption text-on-surface-variant uppercase flex items-center gap-2 ml-3">
          <span class="material-symbols-outlined">person_add</span>
          Esperando jugador...
        </p>
      `;
      playersEl.appendChild(empty);
    }
    if (squadCountEl) squadCountEl.textContent = `${list.length} / 4`;
  }

  let chatErrorTimer: ReturnType<typeof setTimeout> | null = null;

  function renderChat(entries: ChatEntry[]): void {
    if (!chatLogEl) return;
    if (chatEmptyEl) chatEmptyEl.classList.toggle("hidden", entries.length > 0);
    chatLogEl.replaceChildren();
    for (const { name, text, self, status } of entries) {
      const pending = status === "pending";
      const failed = status === "failed";
      const row = document.createElement("div");
      row.className = `flex gap-4 items-start ${self ? "justify-end" : ""} ${pending || failed ? "opacity-60" : ""}`;
      const who = document.createElement("span");
      who.className = `font-bold shrink-0 ${self ? "text-tertiary" : "text-secondary"}`;
      who.textContent = self ? "Tú:" : `${name}:`;
      const msg = document.createElement("p");
      msg.className = self
        ? "text-body-sm text-carbon bg-surface-high border-2 border-black rounded-lg px-3 py-1"
        : "text-body-sm text-carbon";
      if (failed) msg.classList.add("text-error");
      msg.textContent = text;
      row.append(who, msg);
      chatLogEl.appendChild(row);
    }
    chatLogEl.scrollTop = chatLogEl.scrollHeight;
  }

  function showChatError(message: string): void {
    if (!chatErrorEl) return;
    chatErrorEl.textContent = message;
    chatErrorEl.classList.remove("hidden");
    if (chatErrorTimer) clearTimeout(chatErrorTimer);
    chatErrorTimer = setTimeout(() => {
      chatErrorEl?.classList.add("hidden");
    }, 3000);
  }

  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = "";
      void client.sendChat(text, username).catch(() => {
        chatInput.value = text;
        showChatError("Mensaje no enviado. Inténtalo de nuevo.");
      });
    });
  }

  function updateLobbyBanner(): void {
    if (!statusEl) return;
    if (started) {
      statusEl.textContent = "¡Partida en curso!";
      statusEl.classList.remove("animate-pulse");
      return;
    }
    statusEl.classList.add("animate-pulse");
    const count = activePlayers().length;
    if (count >= REQUIRED_PLAYERS && judgeId) {
      statusEl.textContent = "Juez elegido. Esperando que el host inicie...";
    } else if (count >= REQUIRED_PLAYERS) {
      statusEl.textContent = "¡4 jugadores! Designando juez...";
    } else {
      statusEl.textContent = `Esperando jugadores (${count}/4)...`;
    }
  }

  function updateStartArea(): void {
    const count = activePlayers().length;
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
    stopMusic();
    playStart();
    started = true;
    mountByRole(selfRole ?? "cutter");
    updateLobbyBanner();
    const comms = document.getElementById("comms");
    const startArea = document.getElementById("start-area");
    if (comms && startArea) startArea.before(comms);
    lobbyLayoutEl?.classList.add("lg:flex", "lg:flex-row", "lg:items-stretch");
    lobbyLayoutEl?.classList.remove("lg:grid-cols-12", "lg:gap-6");
    leftCol?.classList.add("lg:flex-1", "lg:min-w-0");
    leftCol?.classList.remove("lg:col-span-8");
    rightCol?.classList.add("lg:shrink-0", "lg:min-w-0", "lg:w-[var(--panel-w)]");
    rightCol?.classList.remove("lg:col-span-4");
    rightCol?.style.setProperty("--panel-w", "360px");
    splitter?.classList.remove("hidden");
    stageEl?.classList.add("board-lg");
  }

  let dragging = false;
  if (splitter && rightCol && lobbyLayoutEl) {
    splitter.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      dragging = true;
      splitter.setPointerCapture(e.pointerId);
    });
    splitter.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const rect = lobbyLayoutEl.getBoundingClientRect();
      const width = rect.right - e.clientX;
      rightCol.style.setProperty("--panel-w", `${Math.min(480, Math.max(260, width))}px`);
    });
    splitter.addEventListener("pointerup", () => {
      dragging = false;
    });
    splitter.addEventListener("pointercancel", () => {
      dragging = false;
    });
  }

  function maybeAnnounceJudge(): void {
    if (!isHost || announced) return;
    const players = activePlayers();
    if (players.length !== REQUIRED_PLAYERS) return;
    announced = true;
    const judge = players[Math.floor(Math.random() * players.length)];
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
    maybeAnnounceJudge();
    if (isHost) publish();
  });

  function publish(): void {
    const list = activePlayers();
    void client.publishRoom({
      id: roomId,
      name: roomName,
      mode: roomId.startsWith("prv-") ? "private" : "public",
      players: list.length,
      hostId: client.getSelfId(),
      hostName: username,
      playing: started,
      updatedAt: Date.now(),
    });
  }

  if (isHost) {
    publish();
    const interval = setInterval(publish, 5000);
    window.addEventListener("beforeunload", () => clearInterval(interval));
  }

  let lastChatKey = "";
  client.subscribeChat((entries) => {
    const key = entries.map((e) => e.id).join("\0");
    if (key === lastChatKey) return;
    lastChatKey = key;
    renderChat(entries);
  });

  client.subscribeEvents((e) => {
    if (e.type === "judge") {
      applyJudge(e.judgeId);
      renderPlayers(activePlayers());
    }
    if (e.type === "start") applyStart();
  });

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      playClick();
      if (judgeAnnounced) {
        applyStart();
        void client.sendEvent({ type: "start" });
      }
    });
  }

  let lockedOut = false;

  client.subscribeState((s) => {
    if (!s) return;
    if (!started && (s.status === "playing" || s.status === "finished")) {
      if (!lockedOut) {
        lockedOut = true;
        if (lockedOutEl) lockedOutEl.classList.remove("hidden");
        client.release();
      }
      return;
    }
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
    renderPlayers(activePlayers());
    updateLobbyBanner();
    updateStartArea();
    if (isHost) publish();
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

async function copyRoomCode(btn: HTMLElement, code: string): Promise<void> {
  const icon = btn.firstElementChild as HTMLElement | null;
  const prev = icon?.innerHTML ?? "";
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    const input = document.createElement("input");
    input.value = code;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  if (icon) icon.innerHTML = "check";
  setTimeout(() => {
    if (icon) icon.innerHTML = prev;
  }, 1500);
}
