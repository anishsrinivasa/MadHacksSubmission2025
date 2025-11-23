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
  sad: { speed: 0.6, volume: -4 },
  neutral: { speed: 1.0, volume: 0 },
  surprised: { speed: 1.5, volume: 2 },
  angry: { speed: 1.3, volume: 5 },
};

export const DWELL_SELECT_MS = 500;

export const NOSE_SENSITIVITY = {
  x: 4.0,
  y: 5.0,
};

export const SMOOTHING_FACTOR = 0.3;

export const EMOTION_MODEL_URLS = [
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights',
  'https://unpkg.com/face-api.js@0.22.2/weights',
  'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
];

export const RECORDING_DURATION_MS = 30_000;

