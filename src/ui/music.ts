let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let step = 0;
let playing = false;

function audio(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

const STEP_MS = 250;
const PATTERN = [0, 4, 7, 4, 0, 4, 7, 9, 7, 4, 0, 4, 7, 4, 2, 0];
const BASS = [55, 55, 49, 49, 55, 55, 49, 49, 55, 55, 49, 49, 55, 55, 49, 49];

function note(ac: AudioContext, freq: number, when: number, dur: number, gainValue: number, type: OscillatorType = "triangle"): void {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

function scheduleStep(ac: AudioContext): void {
  const t = ac.currentTime + 0.05;
  const semitones = PATTERN[step % PATTERN.length];
  const freq = 440 * Math.pow(2, semitones / 12);
  note(ac, freq, t, 0.18, 0.06);
  note(ac, freq / 2, t, 0.3, 0.05, "sine");
  const bassFreq = BASS[step % BASS.length];
  note(ac, bassFreq, t, 0.5, 0.04, "sine");
  step++;
}

export function startLobbyMusic(): void {
  const ac = audio();
  if (!ac || playing) return;
  playing = true;
  step = 0;
  scheduleStep(ac);
  timer = setInterval(() => scheduleStep(ac), STEP_MS);
}

export function stopMusic(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  playing = false;
  step = 0;
}
