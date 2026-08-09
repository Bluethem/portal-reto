import { Portal } from "@portalsdk/core";
import type { ChannelHandle, ChannelStatus, DetailedPresence } from "@portalsdk/core";
import type {
  ChatEntry,
  ChatMessage,
  CursorMessage,
  PlayerMeta,
  RoomAction,
  RoomContent,
  RoomEvent,
  RoomInfo,
  RoomState,
} from "./types";
import { mintToken } from "../shared/identity";

const apiKey = import.meta.env.PUBLIC_PORTAL_KEY as string;
const portal = new Portal({ apiKey, token: mintToken });

const INDEX_ID = "rooms-index";
const INDEX_TTL_MS = 10_000;

export interface MenuClient {
  getChannelStatus(): ChannelStatus;
  subscribeStatus(cb: (s: ChannelStatus) => void): () => void;
  subscribeRooms(cb: (rooms: RoomInfo[]) => void): () => void;
  getRooms(): RoomInfo[];
}

export interface RoomClient {
  getChannelStatus(): ChannelStatus;
  getSelfId(): string;
  getPlayers(): { id: string; name: string; host: boolean }[];
  subscribeStatus(cb: (s: ChannelStatus) => void): () => void;
  subscribePresence(cb: (players: { id: string; name: string; host: boolean }[]) => void): () => void;
  subscribeEvents(cb: (e: RoomEvent) => void): () => void;
  subscribeChat(cb: (entries: ChatEntry[]) => void): () => void;
  subscribeState(cb: (s: RoomState | null) => void): () => void;
  getState(): RoomState | null;
  sendCut(label: string): Promise<void>;
  subscribeCursor(cb: (c: CursorMessage) => void): () => void;
  sendCursor(x: number, y: number, name: string, userId: string): void;
  subscribeActivity(cb: (users: string[]) => void): () => void;
  sendAlive(): void;
  setMeta(meta: PlayerMeta): void;
  sendEvent(e: RoomEvent): Promise<void>;
  sendChat(text: string, name: string): Promise<void>;
  subscribeIndexRooms(cb: (rooms: RoomInfo[]) => void): () => void;
  publishRoom(info: RoomInfo): Promise<void>;
  release(): void;
}

function roomsFromSnapshot(snap: { messages: readonly { content: RoomInfo }[] }): RoomInfo[] {
  const now = Date.now();
  const byId = new Map<string, RoomInfo>();
  for (const m of snap.messages) {
    if (now - m.content.updatedAt <= INDEX_TTL_MS) byId.set(m.content.id, m.content);
  }
  return [...byId.values()].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, "es");
    return byName !== 0 ? byName : a.id.localeCompare(b.id);
  });
}

export function createMenuClient(): MenuClient {
  const index: ChannelHandle<RoomInfo> = portal.channel<RoomInfo>(INDEX_ID, { history: 50 });
  index.acquire();
  const statusListeners = new Set<(s: ChannelStatus) => void>();
  const roomsListeners = new Set<(rooms: RoomInfo[]) => void>();

  function emit(): void {
    const snap = index.getSnapshot();
    for (const cb of statusListeners) cb(snap.status);
    for (const cb of roomsListeners) cb(roomsFromSnapshot(snap));
  }

  index.subscribe(emit);
  index.on("status", emit);

  return {
    getChannelStatus: () => index.getSnapshot().status,
    subscribeStatus: (cb) => {
      statusListeners.add(cb);
      cb(index.getSnapshot().status);
      return () => statusListeners.delete(cb);
    },
    subscribeRooms: (cb) => {
      roomsListeners.add(cb);
      cb(roomsFromSnapshot(index.getSnapshot()));
      return () => roomsListeners.delete(cb);
    },
    getRooms: () => roomsFromSnapshot(index.getSnapshot()),
  };
}

