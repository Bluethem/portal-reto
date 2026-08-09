import { joinRoom } from "../portal/client";
import type { ChatEntry, Role } from "../portal/types";
import { getUserId } from "../shared/identity";
import { getUsername } from "../shared/username";
import { mountBoard } from "../board/board";
import { mountDirector } from "../director/director";
import { VoiceChannel } from "./voice";

const ROOM_CAPACITY = 4;
const MIN_PLAYERS_TO_START = 2;
const ALIVE_INTERVAL_MS = 1000;
const ALIVE_TIMEOUT_MS = 3000;

export function bootRoom(roomId: string, isHostArg: boolean, roomNameArg: string): void {
  const root = document.getElementById("app");
  if (!root) return;

  const username = getUsername() ?? "anon";
  const isUrlHost = isHostArg;
  let isHost = isHostArg;
  const selfUserId = getUserId();
  let roomName = roomNameArg || roomId;
  const client = joinRoom(roomId, { userId: selfUserId, name: username, host: isHost, role: null });

  root.innerHTML = `
    <div class="min-h-screen flex flex-col">
      <header class="bg-slate-gray w-full flex-none">
        <div class="flex items-center justify-between w-full px-10 py-2 max-w-[1200px] mx-auto h-16">
          <div class="flex items-center gap-4 min-w-0">
            <span class="text-heading-sm font-extrabold text-sunbeam-yellow lowercase shrink-0">cable rush</span>
            <span id="room-id" class="text-body-sm text-paper-white truncate hidden md:inline">Operación: ${escapeHtml(roomName)}</span>
            <span class="flex items-center gap-1 bg-paper-white/10 rounded-full px-3 py-1 shrink-0">
              <span class="material-symbols-outlined text-[16px] text-sunbeam-yellow">key</span>
              <span id="room-code" class="text-body-sm font-bold text-sunbeam-yellow tracking-widest">--</span>
              <button id="copy-code" type="button" title="Copiar código" class="text-paper-white hover:text-sunbeam-yellow transition-colors">
                <span class="material-symbols-outlined text-[16px]">content_copy</span>
              </button>
            </span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <div class="relative">
              <div class="flex items-center gap-2 bg-paper-white/10 rounded-full px-3 py-1">
                <span class="material-symbols-outlined text-[16px] text-sunbeam-yellow">person</span>
                <span id="user-name" class="text-body-sm text-paper-white hidden sm:inline">${escapeHtml(username)}</span>
                <button id="mic-btn" type="button" title="Micro" class="text-paper-white hover:text-sunbeam-yellow transition-colors">
                  <span id="mic-icon" class="material-symbols-outlined text-[20px]">mic</span>
                </button>
                <button id="deafen-btn" type="button" title="Ensordecer" class="text-paper-white hover:text-sunbeam-yellow transition-colors">
                  <span id="deafen-icon" class="material-symbols-outlined text-[20px]">headphones</span>
                </button>
              </div>
              <div id="mic-menu" class="hidden absolute right-0 top-full mt-2 w-60 bg-paper-white rounded-card shadow-pill p-4 z-20">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-heading-sm text-carbon font-bold">Micro</span>
                  <span class="text-caption text-slate-gray" id="voice-status">Voz en fase 5</span>
                </div>
                <button id="mic-toggle" type="button" class="w-full flex items-center justify-between bg-fog rounded-card px-4 py-2 text-body-sm text-carbon hover:bg-surface-container transition-colors">
                  <span class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">mic</span> Sonido</span>
                  <span id="mic-state" class="font-bold text-electric-violet">ACTIVO</span>
                </button>
              </div>
            </div>
            <a id="leave-btn" href="/" class="text-body-sm text-paper-white hover:text-sunbeam-yellow transition-colors flex items-center gap-2 shrink-0">
              <span class="material-symbols-outlined text-[18px]">logout</span> Salir
            </a>
          </div>
        </div>
      </header>
      <main class="flex-1 w-full max-w-[1200px] mx-auto px-10 py-7">
        <div id="lobby-layout" class="grid grid-cols-1 lg:grid-cols-12 gap-7">
          <section id="left-col" class="lg:col-span-8 flex flex-col gap-6">            <div id="lobby-state" class="bg-surface-container rounded-card px-6 py-2 text-subheading text-carbon font-bold">
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
              <p id="chat-error" class="hidden text-body-sm text-error font-bold mb-2"></p>
              <div id="chat-log" class="space-y-3 max-h-72 overflow-y-auto"></div>
              <p id="chat-empty" class="text-caption text-slate-gray mt-1">Sin mensajes aún. Coordiná el corte por voz.</p>
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
          <div id="splitter" class="hidden lg:block w-1.5 shrink-0 cursor-col-resize bg-outline-variant rounded-full hover:bg-electric-violet transition-colors self-stretch"></div>
          <aside id="right-col" class="lg:col-span-4 flex flex-col gap-7">
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
              <p id="start-hint" class="text-center text-caption text-slate-gray mt-4">Esperando al menos 2 jugadores...</p>
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
        <div id="locked-out" class="hidden fixed inset-0 z-50 bg-surface/90 backdrop-blur flex items-center justify-center px-10">
          <div class="bg-paper-white rounded-card shadow-pill p-10 max-w-md w-full text-center">
            <span class="material-symbols-outlined text-[56px] text-sunbeam-yellow">lock</span>
            <h2 class="text-display text-carbon">Partida en curso</h2>
            <p class="text-body-sm text-on-surface-variant mt-2">La sala ya comenzó y no acepta más jugadores.</p>
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
  const roomTitleEl = document.getElementById("room-id");
  const roomCodeEl = document.getElementById("room-code");
  const copyBtn = document.getElementById("copy-code");
  const micBtn = document.getElementById("mic-btn");
  const micMenuEl = document.getElementById("mic-menu");
  const micIconEl = document.getElementById("mic-icon");
  const micToggle = document.getElementById("mic-toggle");
  const micStateEl = document.getElementById("mic-state");
  const deafenBtn = document.getElementById("deafen-btn");
  const deafenIconEl = document.getElementById("deafen-icon");
  const voiceStatusEl = document.getElementById("voice-status");

  const code = roomId.slice(roomId.indexOf("-") + 1);
  if (roomCodeEl) roomCodeEl.textContent = code;

  if (!roomNameArg) {
    client.subscribeIndexRooms((rooms) => {
      const match = rooms.find((r) => r.id === roomId);
      if (!match) return;
      roomName = match.name;
      if (roomTitleEl) roomTitleEl.textContent = `Operación: ${escapeHtml(match.name)}`;
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      void copyRoomCode(copyBtn, code);
    });
  }

  const voice = new VoiceChannel();
  let micMuted = true;
  let deafened = false;
  let speakingIds = new Set<string>();
  const speakingDotEls = new Map<string, HTMLElement>();

  function updateVoiceStatusUI(): void {
    if (!voiceStatusEl) return;
    const s = voice.getStatus();
    if (!VoiceChannel.isAvailable() || s === "offline") {
      voiceStatusEl.textContent = "Voz no disponible";
    } else if (s === "connecting") {
      voiceStatusEl.textContent = "Conectando...";
    } else if (s === "connected" && voice.getPlayback() !== "playing") {
      voiceStatusEl.textContent = "Clic para activar el audio";
    } else if (s === "connected") {
      voiceStatusEl.textContent = "Conectado";
    } else {
      voiceStatusEl.textContent = "Error de conexión";
    }
  }

  function refreshAudio(): void {
    if (!micIconEl || !micStateEl || !deafenIconEl) return;
    const muted = micMuted || deafened;
    micIconEl.textContent = muted ? "mic_off" : "mic";
    micIconEl.classList.toggle("text-error", muted);
    micStateEl.textContent = muted ? "MUTE" : "ACTIVO";
    micStateEl.classList.toggle("text-error", muted);
    micStateEl.classList.toggle("text-electric-violet", !muted);
    deafenIconEl.textContent = deafened ? "hearing_disabled" : "headphones";
    deafenIconEl.classList.toggle("text-error", deafened);
  }

  if (micBtn && micMenuEl) {
    micBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      micMenuEl.classList.toggle("hidden");
    });
    document.addEventListener("click", () => micMenuEl.classList.add("hidden"));
  }
  if (micToggle) {
    micToggle.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (voice.getStatus() !== "connected") {
        updateVoiceStatusUI();
        return;
      }
      micMuted = !micMuted;
      refreshAudio();
      const ok = await voice.setMicEnabled(!micMuted);
      if (!ok) {
        micMuted = !micMuted;
        refreshAudio();
        if (voiceStatusEl) {
          voiceStatusEl.textContent = "Permiso de micrófono denegado";
          window.setTimeout(() => updateVoiceStatusUI(), 4000);
        }
      }
    });
  }
  if (deafenBtn) {
    deafenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deafened = !deafened;
      refreshAudio();
      voice.setDeafen(deafened);
    });
  }

  function unlockAudio(): void {
    if (voice.getPlayback() === "playing") return;
    void voice.startAudio();
  }

  voice.subscribeStatus((s) => {
    updateVoiceStatusUI();
    if (s === "connected") {
      window.addEventListener("pointerdown", unlockAudio);
      window.addEventListener("click", unlockAudio);
    }
  });
  voice.subscribePlayback(updateVoiceStatusUI);
  voice.subscribeMic((on) => {
    micMuted = !on;
    refreshAudio();
  });
  voice.subscribeSpeakers((ids) => {
    speakingIds = new Set(ids);
    for (const [id, dot] of speakingDotEls) {
      dot.classList.toggle("visible", speakingIds.has(id));
    }
  });
  refreshAudio();

  let announced = false;
  let judgeAnnounced = false;
  let started = false;
  let judgeId: string | null = null;
  let hostId: string | null = null;
  let selfRole: Role | null = null;
  let cleanup: (() => void) | null = null;
  const lastSeen = new Map<string, number>();

  function buildMeta(
    host: boolean,
    role: Role | null
  ): { userId: string; name: string; host: boolean; role: Role | null } {
    return { userId: selfUserId, name: username, host, role };
  }

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
    if (player.host || player.id === hostId) return "Host de operación";
    return "Operativo";
  }

  function renderPlayers(list: { id: string; name: string; host: boolean }[]): void {
    if (!playersEl) return;
    playersEl.replaceChildren();
    speakingDotEls.clear();
    const selfId = client.getSelfId();
    const merged = [...list];
    if (selfId && !merged.some((p) => p.id === selfId)) {
      merged.unshift({ id: selfId, name: username, host: isHost });
    }
    for (const p of merged.slice(0, ROOM_CAPACITY)) {
      const card = document.createElement("div");
      card.className =
        "bg-surface-highest rounded-card p-4 flex items-center justify-between border-l-[6px] border-electric-violet";
      const icon = p.host || p.id === hostId ? "host" : "person";
      card.innerHTML = `
        <div class="flex items-center gap-4 min-w-0">
          <div class="w-12 h-12 bg-sunbeam-yellow rounded-full flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-carbon">${icon}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-bold text-body text-carbon leading-none truncate">${escapeHtml(p.name)} <span class="squad-speaking" title="Hablando"></span></p>
            <p class="text-caption text-slate-gray">${statusBadge(p)}</p>
            <div class="user-vol-row mt-1 flex items-center gap-2 ${p.id === selfId ? "hidden" : ""}">
              <button type="button" class="user-mute-btn shrink-0 text-slate-gray hover:text-error transition-colors" title="Mutear">
                <span class="material-symbols-outlined text-[16px]">volume_up</span>
              </button>
              <input type="range" min="0" max="100" value="100" class="user-vol-slider flex-1 min-w-0" />
            </div>
          </div>
        </div>
        <span class="font-bold text-caption text-electric-violet shrink-0">${p.id === judgeId ? "DIRECTOR" : started ? "EN CAMPO" : "LISTO"}</span>
      `;
      const dot = card.querySelector<HTMLElement>(".squad-speaking");
      if (dot) {
        dot.classList.toggle("visible", speakingIds.has(p.id));
        speakingDotEls.set(p.id, dot);
      }
      if (p.id !== selfId) {
        const muteBtn = card.querySelector<HTMLButtonElement>(".user-mute-btn");
        const slider = card.querySelector<HTMLInputElement>(".user-vol-slider");
        if (muteBtn && slider) {
          const apply = (eff: number): void => {
            slider.value = String(Math.round(eff * 100));
            const muted = eff === 0;
            const iconEl = muteBtn.querySelector(".material-symbols-outlined");
            if (iconEl) iconEl.textContent = muted ? "volume_off" : "volume_up";
            muteBtn.classList.toggle("text-error", muted);
          };
          apply(voice.getUserVolume(p.id));
          slider.addEventListener("input", () => {
            const v = Number(slider.value) / 100;
            voice.setUserVolume(p.id, v);
            voice.muteUser(p.id, v === 0);
            apply(v);
          });
          muteBtn.addEventListener("click", () => {
            const eff = voice.getUserVolume(p.id);
            voice.muteUser(p.id, eff !== 0);
            apply(voice.getUserVolume(p.id));
          });
        }
      }
      playersEl.appendChild(card);
    }
    for (let i = merged.length; i < ROOM_CAPACITY; i++) {
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
    if (squadCountEl) squadCountEl.textContent = `${merged.length} / ${ROOM_CAPACITY}`;
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
      who.className = `font-bold shrink-0 ${self ? "text-carbon" : "text-electric-violet"}`;
      who.textContent = self ? "Tú:" : `${name}:`;
      const msg = document.createElement("p");
      msg.className = self
        ? "text-body-sm text-carbon bg-surface-high rounded-card px-3 py-1"
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
      return;
    }
    const count = activePlayers().length;
    if (count >= MIN_PLAYERS_TO_START && judgeId) {
      statusEl.textContent = "Juez elegido. Esperando que el host inicie...";
    } else if (count >= MIN_PLAYERS_TO_START) {
      statusEl.textContent = "¡Jugadores suficientes! Designando juez...";
    } else {
      statusEl.textContent = `Esperando jugadores (${count}/${ROOM_CAPACITY})...`;
    }
  }

  function updateStartArea(): void {
    const count = activePlayers().length;
    const full = count >= MIN_PLAYERS_TO_START;
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
        ? "Equipo mínimo listo. ¡Inicia la operación!"
        : full
          ? "Designando juez..."
          : `Esperando al menos 2 jugadores (${count}/${ROOM_CAPACITY})...`;
    }
  }

  function applyJudge(id: string): void {
    judgeId = id;
    judgeAnnounced = true;
    selfRole = id === client.getSelfId() ? "judge" : "cutter";
    client.setMeta(buildMeta(isUrlHost, selfRole));
    updateLobbyBanner();
    updateStartArea();
  }

  function applyStart(): void {
    started = true;
    mountByRole(selfRole ?? "cutter");
    updateLobbyBanner();
    const comms = document.getElementById("comms");
    const startArea = document.getElementById("start-area");
    if (comms && startArea) startArea.before(comms);
    lobbyLayoutEl?.classList.add("lg:flex", "lg:flex-row", "lg:items-stretch");
    lobbyLayoutEl?.classList.remove("lg:grid-cols-12", "lg:gap-7");
    leftCol?.classList.add("lg:flex-1", "lg:min-w-0");
    leftCol?.classList.remove("lg:col-span-8", "lg:col-span-9");
    rightCol?.classList.add("lg:shrink-0", "lg:min-w-0", "lg:w-[var(--panel-w)]");
    rightCol?.classList.remove("lg:col-span-4", "lg:col-span-3");
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
    if (!isHost || announced || judgeId) return;
    const players = activePlayers();
    if (players.length < MIN_PLAYERS_TO_START) return;
    announced = true;
    const judge = players[Math.floor(Math.random() * players.length)];
    applyJudge(judge.id);
    void client.sendEvent({ type: "judge", judgeId: judge.id });
  }

  function cedeHost(to: string): void {
    isHost = false;
    hostId = to;
    client.setMeta(buildMeta(false, selfRole));
    stopPublish();
    updateStartArea();
    updateLobbyBanner();
  }

  function recomputeHost(): void {
    const selfId = client.getSelfId();
    if (!selfId) return;
    const active = activePlayers();
    const explicit = active.find((p) => p.host);

    if (isHost) {
      if (isUrlHost) return;
      if (explicit && explicit.id !== selfId) {
        cedeHost(explicit.id);
        return;
      }
      const smaller = active.find((p) => p.id < selfId);
      if (smaller) {
        cedeHost(smaller.id);
        return;
      }
      hostId = selfId;
      return;
    }

    if (explicit) {
      hostId = explicit.id;
      return;
    }
    if (hostId !== null && active.some((p) => p.id === hostId)) return;
    hostId =
      active.length > 0
        ? active.reduce((m, p) => (p.id < m.id ? p : m)).id
        : null;
    if (hostId === selfId) {
      isHost = true;
      client.setMeta(buildMeta(false, selfRole));
      ensurePublish();
      updateStartArea();
      updateLobbyBanner();
      maybeAnnounceJudge();
    }
  }

  client.subscribeStatus((s) => {
    if (s === "ready") {
      updateStartArea();
      const selfId = client.getSelfId();
      if (selfId && !voice.getStatus().match(/connecting|connected/)) {
        void voice.connect(roomId, selfId, username);
      }
    }
  });

  client.subscribePresence((list) => {
    for (const p of list) lastSeen.set(p.id, Date.now());
    recomputeHost();
    renderPlayers(list);
    updateLobbyBanner();
    updateStartArea();
    maybeAnnounceJudge();
    if (isHost) publish();
  });

  let publishInterval: ReturnType<typeof setInterval> | null = null;

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

  function ensurePublish(): void {
    if (!isHost || publishInterval) return;
    publish();
    publishInterval = setInterval(publish, 5000);
  }

  function stopPublish(): void {
    if (publishInterval) clearInterval(publishInterval);
    publishInterval = null;
  }

  ensurePublish();

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
        voice.dispose();
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
    const selfId = client.getSelfId();
    const stale = [...lastSeen.entries()]
      .filter(([id, t]) => id !== selfId && now - t > ALIVE_TIMEOUT_MS)
      .map(([id]) => id);
    if (stale.length === 0) return;
    for (const id of stale) lastSeen.delete(id);
    recomputeHost();
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
    voice.dispose();
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
