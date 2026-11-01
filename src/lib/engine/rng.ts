import type { RNG } from '@/types/game';

/** Bilangan bulat acak inklusif [min, max] dari `crypto.getRandomValues` (tanpa modulo bias). */
export const cryptoRandomInt: RNG = (min, max) => {
  const range = max - min + 1;
  if (range <= 1) return min;
  const limit = Math.floor(0x100000000 / range) * range;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    globalThis.crypto.getRandomValues(buf);
    value = buf[0] ?? 0;
  } while (value >= limit);
  return min + (value % range);
};

/** Fisher-Yates; mengembalikan salinan baru. */
export function shuffleArray<T>(items: readonly T[], rng: RNG = cryptoRandomInt): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng(0, i);
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/** RNG deterministik (mulberry32) untuk pengujian. */
export function createSeededRng(seed: number): RNG {
  let a = seed >>> 0;
  return (min, max) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return min + Math.floor(r * (max - min + 1));
  };
}

/** RNG yang mengembalikan nilai dari antrean (dipotong ke rentang), untuk tes yang butuh kontrol penuh. */
export function createSequenceRng(values: readonly number[]): RNG {
  let i = 0;
  return (min, max) => {
    const v = values[i % Math.max(1, values.length)] ?? 0;
    i++;
    return Math.min(max, Math.max(min, v));
  };
}
