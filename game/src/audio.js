// Every sound in the game, synthesized live with WebAudio: no audio files,
// no network, nothing to load. Each effect is a tiny oscillator/noise recipe.
// The context is created on the first user gesture (the Start button), so
// browsers never block it.

let ctx = null;
let master = null;
let muted = false;
let ambientNodes = null;
let lastShootAt = 0;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}
export function isMuted() {
  return muted;
}

// One oscillator blip with a pitch glide and an exponential fade.
function blip({ type = 'sine', from = 440, to = 220, dur = 0.12, vol = 0.2, when = 0 }) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

// A burst of filtered noise (impacts, splashes).
function noise({ dur = 0.1, vol = 0.15, freq = 1200, when = 0 }) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime + when;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  // Tower shots are throttled: a dozen towers firing at once must not clip.
  shoot(kind) {
    const now = performance.now();
    if (now - lastShootAt < 45) return;
    lastShootAt = now;
    if (kind === 'ember') blip({ type: 'square', from: 880, to: 520, dur: 0.07, vol: 0.06 });
    else if (kind === 'prism') blip({ type: 'triangle', from: 660, to: 330, dur: 0.1, vol: 0.09 });
    else if (kind === 'nova') { noise({ dur: 0.16, vol: 0.12, freq: 700 }); blip({ type: 'sine', from: 180, to: 60, dur: 0.18, vol: 0.14 }); }
    else blip({ type: 'sine', from: 1200, to: 900, dur: 0.06, vol: 0.04 });
  },
  hit() {
    noise({ dur: 0.05, vol: 0.05, freq: 2400 });
  },
  splash() {
    noise({ dur: 0.14, vol: 0.1, freq: 900 });
  },
  kill() {
    blip({ type: 'triangle', from: 520, to: 130, dur: 0.14, vol: 0.1 });
  },
  coin() {
    blip({ type: 'sine', from: 990, to: 990, dur: 0.07, vol: 0.07 });
    blip({ type: 'sine', from: 1320, to: 1320, dur: 0.1, vol: 0.07, when: 0.06 });
  },
  leak() {
    blip({ type: 'sawtooth', from: 160, to: 70, dur: 0.3, vol: 0.16 });
    noise({ dur: 0.2, vol: 0.1, freq: 500 });
  },
  build() {
    blip({ type: 'sine', from: 300, to: 420, dur: 0.09, vol: 0.12 });
    noise({ dur: 0.06, vol: 0.08, freq: 1500, when: 0.02 });
  },
  upgrade() {
    [523, 659, 784].forEach((f, i) =>
      blip({ type: 'triangle', from: f, to: f, dur: 0.12, vol: 0.1, when: i * 0.07 }));
  },
  sell() {
    blip({ type: 'sine', from: 784, to: 523, dur: 0.12, vol: 0.09 });
  },
  click() {
    blip({ type: 'sine', from: 700, to: 700, dur: 0.05, vol: 0.06 });
  },
  error() {
    blip({ type: 'square', from: 200, to: 140, dur: 0.12, vol: 0.08 });
  },
  waveStart() {
    [392, 523, 659].forEach((f, i) =>
      blip({ type: 'triangle', from: f, to: f, dur: 0.16, vol: 0.11, when: i * 0.09 }));
  },
  waveClear() {
    [659, 784, 1047].forEach((f, i) =>
      blip({ type: 'sine', from: f, to: f, dur: 0.14, vol: 0.09, when: i * 0.08 }));
  },
  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      blip({ type: 'triangle', from: f, to: f, dur: 0.22, vol: 0.12, when: i * 0.12 }));
  },
  defeat() {
    [330, 262, 196, 131].forEach((f, i) =>
      blip({ type: 'sawtooth', from: f, to: f * 0.9, dur: 0.3, vol: 0.09, when: i * 0.16 }));
  },
};

// A soft two-oscillator pad under the game, barely there.
export function startAmbient() {
  const c = ensure();
  if (!c || ambientNodes || muted === undefined) return;
  const g = c.createGain();
  g.gain.value = 0.035;
  g.connect(master);
  const o1 = c.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = 110;
  const o2 = c.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = 164.8;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain).connect(g.gain);
  o1.connect(g);
  o2.connect(g);
  o1.start();
  o2.start();
  lfo.start();
  ambientNodes = { o1, o2, lfo, g };
}

export function stopAmbient() {
  if (!ambientNodes) return;
  try {
    ambientNodes.o1.stop();
    ambientNodes.o2.stop();
    ambientNodes.lfo.stop();
  } catch (e) { /* already stopped */ }
  ambientNodes = null;
}

// Warm the context up on a gesture so later sounds play instantly.
export function unlockAudio() {
  ensure();
}
