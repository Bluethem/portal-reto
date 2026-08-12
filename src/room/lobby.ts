import { joinRoom } from "../portal/client";
import type { ChatEntry, PlayerInfo, Role } from "../portal/types";
import { getUserId } from "../shared/identity";
import { getUsername } from "../shared/username";
import { getProfileColor } from "../shared/profile";
import { mountBoard } from "../board/board";
import { mountDirector } from "../director/director";
import { VoiceChannel } from "./voice";
import { crewmateSvg } from "../ui/crewmate";
import { startLobbyMusic, stopMusic, mountMusicToggle, MUSIC_TOGGLE_HTML } from "../ui/music";
import { playC4Beep, playClick, playExplosion, playJoin, playLeave, playReady, playStart } from "../ui/sound";
import { mountSidebarProfile, renderMobileNav, renderSidebar, updateSidebarProfile } from "../ui/shell";
import type { ShellItem } from "../ui/shell";
import { reglasHtml } from "../ui/reglas";
import { spaceBackdrop } from "../ui/space";
import { CREW_COLORS } from "../ui/crew-colors";
import { burst, chatIn, pop, slidePanel, staggerIn } from "../ui/anim";

const ROOM_CAPACITY = 4;
const MIN_PLAYERS_TO_START = 2;
const ALIVE_INTERVAL_MS = 1000;
const ALIVE_TIMEOUT_MS = 3000;
const JOIN_GRACE_MS = 2500;
const JOIN_GRACE_MAX = 3;
const ROOM_ITEMS: ShellItem[] = [
  { label: "Rooms", icon: "meeting_room", href: "/" },
  { label: "Room", icon: "cable", view: "room" },
  { label: "Reglas", icon: "menu_book", view: "reglas" },
];

