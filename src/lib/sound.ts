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
  const oscillatorC = context.createOscillator();
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 0.18, context.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  const noiseSource = context.createBufferSource();
  const gain = context.createGain();
  const shimmerGain = context.createGain();
  const noiseGain = context.createGain();
  const filter = context.createBiquadFilter();
  const shimmerFilter = context.createBiquadFilter();
  const noiseFilter = context.createBiquadFilter();
  const start = context.currentTime;

  for (let index = 0; index < noiseData.length; index += 1) {
    const falloff = 1 - index / noiseData.length;
    noiseData[index] = (Math.random() * 2 - 1) * falloff * 0.18;
  }

  noiseSource.buffer = noiseBuffer;

  oscillatorA.type = 'triangle';
  oscillatorB.type = 'sine';
  oscillatorC.type = 'sine';
  oscillatorA.frequency.setValueAtTime(580, start);
  oscillatorA.frequency.exponentialRampToValueAtTime(455, start + 0.22);
  oscillatorB.frequency.setValueAtTime(870, start + 0.012);
  oscillatorB.frequency.exponentialRampToValueAtTime(690, start + 0.22);
  oscillatorC.frequency.setValueAtTime(1240, start + 0.022);
  oscillatorC.frequency.exponentialRampToValueAtTime(980, start + 0.18);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1950, start);
  filter.Q.setValueAtTime(0.7, start);

  shimmerFilter.type = 'bandpass';
  shimmerFilter.frequency.setValueAtTime(1680, start);
  shimmerFilter.Q.setValueAtTime(1.2, start);

  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(1180, start);
  noiseFilter.Q.setValueAtTime(0.4, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.068, start + 0.016);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);

  shimmerGain.gain.setValueAtTime(0.0001, start);
  shimmerGain.gain.exponentialRampToValueAtTime(0.028, start + 0.024);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);

  noiseGain.gain.setValueAtTime(0.0001, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.016, start + 0.014);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);

  oscillatorA.connect(filter);
  oscillatorB.connect(filter);
  oscillatorC.connect(shimmerFilter);
  noiseSource.connect(noiseFilter);
  filter.connect(gain);
  shimmerFilter.connect(shimmerGain);
  noiseFilter.connect(noiseGain);
  gain.connect(context.destination);
  shimmerGain.connect(context.destination);
  noiseGain.connect(context.destination);

  oscillatorA.start(start);
  oscillatorB.start(start + 0.012);
  oscillatorC.start(start + 0.02);
  noiseSource.start(start);
  oscillatorA.stop(start + 0.34);
  oscillatorB.stop(start + 0.34);
  oscillatorC.stop(start + 0.28);
  noiseSource.stop(start + 0.18);

  window.setTimeout(() => {
    void context.close().catch(() => {});
  }, 460);
}
