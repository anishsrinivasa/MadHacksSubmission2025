export const PROXY_URL =
  process.env.NEXT_PUBLIC_PROXY_URL ?? 'http://localhost:5001';

export const DEFAULT_VOICE_REFERENCES = {
  male: {
    id: '7d4e8a6444a442eb819c69981fdb8315',
    name: 'Male (American)',
    emoji: '👨',
  },
  female: {
    id: 'b089032e45db460fb1934ece75a8c51d',
    name: 'Female (Expressive)',
    emoji: '👩',
  },
};

export const EMOTION_VOICE_PARAMS: Record<
  string,
  { speed: number; volume: number }
> = {
  happy: { speed: 1.3, volume: 0 },
  sad: { speed: 0.6, volume: -3 },
  neutral: { speed: 1.0, volume: 0 },
  surprised: { speed: 1.5, volume: 2 },
  angry: { speed: 1.3, volume: 5 },
};

export const DWELL_SELECT_MS = 750; // 750ms dwell time to prevent accidental clicks

export const NOSE_SENSITIVITY = {
  // Tuned to balance stability vs. required head movement.
  // Lower values = less amplification of tiny detection noise (less "jumping").
  x: 4.1,
  y: 4.2,
};

// Smoothing for nose tracking:
//  - Lower values = more smoothing (less jitter) but more lag
//  - Higher values = more responsive but can look jumpy
export const SMOOTHING_FACTOR = 0.25;

export const EMOTION_MODEL_URLS = [
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights',
  'https://unpkg.com/face-api.js@0.22.2/weights',
  'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
];

export const RECORDING_DURATION_MS = 30_000;

