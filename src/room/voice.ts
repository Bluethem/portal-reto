import { Room, RoomEvent } from "livekit-client";

export type VoiceStatus = "offline" | "connecting" | "connected" | "error";

const LIVEKIT_URL = import.meta.env.PUBLIC_LIVEKIT_URL as string | undefined;
const TOKEN_URL = import.meta.env.PUBLIC_VOICE_TOKEN_URL as string | undefined;

export class VoiceChannel {
  private room: Room | null = null;
  private status: VoiceStatus = "offline";
  private deafened = false;
  private disposed = false;
  private statusListeners = new Set<(s: VoiceStatus) => void>();
  private speakerListeners = new Set<(ids: string[]) => void>();

  static isAvailable(): boolean {
    return Boolean(LIVEKIT_URL && TOKEN_URL);
  }

  getStatus(): VoiceStatus {
    return this.status;
  }

  subscribeStatus(cb: (s: VoiceStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  subscribeSpeakers(cb: (ids: string[]) => void): () => void {
    this.speakerListeners.add(cb);
    return () => this.speakerListeners.delete(cb);
  }

  async connect(roomId: string, identity: string, name: string): Promise<void> {
    if (!LIVEKIT_URL || !TOKEN_URL) {
      this.setStatus("offline");
      return;
    }
    try {
      this.setStatus("connecting");
      const base = TOKEN_URL.replace(/\/$/, "");
      const qs = new URLSearchParams({ room: roomId, identity, name });
      const resp = await fetch(`${base}/api/voice-token?${qs.toString()}`);
      if (!resp.ok) throw new Error(`token ${resp.status}`);
      const body = (await resp.json()) as { token?: string };
      if (!body.token || this.disposed) return;
      const room = new Room({ adaptiveStream: true, dynacast: true });
      this.room = room;
      room.on(RoomEvent.Connected, () => this.setStatus("connected"));
      room.on(RoomEvent.Reconnecting, () => this.setStatus("connecting"));
      room.on(RoomEvent.Disconnected, () => {
        if (this.disposed) return;
        this.setStatus("offline");
      });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const ids = speakers.map((p) => p.identity);
        for (const cb of this.speakerListeners) cb(ids);
      });
      room.on(RoomEvent.TrackSubscribed, () => this.applyDeafen());
      room.on(RoomEvent.ParticipantConnected, () => this.applyDeafen());
      await room.connect(LIVEKIT_URL, body.token, { autoSubscribe: true });
      this.applyDeafen();
    } catch (err) {
      console.error("[voice] connect failed:", err);
      this.setStatus("error");
    }
  }

  async setMicEnabled(on: boolean): Promise<boolean> {
    if (!this.room || this.status !== "connected") return false;
    try {
      await this.room.localParticipant.setMicrophoneEnabled(on);
      return true;
    } catch (err) {
      console.error("[voice] mic failed:", err);
      return false;
    }
  }

  setDeafen(on: boolean): void {
    this.deafened = on;
    this.applyDeafen();
  }

  private applyDeafen(): void {
    if (!this.room) return;
    for (const p of this.room.remoteParticipants.values()) {
      for (const pub of p.audioTrackPublications.values()) {
        pub.setEnabled(!this.deafened);
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.statusListeners.clear();
    this.speakerListeners.clear();
    const room = this.room;
    this.room = null;
    if (room) {
      room.removeAllListeners();
      void room.disconnect();
    }
  }

  private setStatus(s: VoiceStatus): void {
    if (this.status === s) return;
    this.status = s;
    for (const cb of this.statusListeners) cb(s);
  }
}