export function joinRoom(roomId: string, meta: PlayerMeta): RoomClient {
  const room: ChannelHandle<RoomContent | RoomState> = portal.channel<RoomContent | RoomState>(
    `room-${roomId}`,
    { history: 500, metadata: meta as unknown as Record<string, unknown> }
  );
  const actions: ChannelHandle<RoomAction | CursorMessage> = portal.channel<RoomAction | CursorMessage>(`room-${roomId}-actions`, {
    history: 20,
  });
  room.acquire();
  actions.acquire();

  let selfId = "";
  const statusListeners = new Set<(s: ChannelStatus) => void>();
  const presenceListeners = new Set<(p: { id: string; name: string; host: boolean }[]) => void>();
  const eventListeners = new Set<(e: RoomEvent) => void>();
  const chatListeners = new Set<(entries: ChatEntry[]) => void>();
  const cursorListeners = new Set<(c: CursorMessage) => void>();
  const stateListeners = new Set<(s: RoomState | null) => void>();
  const activityListeners = new Set<(users: string[]) => void>();

  function chatHistory(): ChatEntry[] {
    return room
      .getSnapshot()
      .messages.filter(
        (m): m is typeof m & { content: ChatMessage } =>
          "type" in m.content && m.content.type === "chat"
      )
      .map((m) => ({
        id: m.id,
        name: m.content.name,
        text: m.content.text,
        self: m.sender.id === selfId,
        status: m.status,
      }));
  }

  function players(): { id: string; name: string; host: boolean }[] {
    const p = room.getSnapshot().presence as DetailedPresence | undefined;
    if (!p || p.kind !== "detailed") return [];
    const seen = new Set<string>();
    return p.participants
      .filter((x) => x.metadata?.kind !== "agent")
      .filter((x) => {
        const key = (x.metadata?.userId as string | undefined) ?? x.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((x) => ({
        id: (x.metadata?.userId as string | undefined) ?? x.id,
        name: (x.metadata?.name as string | undefined) ?? "?",
        host: (x.metadata?.host as boolean | undefined) ?? false,
      }));
  }

  function emit(): void {
    const snap = room.getSnapshot();
    for (const cb of statusListeners) cb(snap.status);
    for (const cb of presenceListeners) cb(players());
    const chat = chatHistory();
    for (const cb of chatListeners) cb(chat);
    const last = [...snap.messages].reverse().find((m) => "status" in m.content) as
      | { content: RoomState }
      | undefined;
    for (const cb of stateListeners) cb(last?.content ?? null);
  }

  room.on("status", (s) => {
    if (s === "ready") selfId = room.getSnapshot().me?.id ?? "";
    emit();
  });
  room.on("presence", emit);
  room.on("activity", () => {
    for (const cb of activityListeners) cb(activityUsers());
  });
  room.on("message", (m) => {
    const content = m.content;
    if ("type" in content) {
      for (const cb of eventListeners) cb(content as RoomEvent);
    }
  });
  room.subscribe(emit);

  actions.on("message", (m) => {
    const content = m.content;
    if ("type" in content && content.type === "cursor") {
      for (const cb of cursorListeners) cb(content);
    }
  });

  function activityUsers(): string[] {
    return room.getSnapshot().activity.map((a) => a.userId);
  }

  const index: ChannelHandle<RoomInfo> = portal.channel<RoomInfo>(INDEX_ID, { history: 50 });

  return {
    getChannelStatus: () => room.getSnapshot().status,
    getSelfId: () => selfId,
    getPlayers: players,
    subscribeStatus: (cb) => {
      statusListeners.add(cb);
      cb(room.getSnapshot().status);
      return () => statusListeners.delete(cb);
    },
    subscribePresence: (cb) => {
      presenceListeners.add(cb);
      cb(players());
      return () => presenceListeners.delete(cb);
    },
    subscribeEvents: (cb) => {
      eventListeners.add(cb);
      return () => eventListeners.delete(cb);
    },
    subscribeChat: (cb) => {
      chatListeners.add(cb);
      cb(chatHistory());
      return () => chatListeners.delete(cb);
    },
    subscribeState: (cb) => {
      stateListeners.add(cb);
      const last = [...room.getSnapshot().messages]
        .reverse()
        .find((m) => "status" in m.content) as { content: RoomState } | undefined;
      cb(last?.content ?? null);
      return () => stateListeners.delete(cb);
    },
    getState: () => {
      const last = [...room.getSnapshot().messages]
        .reverse()
        .find((m) => "status" in m.content) as { content: RoomState } | undefined;
      return last?.content ?? null;
    },
    sendCut: async (label) => {
      await actions.send({ content: { type: "cut", label } as RoomAction });
    },
    subscribeCursor: (cb) => {
      cursorListeners.add(cb);
      return () => cursorListeners.delete(cb);
    },
    sendCursor: (x, y, name, userId) => {
      void actions.send({ content: { type: "cursor", x, y, name, userId } as CursorMessage });
    },
    subscribeActivity: (cb) => {
      activityListeners.add(cb);
      cb(activityUsers());
      return () => activityListeners.delete(cb);
    },
    sendAlive: () => {
      room.sendActivity("alive");
    },
    setMeta: (m) => room.setMetadata(m as unknown as Record<string, unknown>),
    sendEvent: async (e) => {
      await room.send({ content: e });
    },
    sendChat: async (text, name) => {
      await room.send({
        content: { type: "chat", text, name },
      });
    },
    subscribeIndexRooms: (cb) => {
      index.acquire();
      const emit = () => cb(roomsFromSnapshot(index.getSnapshot()));
      emit();
      const unsubMsg = index.subscribe(emit);
      const unsubStatus = index.on("status", emit);
      return () => {
        unsubMsg();
        unsubStatus();
      };
    },
    publishRoom: async (info) => {
      index.acquire();
      await index.send({ content: info });
    },
    release: () => {
      room.release();
      actions.release();
    },
  };
}
