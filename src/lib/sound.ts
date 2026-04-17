let sharedExpenseAudio: HTMLAudioElement | null = null;

function getSharedExpenseAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return null;
  }

  if (!sharedExpenseAudio) {
    sharedExpenseAudio = new Audio('/expense-done.mp3');
    sharedExpenseAudio.preload = 'auto';
  }

  return sharedExpenseAudio;
}

export function playExpenseDoneSound() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(18);
  }

  const baseAudio = getSharedExpenseAudio();

  if (!baseAudio) {
    return;
  }

  const audio = baseAudio.cloneNode(true) as HTMLAudioElement;
  audio.volume = 1;

  void audio.play().catch(() => {});
}
