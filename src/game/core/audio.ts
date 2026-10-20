// ============================================================
//  audio.ts — Synthesized SFX (WebAudio, no audio files).
//  All sounds go through one master gain driven by settings (volume / mute).
// ============================================================

import { getSettings, subscribeSettings, type GameSettings } from "@/game/core/settings";

let audioContext: AudioContext | null = null;
let master: GainNode | null = null;

function masterLevel(s: GameSettings): number {
  return s.muted ? 0 : s.volume;
}

/** Skip creating audio nodes entirely when muted (saves CPU on low-end machines). */
function soundEnabled(): boolean {
  return masterLevel(getSettings()) > 0;
}

subscribeSettings((s) => {
  if (master && audioContext) master.gain.setValueAtTime(masterLevel(s), audioContext.currentTime);
});

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) {
    return null;
  }
  if (!audioContext) {
    audioContext = new window.AudioContext();
    master = audioContext.createGain();
    master.gain.value = masterLevel(getSettings());
    master.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function output(context: AudioContext): AudioNode {
  return master ?? context.destination;
}

// White-noise buffers are cached per duration instead of being regenerated on every hit.
const noiseCache = new Map<number, AudioBuffer>();

function getNoiseBuffer(context: AudioContext, duration: number): AudioBuffer {
  const cached = noiseCache.get(duration);
  if (cached && cached.sampleRate === context.sampleRate) return cached;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) {
    channel[i] = Math.random() * 2 - 1;
  }
  noiseCache.set(duration, buffer);
  return buffer;
}

function playTone(
  startFrequency: number,
  endFrequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine"
): void {
  if (!soundEnabled()) return;
  const context = getAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain);
  gain.connect(output(context));
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playNoise(duration: number, volume: number): void {
  if (!soundEnabled()) return;
  const context = getAudioContext();
  if (!context) return;

  const buffer = getNoiseBuffer(context, duration);

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const now = context.currentTime;
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(120, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output(context));
  source.start(now);
}

// The hit tone lasts 70ms. A packed crowd used to retrigger every 30ms, so the
// square waves stacked and got loud. One voice, and not again until it has ended.
const HIT_DURATION_MS = 70;
let hitBusyUntil = 0;

export function playHitSound(): void {
  const now = performance.now();
  if (now < hitBusyUntil) return;
  hitBusyUntil = now + HIT_DURATION_MS;
  playTone(180, 70, HIT_DURATION_MS / 1000, 0.045, "square");
}

export function playHurtSound(): void {
  playNoise(0.12, 0.08);
  playTone(150, 65, 0.18, 0.08, "sawtooth");
}

export function playXpPickupSound(amount: number): void {
  const pitch = Math.min(1.35, 1 + amount * 0.03);
  playTone(620 * pitch, 980 * pitch, 0.1, 0.055, "sine");
}

export function playLevelUpSound(): void {
  playTone(440, 660, 0.16, 0.07, "sine");
  setTimeout(() => playTone(660, 990, 0.2, 0.065, "sine"), 90);
}

export function playGameOverSound(): void {
  playTone(220, 90, 0.4, 0.07, "sawtooth");
}

/** Short click for UI feedback (volume preview etc.). */
export function playUiSound(): void {
  playTone(520, 760, 0.06, 0.05, "triangle");
}
