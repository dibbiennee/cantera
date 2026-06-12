// Audio generato a runtime con WebAudio (nessun file). Port fedele del prototipo.

let _ac: AudioContext | null = null;
let _chip: ReturnType<typeof setInterval> | null = null;

function ctx(): AudioContext {
  if (!_ac) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    _ac = new AC();
  }
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
}

// Blip triangolare a ogni tap.
export function playTap(): void {
  try {
    const A = ctx();
    const o = A.createOscillator();
    const g = A.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(560, A.currentTime);
    o.frequency.exponentialRampToValueAtTime(330, A.currentTime + 0.09);
    g.gain.setValueAtTime(0.0001, A.currentTime);
    g.gain.exponentialRampToValueAtTime(0.22, A.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, A.currentTime + 0.12);
    o.connect(g).connect(A.destination);
    o.start();
    o.stop(A.currentTime + 0.13);
  } catch { /* no-op */ }
}

// Loop chiptune (square + basso).
export function startChip(): void {
  try {
    const A = ctx();
    const seq = [523, 659, 784, 659, 587, 784, 880, 784, 523, 659, 784, 1047, 880, 784, 659, 587];
    let i = 0;
    _chip = setInterval(() => {
      const t = A.currentTime;
      const o = A.createOscillator();
      const g = A.createGain();
      o.type = 'square';
      o.frequency.value = seq[i % seq.length];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(A.destination);
      o.start(t);
      o.stop(t + 0.18);
      if (i % 4 === 0) {
        const bo = A.createOscillator();
        const bg = A.createGain();
        bo.type = 'triangle';
        bo.frequency.value = seq[i % seq.length] / 4;
        bg.gain.setValueAtTime(0.0001, t);
        bg.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
        bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        bo.connect(bg).connect(A.destination);
        bo.start(t);
        bo.stop(t + 0.32);
      }
      i++;
    }, 170);
  } catch { /* no-op */ }
}

export function stopChip(): void {
  if (_chip) clearInterval(_chip);
  _chip = null;
}
