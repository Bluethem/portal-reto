import { joinRoom } from "../portal/client";
import type { ChatEntry, Role } from "../portal/types";
import { getUserId } from "../shared/identity";
import { getUsername } from "../shared/username";
import { mountBoard } from "../board/board";
import { mountDirector } from "../director/director";
import { VoiceChannel } from "./voice";
import { crewmateSvg } from "../ui/crewmate";
import { startLobbyMusic, stopMusic, mountMusicToggle, MUSIC_TOGGLE_HTML } from "../ui/music";
import { playClick, playJoin, playLeave, playReady, playStart } from "../ui/sound";
import { renderMobileNav, renderSidebar } from "../ui/shell";
import type { ShellItem } from "../ui/shell";
import { reglasHtml } from "../ui/reglas";

const ROOM_CAPACITY = 4;
const MIN_PLAYERS_TO_START = 2;
const ALIVE_INTERVAL_MS = 1000;
const ALIVE_TIMEOUT_MS = 3000;
const CREW_COLORS = ["#ffb4a9", "#2196f3", "#4caf50", "#cdcd00", "#a4ffe8", "#c51111"];
const ROOM_ITEMS: ShellItem[] = [
  { label: "Rooms", icon: "meeting_room", href: "/" },
  { label: "Room", icon: "cable", view: "room" },
  { label: "Reglas", icon: "menu_book", view: "reglas" },
];

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
    <div class="min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface">
      ${renderSidebar(username, ROOM_ITEMS, "room", { footerSlot: MUSIC_TOGGLE_HTML })}
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
        <div class="flex-1 min-h-0 overflow-y-auto px-6 lg:px-10 py-6">
          <div class="max-w-[1600px] mx-auto h-full min-h-0 flex flex-col">
            <div id="lobby-heading" class="flex flex-col md:flex-row justify-between items-end gap-4 border-b-4 border-outline-variant pb-4">
              <div>
                <h2 class="text-display font-display text-secondary uppercase stroke-heavy">Sala de Espera</h2>
                <p class="text-body-sm text-on-surface-variant uppercase mt-1">Código: <span class="bg-surface-high px-2 py-1 rounded border-2 border-black font-mono tracking-widest text-tertiary">${escapeHtml(roomId.slice(roomId.indexOf("-") + 1))}</span></p>
              </div>
              <div id="lobby-state" class="text-right text-heading-sm text-primary font-bold uppercase animate-pulse">
                Esperando jugadores...
              </div>
            </div>
            <div id="lobby-layout" class="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 mt-6 lg:justify-center lg:items-start">
              <section id="squad-col" class="flex flex-col gap-4 lg:w-[280px] xl:w-[320px] lg:shrink-0 min-h-0">
                <div id="hud" class="hidden bg-surface-container border-4 border-black rounded-xl block-shadow-md p-2 flex items-center justify-between gap-2">
                  <span id="level" class="text-body-sm font-display text-secondary uppercase">Nivel 1</span>
                  <span id="progress" class="text-caption text-on-surface-variant uppercase">Cortes 0/0</span>
                  <span id="timer" class="text-body font-display font-bold text-primary uppercase">--:--</span>
                </div>
                <div class="flex justify-between items-end">
                  <h2 class="text-heading font-display text-primary uppercase">Squad</h2>
                  <span id="squad-count" class="text-subheading text-secondary">0 / 4</span>
                </div>
                <div id="players" class="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto"></div>
                <div id="start-area" class="mt-auto pt-4">
                  <button
                    id="start-btn"
                    disabled
                    class="pressed w-full bg-secondary text-on-secondary text-heading-sm font-bold py-6 rounded-2xl border-8 border-black block-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Iniciar partida
                  </button>
                  <p id="start-hint" class="text-center text-caption text-on-surface-variant uppercase mt-4">Esperando al menos 2 jugadores...</p>
                </div>
              </section>
              <section id="chat-col" class="flex flex-col lg:w-[280px] xl:w-[340px] lg:shrink-0 min-h-0">
                <div id="comms" class="flex flex-col flex-1 min-h-0 bg-surface-container border-8 border-black rounded-xl block-shadow-md p-6 relative">
                  <h3 class="text-heading-sm font-display text-secondary uppercase mb-2">Comms tácticas</h3>
                  <p id="chat-error" class="hidden text-body-sm text-error font-bold mb-2"></p>
                  <div id="chat-log" class="flex-1 min-h-0 space-y-3 overflow-y-auto font-mono text-sm py-2"></div>
                  <p id="chat-empty" class="text-caption text-on-surface-variant uppercase mt-1">Sin mensajes aún. Coordiná el corte por voz.</p>
                  <form id="chat-form" class="mt-4 relative">
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
              <section id="board-col" class="hidden flex-col lg:flex-1 lg:min-w-0 min-h-0">
                <div id="stage" class="flex-1 min-h-0"></div>
              </section>
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
      <div id="reglas-modal" class="hidden fixed inset-0 z-[55] bg-surface/90 backdrop-blur flex items-center justify-center px-6">
        <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-8 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto">
          <button id="reglas-close" type="button" class="absolute top-3 right-3 text-on-surface-variant hover:text-error transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
          ${reglasHtml()}
        </div>
      </div>
      ${renderMobileNav(ROOM_ITEMS, "room")}
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
  const boardCol = document.getElementById("board-col");
  const squadCol = document.getElementById("squad-col");
  const lobbyLayoutEl = document.getElementById("lobby-layout");
  const roomTitleEl = document.getElementById("room-id");
  const roomCodeEl = document.getElementById("room-code");
  const copyBtn = document.getElementById("copy-code");
  const micBtn = document.getElementById("mic-btn");
  const micIconEl = document.getElementById("mic-icon");
  const deafenBtn = document.getElementById("deafen-btn");
  const deafenIconEl = document.getElementById("deafen-icon");

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
      playClick();
      void copyRoomCode(copyBtn, code);
    });
  }

  const reglasModalEl = document.getElementById("reglas-modal");
  function toggleReglas(open: boolean): void {
    if (reglasModalEl) reglasModalEl.classList.toggle("hidden", !open);
  }
  document.querySelectorAll<HTMLElement>('[data-view="reglas"]').forEach((el) => {
    el.addEventListener("click", () => {
      playClick();
      toggleReglas(true);
    });
  });
  document.getElementById("reglas-close")?.addEventListener("click", () => toggleReglas(false));
  reglasModalEl?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) toggleReglas(false);
  });

  const voice = new VoiceChannel();
  let micMuted = true;
  let deafened = false;
  let speakingIds = new Set<string>();
  const speakingDotEls = new Map<string, HTMLElement>();

  function refreshAudio(): void {
    if (!micIconEl || !deafenIconEl) return;
    const connected = voice.getStatus() === "connected";
    const muted = micMuted || deafened || !connected;
    micIconEl.textContent = muted ? "mic_off" : "mic";
    micIconEl.classList.toggle("text-error", muted);
    micIconEl.classList.toggle("text-on-surface", !muted);
    deafenIconEl.textContent = deafened ? "hearing_disabled" : "headphones";
    deafenIconEl.classList.toggle("text-error", deafened);
    deafenIconEl.classList.toggle("text-on-surface", !deafened);
  }

  if (micBtn) {
    micBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      playClick();
      if (voice.getStatus() !== "connected") {
        refreshAudio();
        return;
      }
      micMuted = !micMuted;
      refreshAudio();
      const ok = await voice.setMicEnabled(!micMuted);
      if (!ok) {
        micMuted = !micMuted;
        refreshAudio();
      }
    });
  }
  if (deafenBtn) {
    deafenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      playClick();
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
    refreshAudio();
    if (s === "connected") {
      window.addEventListener("pointerdown", unlockAudio);
      window.addEventListener("click", unlockAudio);
    }
  });
  voice.subscribePlayback(refreshAudio);
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

  const startMusicOnce = () => {
    startLobbyMusic();
    window.removeEventListener("pointerdown", startMusicOnce);
    window.removeEventListener("keydown", startMusicOnce);
  };
  window.addEventListener("pointerdown", startMusicOnce);
  window.addEventListener("keydown", startMusicOnce);
  mountMusicToggle();

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

  const seenPlayerIds = new Set<string>();

  function renderPlayers(list: { id: string; name: string; host: boolean }[]): void {
    if (!playersEl) return;
    const ids = new Set(list.map((p) => p.id));
    if (seenPlayerIds.size > 0) {
      for (const id of ids) if (!seenPlayerIds.has(id)) playJoin();
      for (const id of seenPlayerIds) if (!ids.has(id)) playLeave();
    }
    if (!started && list.length === ROOM_CAPACITY && seenPlayerIds.size < ROOM_CAPACITY) playReady();
    seenPlayerIds.clear();
    for (const id of ids) seenPlayerIds.add(id);
    playersEl.replaceChildren();
    speakingDotEls.clear();
    const selfId = client.getSelfId();
    const merged = [...list];
    if (selfId && !merged.some((p) => p.id === selfId)) {
      merged.unshift({ id: selfId, name: username, host: isHost });
    }
    for (const [i, p] of merged.slice(0, ROOM_CAPACITY).entries()) {
      const color = CREW_COLORS[i % CREW_COLORS.length];
      const card = document.createElement("div");
      card.className =
        "bg-surface-container-high border-8 border-black rounded-xl p-4 block-shadow flex flex-col relative overflow-hidden";
      const badge = p.id === judgeId ? "DIRECTOR" : started ? "EN CAMPO" : "LISTO";
      const badgeColor = p.id === judgeId
        ? "bg-tertiary text-on-tertiary"
        : started
          ? "bg-secondary text-on-secondary"
          : "bg-surface-variant text-on-surface border-dashed opacity-80";
      card.innerHTML = `
        <div class="absolute inset-0" style="background: ${color}; opacity: 0.08;"></div>
        <div class="relative z-10 flex items-center gap-3">
          <div class="w-14 h-16 shrink-0 flex items-center justify-center">${crewmateSvg(color, 44)}</div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-body text-on-surface leading-none truncate">${escapeHtml(p.name)} <span class="squad-speaking" title="Hablando"></span></p>
            <p class="text-caption text-on-surface-variant mt-0.5 uppercase">${statusBadge(p)}</p>
          </div>
          <span class="${badgeColor} px-2 py-0.5 border-2 border-black rounded text-caption uppercase shrink-0">${badge}</span>
        </div>
        <div class="user-vol-row relative z-10 mt-3 flex items-center gap-2 ${p.id === selfId ? "hidden" : ""}">
          <button type="button" class="user-mute-btn shrink-0 text-on-surface-variant hover:text-error transition-colors" title="Mutear">
            <span class="material-symbols-outlined text-[18px]">volume_up</span>
          </button>
          <input type="range" min="0" max="100" value="100" class="user-vol-slider flex-1 min-w-0" />
        </div>
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

  function switchToGameLayout(): void {
    document.getElementById("lobby-heading")?.classList.add("hidden");
    document.getElementById("start-area")?.classList.add("hidden");
    if (lobbyLayoutEl && boardCol && squadCol) {
      lobbyLayoutEl.prepend(boardCol);
      lobbyLayoutEl.append(squadCol);
    }
    lobbyLayoutEl?.classList.remove("lg:items-start");
    boardCol?.classList.remove("hidden");
    boardCol?.classList.add("flex");
  }

  function applyStart(): void {
    stopMusic();
    playStart();
    started = true;
    mountByRole(selfRole ?? "cutter");
    updateLobbyBanner();
    switchToGameLayout();
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
      const selfId = client.getSelfId();
      const member = selfId && s.members ? s.members.find((m) => m.id === selfId) : undefined;
      if (member) {
        if (s.status === "playing") {
          started = true;
          selfRole = member.role;
          if (member.role === "judge") judgeId = selfId;
          client.setMeta(buildMeta(isUrlHost, selfRole));
          mountByRole(selfRole);
          switchToGameLayout();
          renderPlayers(activePlayers());
        } else {
          if (gameoverEl && goLevelEl) {
            goLevelEl.textContent = String(s.level);
            gameoverEl.classList.remove("hidden");
          }
          return;
        }
      } else if (selfId) {
        if (!lockedOut) {
          lockedOut = true;
          if (lockedOutEl) lockedOutEl.classList.remove("hidden");
          voice.dispose();
          client.release();
        }
        return;
      } else {
        return;
      }
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
