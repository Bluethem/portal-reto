let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

export function playCut(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const noise = ac.createBufferSource();
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  noise.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2500;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  noise.start(t);
  noise.stop(t + 0.06);
}

export function playWrong(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(120, t);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.22);
}

function blip(ac: AudioContext, freq: number, when: number, dur: number, gainValue: number, type: OscillatorType = "sine"): void {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

export function playClick(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  blip(ac, 700, t, 0.06, 0.08);
}

export function playJoin(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  blip(ac, 523.25, t, 0.09, 0.07);
  blip(ac, 659.25, t + 0.08, 0.09, 0.07);
  blip(ac, 783.99, t + 0.16, 0.12, 0.07);
}

export function playLeave(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  blip(ac, 783.99, t, 0.09, 0.07);
  blip(ac, 659.25, t + 0.08, 0.09, 0.07);
  blip(ac, 523.25, t + 0.16, 0.12, 0.07);
}

export function playReady(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  blip(ac, 880, t, 0.08, 0.08);
  blip(ac, 1174.66, t + 0.09, 0.14, 0.08);
}

export function playStart(): void {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  blip(ac, 392, t, 0.1, 0.09, "square");
  blip(ac, 523.25, t + 0.12, 0.1, 0.09, "square");
  blip(ac, 659.25, t + 0.24, 0.1, 0.09, "square");
  blip(ac, 783.99, t + 0.36, 0.18, 0.09, "square");
}
