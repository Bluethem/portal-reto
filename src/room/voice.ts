import { Room, RoomEvent, Track } from "livekit-client";
import type { RemoteAudioTrack, RemoteParticipant } from "livekit-client";

export type VoiceStatus = "offline" | "connecting" | "connected" | "error";
export type VoicePlayback = "unknown" | "blocked" | "playing";

const LIVEKIT_URL = import.meta.env.PUBLIC_LIVEKIT_URL as string | undefined;
const TOKEN_URL = import.meta.env.PUBLIC_VOICE_TOKEN_URL as string | undefined;

export class VoiceChannel {
  private room: Room | null = null;
  private status: VoiceStatus = "offline";
  private playback: VoicePlayback = "unknown";
  private micOn = false;
  private deafened = false;
  private userAudio = new Map<string, { volume: number; muted: boolean }>();
  private disposed = false;
  private statusListeners = new Set<(s: VoiceStatus) => void>();
  private playbackListeners = new Set<(p: VoicePlayback) => void>();
  private micListeners = new Set<(on: boolean) => void>();
  private speakerListeners = new Set<(ids: string[]) => void>();

  static isAvailable(): boolean {
    return Boolean(LIVEKIT_URL && TOKEN_URL);
  }

  getStatus(): VoiceStatus {
    return this.status;
  }

  getPlayback(): VoicePlayback {
    return this.playback;
  }

  subscribeStatus(cb: (s: VoiceStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  subscribePlayback(cb: (p: VoicePlayback) => void): () => void {
    this.playbackListeners.add(cb);
    cb(this.playback);
    return () => this.playbackListeners.delete(cb);
  }

  subscribeMic(cb: (on: boolean) => void): () => void {
    this.micListeners.add(cb);
    cb(this.micOn);
    return () => this.micListeners.delete(cb);
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
      const lkIdentity = `${identity}-${Math.random().toString(36).slice(2, 8)}`;
      const base = TOKEN_URL.replace(/\/$/, "");
      const qs = new URLSearchParams({ room: roomId, identity: lkIdentity, name });
      const resp = await fetch(`${base}/api/voice-token?${qs.toString()}`);
      if (!resp.ok) throw new Error(`token ${resp.status}`);
      const body = (await resp.json()) as { token?: string };
      if (!body.token || this.disposed) return;
      if (this.room) {
        const prev = this.room;
        this.room = null;
        prev.removeAllListeners();
        void prev.disconnect();
      }
      const room = new Room({ adaptiveStream: true, dynacast: true });
      this.room = room;
      room.on(RoomEvent.Connected, () => this.setStatus("connected"));
      room.on(RoomEvent.Reconnecting, () => this.setStatus("connecting"));
      room.on(RoomEvent.Disconnected, () => {
        if (this.disposed) return;
        this.setStatus("offline");
        this.setMicOn(false);
      });
      room.on(RoomEvent.AudioPlaybackStatusChanged, (playing) => {
        this.setPlayback(playing ? "playing" : "blocked");
      });
      room.on(RoomEvent.LocalTrackPublished, (pub) => {
        if (pub.source === Track.Source.Microphone) this.setMicOn(true);
      });
      room.on(RoomEvent.LocalTrackUnpublished, (pub) => {
        if (pub.source === Track.Source.Microphone) this.setMicOn(false);
      });
      room.on(RoomEvent.TrackMuted, (pub, p) => {
        if (p.isLocal && pub.source === Track.Source.Microphone) this.setMicOn(false);
      });
      room.on(RoomEvent.TrackUnmuted, (pub, p) => {
        if (p.isLocal && pub.source === Track.Source.Microphone) this.setMicOn(true);
      });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const ids = speakers.map((p) => p.attributes?.portalId ?? p.identity);
        for (const cb of this.speakerListeners) cb(ids);
      });
      room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        if (track.kind === Track.Kind.Audio) {
          track.attach();
          void this.startAudio();
          const pid = participant.attributes?.portalId ?? participant.identity;
          if (this.userAudio.has(pid)) this.applyUserVolume(pid);
        }
        this.applyDeafen();
      });
      room.on(RoomEvent.ParticipantConnected, () => this.applyDeafen());
      room.on(RoomEvent.MediaDevicesError, (e) => {
        console.error("[voice] media devices error", e);
      });
      await room.connect(LIVEKIT_URL, body.token, { autoSubscribe: true });
      try {
        await room.localParticipant.setAttributes({ name, portalId: identity });
      } catch (err) {
        console.warn("[voice] setAttributes failed (dot por identidad):", err);
      }
      this.applyDeafen();
    } catch (err) {
      console.error("[voice] connect failed:", err);
      this.setStatus("error");
    }
  }

  async startAudio(): Promise<void> {
    if (!this.room) return;
    try {
      await this.room.startAudio();
    } catch (err) {
      console.error("[voice] startAudio:", err);
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

  getUserVolume(portalId: string): number {
    const u = this.userAudio.get(portalId);
    return u ? (u.muted ? 0 : u.volume) : 1;
  }

  setUserVolume(portalId: string, volume: number): void {
    const prev = this.userAudio.get(portalId) ?? { volume: 1, muted: false };
    this.userAudio.set(portalId, { volume: Math.max(0, Math.min(1, volume)), muted: prev.muted });
    this.applyUserVolume(portalId);
  }

  muteUser(portalId: string, muted: boolean): void {
    const prev = this.userAudio.get(portalId) ?? { volume: 1, muted: false };
    this.userAudio.set(portalId, { ...prev, muted });
    this.applyUserVolume(portalId);
  }

  private participantByPortal(portalId: string): RemoteParticipant | undefined {
    if (!this.room) return undefined;
    for (const p of this.room.remoteParticipants.values()) {
      if ((p.attributes?.portalId ?? p.identity) === portalId) return p;
    }
    return undefined;
  }

  private applyUserVolume(portalId: string): void {
    const p = this.participantByPortal(portalId);
    if (!p) return;
    const eff = this.getUserVolume(portalId);
    for (const pub of p.audioTrackPublications.values()) {
      const t = pub.track;
      if (t && t.kind === Track.Kind.Audio) (t as RemoteAudioTrack).setVolume(eff);
    }
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
    this.playbackListeners.clear();
    this.micListeners.clear();
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

  private setPlayback(p: VoicePlayback): void {
    if (this.playback === p) return;
    this.playback = p;
    for (const cb of this.playbackListeners) cb(p);
  }

  private setMicOn(on: boolean): void {
    if (this.micOn === on) return;
    this.micOn = on;
    for (const cb of this.micListeners) cb(on);
  }
}
