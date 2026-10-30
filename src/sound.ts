// iOS allows audio only after a user gesture. unlockSound() must run inside a
// tap handler; it creates and resumes the AudioContext that playBeep() uses.

interface AudioSession {
  type: string;
}

let context: AudioContext | null = null;

export function unlockSound(): void {
  const session = (navigator as Navigator & { audioSession?: AudioSession }).audioSession;
  // Play also when the ring/silent switch is set to silent.
  if (session) session.type = 'playback';
  if (!context) context = new AudioContext();
  if (context.state !== 'running') void context.resume();
}

export function playBeep(): void {
  if (!context) return;
  if (context.state !== 'running') void context.resume();
  const t0 = context.currentTime;
  // Three short tones of 880 Hz.
  for (let i = 0; i < 3; i++) {
    const start = t0 + i * 0.25;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.connect(gain).connect(context.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  }
}
