/**
 * Synthesizes subtle chess move sound effects using Web Audio API.
 * Requires no external audio assets and handles browser autoplay policies safely.
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!sharedAudioContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (AudioContextClass) {
      try {
        sharedAudioContext = new AudioContextClass();
      } catch {
        return null;
      }
    }
  }

  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {
      // Ignored if user gesture required
    });
  }

  return sharedAudioContext;
}

export function playMoveSound(isCapture = false): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    const duration = isCapture ? 0.09 : 0.07;

    osc.type = isCapture ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isCapture ? 420 : 320, now);
    osc.frequency.exponentialRampToValueAtTime(isCapture ? 160 : 120, now + duration);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Graceful fallback if audio is blocked or unsupported
  }
}
