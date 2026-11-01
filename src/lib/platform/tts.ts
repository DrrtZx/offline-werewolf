let cachedVoice: SpeechSynthesisVoice | null = null;

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function pickVoice(): void {
  const s = synth();
  if (!s) return;
  cachedVoice = s.getVoices().find((v) => v.lang === 'id-ID' || v.lang.toLowerCase().startsWith('id')) ?? null;
}

/** Muat voice (async di banyak browser) dan dengarkan `voiceschanged`. Mengembalikan fungsi cleanup. */
export function initTTS(): () => void {
  const s = synth();
  if (!s) return () => undefined;
  pickVoice();
  s.addEventListener('voiceschanged', pickVoice);
  return () => {
    s.removeEventListener('voiceschanged', pickVoice);
    s.cancel();
  };
}

export function speak(text: string): void {
  const s = synth();
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'id-ID';
  u.rate = 0.95;
  u.pitch = 1;
  if (cachedVoice) u.voice = cachedVoice;
  s.speak(u);
}

export function cancelSpeech(): void {
  synth()?.cancel();
}