export function bootRoom(roomId: string, isHostArg: boolean, roomNameArg: string): void {
  const root = document.getElementById("app");
  if (!root) return;

  let username = getUsername() ?? "anon";
  const isUrlHost = isHostArg;
  let isHost = isHostArg;
  const selfUserId = getUserId();
  let roomName = roomNameArg || roomId;
  const client = joinRoom(roomId, { userId: selfUserId, name: username, host: isHost, role: null, color: getProfileColor() });

  root.innerHTML = `
    <div class="min-h-screen flex flex-col lg:flex-row bg-surface text-on-surface relative overflow-hidden">
      ${spaceBackdrop()}
      ${renderSidebar(username, ROOM_ITEMS, "room", { footerSlot: MUSIC_TOGGLE_HTML })}
      <main class="relative z-10 flex-1 h-screen flex flex-col overflow-hidden">
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
        <div class="relative flex-1 min-h-0 overflow-y-auto px-6 lg:px-10 pt-6 pb-32 lg:pb-6">
          <div class="relative z-10 max-w-[1600px] mx-auto h-full min-h-0 flex flex-col">
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
                    <span class="inline-block">Iniciar partida</span>
                  </button>
                  <p id="start-hint" class="text-center text-caption text-on-surface-variant uppercase mt-4">Esperando al menos 2 jugadores...</p>
                </div>
              </section>
              <section id="chat-col" class="flex flex-col h-80 lg:h-auto lg:w-[280px] xl:w-[340px] lg:shrink-0 min-h-0">
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
          <p class="text-body-sm text-on-surface-variant uppercase mt-2">La sala está completa o ya no acepta más jugadores.</p>
          <a href="/" class="pressed block mt-7 w-full bg-primary text-on-primary text-body font-bold py-3 rounded-full border-4 border-black block-shadow transition-colors uppercase">
            Volver al menú
          </a>
        </div>
      </div>
      <div id="kicked" class="hidden fixed inset-0 z-[60] bg-surface/90 backdrop-blur flex items-center justify-center px-6">
        <div class="bg-surface-container border-8 border-black rounded-xl block-shadow-md p-10 max-w-md w-full text-center">
          <span class="material-symbols-outlined text-[56px] text-error">block</span>
          <h2 class="text-display font-display text-on-surface uppercase">Fuiste expulsado</h2>
          <p class="text-body-sm text-on-surface-variant uppercase mt-2">El host te sacó de la sala.</p>
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
      <div id="resume-toast" class="hidden fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-tertiary text-on-tertiary border-4 border-black rounded-full px-5 py-2 text-body-sm font-bold uppercase block-shadow whitespace-nowrap">
        Partida en curso · entraste como <span id="resume-role">cortador</span>
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
  mountSidebarProfile(() => {
    username = getUsername() ?? username;
    updateSidebarProfile(username, getProfileColor());
    const userNameEl = document.getElementById("user-name");
    if (userNameEl) userNameEl.textContent = username;
    renderPlayers(activePlayers());
    client.setMeta(buildMeta(isHost, selfRole));
  });

  let announced = false;
  let judgeAnnounced = false;
  let started = false;
  let judgeId: string | null = null;
  let hostId: string | null = null;
  let selfRole: Role | null = null;
  let cleanup: (() => void) | null = null;
  const lastSeen = new Map<string, number>();
  const cardColors = new Map<string, string>();
  const kickedIds = new Set<string>();
  let judgeCelebrate: string | null = null;

  function buildMeta(
    host: boolean,
    role: Role | null
  ): { userId: string; name: string; host: boolean; role: Role | null; color: string } {
    return { userId: selfUserId, name: username, host, role, color: getProfileColor() };
  }

  function activePlayers(): PlayerInfo[] {
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
    if (started) return "Crewmate";
    if (player.host || player.id === hostId) return "Host de operación";
    return "Crewmate";
  }

  const seenPlayerIds = new Set<string>();

  function renderPlayers(list: PlayerInfo[]): void {
    if (!playersEl) return;
    const visible = list.filter((p) => !kickedIds.has(p.id));
    const ids = new Set(visible.map((p) => p.id));
    if (seenPlayerIds.size > 0) {
      for (const id of ids) if (!seenPlayerIds.has(id)) playJoin();
      for (const id of seenPlayerIds) if (!ids.has(id)) playLeave();
    }
    if (!started && list.length === ROOM_CAPACITY && seenPlayerIds.size < ROOM_CAPACITY) playReady();
    const prev = new Set(seenPlayerIds);
    seenPlayerIds.clear();
    for (const id of ids) seenPlayerIds.add(id);
    playersEl.replaceChildren();
    speakingDotEls.clear();
    const selfId = client.getSelfId();
    const merged = [...visible];
    if (selfId && !merged.some((p) => p.id === selfId)) {
      merged.unshift({ id: selfId, name: username, host: isHost, color: getProfileColor() });
    }
    const fresh: HTMLElement[] = [];
    for (const [i, p] of merged.slice(0, ROOM_CAPACITY).entries()) {
      const color = p.color ?? CREW_COLORS[i % CREW_COLORS.length];
      cardColors.set(p.id, color);
      const card = document.createElement("div");
      card.dataset.pid = p.id;
      card.className =
        "player-slot relative overflow-hidden border-8 border-black rounded-2xl p-4 flex flex-col gap-2 bg-surface-container/85";
      const badge = p.id === judgeId ? "DIRECTOR" : started ? "CREWMATE" : "READY";
      const badgeColor = p.id === judgeId
        ? "bg-tertiary text-on-tertiary"
        : started
          ? "bg-secondary text-on-secondary"
          : "bg-surface-variant text-on-surface border-dashed opacity-80";
      card.innerHTML = `
        <div class="slot-glow absolute inset-0" style="background: radial-gradient(circle at 50% -20%, ${color}59, transparent 70%);"></div>
        <div class="relative z-10 flex items-center gap-3">
          <div class="w-14 h-16 shrink-0 flex items-center justify-center">${crewmateSvg(color, 46)}</div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-body text-on-surface leading-none truncate">${escapeHtml(p.name)} <span class="squad-speaking" title="Hablando"></span></p>
            <p class="text-caption text-on-surface-variant mt-0.5 uppercase">${statusBadge(p)}</p>
          </div>
          ${isHost && p.id !== selfId
            ? `<button type="button" class="kick-btn shrink-0 w-7 h-7 flex items-center justify-center rounded-full border-4 border-black bg-surface-high text-error hover:bg-error hover:text-on-error transition-colors" title="Expulsar a ${escapeHtml(p.name)}"><span class="material-symbols-outlined text-[14px]">block</span></button>`
            : ""}
          <span class="slot-badge ${badgeColor} px-2 py-0.5 border-2 border-black rounded text-caption uppercase shrink-0">${badge}</span>
        </div>
        <div class="user-vol-row relative z-10 mt-1 flex items-center gap-2 ${p.id === selfId ? "hidden" : ""}">
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
      const kickBtn = card.querySelector<HTMLButtonElement>(".kick-btn");
      if (kickBtn) {
        kickBtn.addEventListener("click", () => {
          playClick();
          void client.sendEvent({ type: "kick", targetId: p.id });
        });
      }
      if (!prev.has(p.id)) fresh.push(card);
      playersEl.appendChild(card);
    }
    for (let i = merged.length; i < ROOM_CAPACITY; i++) {
      const color = CREW_COLORS[i % CREW_COLORS.length];
      const empty = document.createElement("div");
      empty.className =
        "player-slot player-slot-empty relative overflow-hidden border-8 border-dashed border-black rounded-2xl p-4 flex items-center justify-center gap-3 h-[88px] opacity-70 bg-surface-high/40";
      empty.innerHTML = `
        <div class="w-14 h-16 shrink-0 flex items-center justify-center" style="filter:grayscale(1) opacity(.55)">${crewmateSvg(color, 46)}</div>
        <p class="text-caption text-on-surface-variant uppercase flex items-center gap-2">
          <span class="material-symbols-outlined">person_add</span>
          Esperando jugador...
        </p>
      `;
      playersEl.appendChild(empty);
    }
    if (squadCountEl) squadCountEl.textContent = `${merged.length} / ${ROOM_CAPACITY}`;
    staggerIn(fresh);
    if (judgeCelebrate) {
      for (const child of playersEl.children) {
        const slot = child as HTMLElement;
        if (slot.dataset.pid !== judgeCelebrate) continue;
        const badgeEl = slot.querySelector<HTMLElement>(".slot-badge");
        if (badgeEl) pop(badgeEl);
        burst(slot, cardColors.get(judgeCelebrate) ?? "#cdcd00");
        break;
      }
      judgeCelebrate = null;
    }
  }

  let chatErrorTimer: ReturnType<typeof setTimeout> | null = null;

  function renderChat(entries: ChatEntry[]): void {
    if (!chatLogEl) return;
    if (chatEmptyEl) chatEmptyEl.classList.toggle("hidden", entries.length > 0);
    chatLogEl.replaceChildren();
    const rows: HTMLElement[] = [];
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
      rows.push(row);
      chatLogEl.appendChild(row);
    }
    chatIn(rows);
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
    judgeCelebrate = id;
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
    requestAnimationFrame(() => {
      if (boardCol) slidePanel(boardCol, 36);
      if (squadCol) slidePanel(squadCol, -36);
      const stageEl = document.getElementById("stage");
      if (stageEl) burst(stageEl, "#a4ffe8", 14);
    });
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
    for (const p of list) {
      if (!kickedIds.has(p.id)) lastSeen.set(p.id, Date.now());
    }
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
    if (e.type === "kick") {
      if (e.targetId === client.getSelfId()) {
        showKicked();
      } else {
        kickedIds.add(e.targetId);
        lastSeen.delete(e.targetId);
        renderPlayers(activePlayers());
        updateLobbyBanner();
        updateStartArea();
        if (isHost) publish();
      }
    }
  });

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      playClick();
      const label = startBtn.querySelector<HTMLElement>("span");
      if (label) pop(label);
      if (judgeAnnounced) {
        applyStart();
        void client.sendEvent({ type: "start" });
      }
    });
  }

  let lockedOut = false;
  let lastBeepSecs = -1;
  let lossSounded = false;
  let joinGraceTimer: ReturnType<typeof setTimeout> | null = null;
  let joinGraceCycles = 0;

  function scheduleJoinGrace(): void {
    if (joinGraceTimer) return;
    joinGraceTimer = setTimeout(() => {
      joinGraceTimer = null;
      joinGraceCycles++;
      const st = client.getState();
      const free = st !== null && st.status === "playing" && (st.members ?? []).length < ROOM_CAPACITY;
      if (started) return;
      if (free && joinGraceCycles < JOIN_GRACE_MAX) {
        scheduleJoinGrace();
        return;
      }
      if (!lockedOut) {
        lockedOut = true;
        if (lockedOutEl) lockedOutEl.classList.remove("hidden");
        voice.dispose();
        client.release();
      }
    }, JOIN_GRACE_MS);
  }

  function showResumeToast(): void {
    const toast = document.getElementById("resume-toast");
    if (!toast) return;
    const roleEl = document.getElementById("resume-role");
    if (roleEl) roleEl.textContent = selfRole === "judge" ? "director" : "cortador";
    toast.classList.remove("hidden");
    window.setTimeout(() => toast.classList.add("hidden"), 3200);
  }

  let kicked = false;
  function showKicked(): void {
    if (kicked) return;
    kicked = true;
    stopMusic();
    clearInterval(aliveInterval);
    clearInterval(pruneInterval);
    voice.dispose();
    client.release();
    const kickedEl = document.getElementById("kicked");
    if (kickedEl) kickedEl.classList.remove("hidden");
    window.setTimeout(() => {
      window.location.href = "/";
    }, 5000);
  }

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
          showResumeToast();
        } else {
          if (!lossSounded) {
            lossSounded = true;
            playExplosion();
          }
          if (gameoverEl && goLevelEl) {
            goLevelEl.textContent = String(s.level);
            gameoverEl.classList.remove("hidden");
          }
          return;
        }
      } else if (selfId) {
        const members = s.members ?? [];
        if (s.status === "playing" && members.length < ROOM_CAPACITY && joinGraceCycles < JOIN_GRACE_MAX) {
          scheduleJoinGrace();
        } else if (!lockedOut) {
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
    if (s.status === "playing") {
      const secs = Math.max(0, Math.round(s.timerMs / 1000));
      if (secs > 0 && secs <= 60 && secs !== lastBeepSecs) {
        lastBeepSecs = secs;
        playC4Beep();
        if (secs <= 10) window.setTimeout(() => playC4Beep(), 300);
      }
    }
    if (s.status === "finished") {
      if (!lossSounded) {
        lossSounded = true;
        playExplosion();
      }
      if (timerEl) timerEl.textContent = "00:00";
      if (gameoverEl && goLevelEl) {
        goLevelEl.textContent = String(s.level);
        gameoverEl.classList.remove("hidden");
        const icon = gameoverEl.querySelector<HTMLElement>(".material-symbols-outlined");
        if (icon) burst(icon, "#ff5252", 18);
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
    for (const id of users) {
      if (!kickedIds.has(id)) lastSeen.set(id, now);
    }
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
