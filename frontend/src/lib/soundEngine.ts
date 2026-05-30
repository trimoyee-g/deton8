let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  // Resume if browser suspended it (autoplay policy)
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setMuted(val: boolean) { muted = val; }
export function isMuted() { return muted; }

// ─── Orb placed — soft pop ────────────────────────────────────────────────────
export function playPlace() {
  if (muted) return;
  const a = ac();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain); gain.connect(a.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(700, a.currentTime);
  osc.frequency.exponentialRampToValueAtTime(320, a.currentTime + 0.09);
  gain.gain.setValueAtTime(0.22, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.13);
  osc.start(a.currentTime); osc.stop(a.currentTime + 0.13);
}

// ─── Explosion — noise burst + sub boom, scales with chain size ───────────────
export function playExplosion(chainSize: number) {
  if (muted) return;
  const a = ac();
  const intensity = Math.min(chainSize / 6, 1);

  // White noise burst
  const bufLen = Math.floor(a.sampleRate * 0.28);
  const buf = a.createBuffer(1, bufLen, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const src = a.createBufferSource();
  src.buffer = buf;

  const filter = a.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 180 + intensity * 400;
  filter.Q.value = 0.6;

  const gain = a.createGain();
  gain.gain.setValueAtTime(0.12 + intensity * 0.3, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.28);

  src.connect(filter); filter.connect(gain); gain.connect(a.destination);
  src.start(a.currentTime);

  // Sub boom for chains of 3+
  if (chainSize >= 3) {
    const sub = a.createOscillator();
    const subGain = a.createGain();
    sub.connect(subGain); subGain.connect(a.destination);
    sub.type = "sine";
    sub.frequency.setValueAtTime(90, a.currentTime);
    sub.frequency.exponentialRampToValueAtTime(28, a.currentTime + 0.22);
    subGain.gain.setValueAtTime(0.28 + intensity * 0.15, a.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.22);
    sub.start(a.currentTime); sub.stop(a.currentTime + 0.22);
  }
}

// ─── Timer tick ───────────────────────────────────────────────────────────────
export function playTick() {
  if (muted) return;
  const a = ac();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain); gain.connect(a.destination);
  osc.type = "triangle";
  osc.frequency.value = 1100;
  gain.gain.setValueAtTime(0.06, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.04);
  osc.start(a.currentTime); osc.stop(a.currentTime + 0.04);
}

// ─── Urgent tick (last 4 seconds) ─────────────────────────────────────────────
export function playUrgentTick() {
  if (muted) return;
  const a = ac();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain); gain.connect(a.destination);
  osc.type = "square";
  osc.frequency.value = 1600;
  gain.gain.setValueAtTime(0.09, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.05);
  osc.start(a.currentTime); osc.stop(a.currentTime + 0.05);
}

// ─── Time up — descending buzz ────────────────────────────────────────────────
export function playTimeUp() {
  if (muted) return;
  const a = ac();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain); gain.connect(a.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(380, a.currentTime);
  osc.frequency.exponentialRampToValueAtTime(90, a.currentTime + 0.35);
  gain.gain.setValueAtTime(0.18, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.35);
  osc.start(a.currentTime); osc.stop(a.currentTime + 0.35);
}

// ─── Win fanfare — ascending major arpeggio ───────────────────────────────────
export function playWin() {
  if (muted) return;
  const a = ac();
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.connect(gain); gain.connect(a.destination);
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = a.currentTime + i * 0.14;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.start(t); osc.stop(t + 0.5);
  });
}

// ─── Undo — reverse pop ───────────────────────────────────────────────────────
export function playUndo() {
  if (muted) return;
  const a = ac();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain); gain.connect(a.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(320, a.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, a.currentTime + 0.1);
  gain.gain.setValueAtTime(0.18, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.14);
  osc.start(a.currentTime); osc.stop(a.currentTime + 0.14);
}
