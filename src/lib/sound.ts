export function playExpenseDoneSound() {
  if (typeof window === 'undefined') {
    return;
  }

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillatorA = context.createOscillator();
  const oscillatorB = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const start = context.currentTime;

  oscillatorA.type = 'triangle';
  oscillatorB.type = 'sine';
  oscillatorA.frequency.setValueAtTime(740, start);
  oscillatorA.frequency.exponentialRampToValueAtTime(980, start + 0.12);
  oscillatorB.frequency.setValueAtTime(1110, start);
  oscillatorB.frequency.exponentialRampToValueAtTime(1320, start + 0.12);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2200, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);

  oscillatorA.connect(filter);
  oscillatorB.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  oscillatorA.start(start);
  oscillatorB.start(start);
  oscillatorA.stop(start + 0.22);
  oscillatorB.stop(start + 0.22);

  window.setTimeout(() => {
    void context.close().catch(() => {});
  }, 280);
}
