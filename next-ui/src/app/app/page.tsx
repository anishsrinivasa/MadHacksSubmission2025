'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocalStorage } from 'usehooks-ts';
import type { Emotion, VoiceProfile, VoiceSearchResult } from '@/types';
import {
  DEFAULT_VOICE_REFERENCES,
  PROXY_URL,
  EMOTION_VOICE_PARAMS,
  EMOTION_MODEL_URLS,
  DWELL_SELECT_MS,
  NOSE_SENSITIVITY,
  SMOOTHING_FACTOR,
  RECORDING_DURATION_MS,
} from '@/lib/config';
import { WORD_DICTIONARY } from '@/lib/wordDictionary';
import { convertTextNumbers } from '@/lib/numberConverter';
import { TextComposer } from '@/components/dashboard/TextComposer';
import {
  VirtualKeyboard,
  KeyboardKey,
} from '@/components/dashboard/VirtualKeyboard';
import { CameraPanel } from '@/components/dashboard/CameraPanel';
import { ProfilesPanel } from '@/components/dashboard/ProfilesPanel';
import { EmotionWidget } from '@/components/dashboard/EmotionWidget';
import { Navbar } from '@/components/Navbar';
import { Flex, Text, Heading, Card as RadixCard, TextField } from '@radix-ui/themes';
import { Button as UIButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type MediaPipeResources = {
  FaceMesh: new (options: Record<string, unknown>) => {
    setOptions: (options: Record<string, unknown>) => void;
    onResults: (cb: (results: any) => void) => void;
    send: (input: { image: HTMLVideoElement }) => Promise<void>;
    close: () => void;
  };
  FACEMESH_TESSELATION: number[][];
  drawConnectors: (
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    connections: number[][],
    style?: Record<string, unknown>
  ) => void;
  Camera: new (
    video: HTMLVideoElement,
    options: { onFrame: () => Promise<void>; width: number; height: number }
  ) => {
    start: () => Promise<void>;
    stop: () => void;
  };
};

const NUMBER_ROW: KeyboardKey[] = '1234567890'.split('').map((label) => ({
  label,
  value: label,
}));

const LETTER_ROWS: KeyboardKey[][] = [
  'qwertyuiop'.split('').map((char) => ({ label: char, value: char })),
  'asdfghjkl'.split('').map((char) => ({ label: char, value: char })),
  [
    { label: 'z', value: 'z' },
    { label: 'x', value: 'x' },
    { label: 'c', value: 'c' },
    { label: 'v', value: 'v' },
    { label: 'b', value: 'b' },
    { label: 'n', value: 'n' },
    { label: 'm', value: 'm' },
    { label: '⌫', value: 'BACKSPACE', variant: 'ghost' },
  ],
];

const PUNCTUATION_ROW: KeyboardKey[] = [
  '.',
  ',',
  '!',
  '?',
  "'",
  '"',
  '-',
  ':',
  ';',
].map((char) => ({ label: char, value: char }));

const ACTION_ROW: KeyboardKey[] = [
  { label: 'CLEAR', value: 'CLEAR', variant: 'ghost' },
  { label: 'Autocomplete', value: 'AUTOCOMPLETE', variant: 'action' },
  { label: 'SPACE', value: ' ', wide: true },
];

const EMOTION_EMOJI: Record<Emotion, string> = {
  happy: '😊',
  sad: '😢',
  neutral: '😐',
  surprised: '😲',
  angry: '😠',
};

const EMOTION_LABEL: Record<Emotion, string> = {
  happy: 'Happy',
  sad: 'Sad',
  neutral: 'Neutral',
  surprised: 'Surprised',
  angry: 'Angry',
};

const MAX_RECORD_SECONDS = RECORDING_DURATION_MS / 1000;
const FALLBACK_PROFILE_ID = 'default';
const KEYBOARD_LAYOUT: KeyboardKey[][] = [
  NUMBER_ROW,
  ...LETTER_ROWS,
  PUNCTUATION_ROW,
  ACTION_ROW,
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const smoothingRef = useRef({ x: 0, y: 0 });
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const dwellTimerRef = useRef<number | null>(null);
  const dwellRepeatRef = useRef<number | null>(null);
  const candidateElementRef = useRef<HTMLElement | null>(null); // For hysteresis
  const candidateTimerRef = useRef<number | null>(null);
  const emotionBufferRef = useRef<Emotion[]>([]);
  const emotionLockRef = useRef<number>(0);
  const emotionBusyRef = useRef(false);
  const lastDetectionRef = useRef<number>(0);
  const modelsLoadingRef = useRef(false);
  const modelsReadyRef = useRef(false);
  const isTrackingRef = useRef(false);
  const currentEmotionRef = useRef<Emotion>('neutral');
  const [text, setText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);
  const [statusMessage, setStatusMessage] = useState(
    'Camera idle — start tracking to control the board with your nose.'
  );
  const [cursorPosition, setCursorPosition] = useState({
    x: 0,
    y: 0,
    normalizedX: 0.5,
    normalizedY: 0.5,
  });
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  
  // Keep currentEmotionRef in sync with emotion state
  useEffect(() => {
    currentEmotionRef.current = emotion;
  }, [emotion]);
  
  const [emotionConfidence, setEmotionConfidence] = useState(0);
  const [modelsStatus, setModelsStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceResults, setVoiceResults] = useState<VoiceSearchResult[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    const [firstVoice] = Object.values(DEFAULT_VOICE_REFERENCES);
    return firstVoice
      ? { id: firstVoice.id, name: firstVoice.name }
      : { id: FALLBACK_PROFILE_ID, name: 'Default Voice' };
  });
  const [profiles, setProfiles] = useLocalStorage<VoiceProfile[]>(
    'expressive-voice-profiles',
    []
  );
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileTab, setProfileTab] = useState<'profiles' | 'record' | 'upload' | 'explore'>(
    'profiles'
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<
    'idle' | 'recording' | 'processing'
  >('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);
  const [recordedMs, setRecordedMs] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [manualVoiceId, setManualVoiceId] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [profilePrompt, setProfilePrompt] = useState<VoiceSearchResult | null>(
    null
  );
  const [speakCooldown, setSpeakCooldown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cameraDragRef = useRef<HTMLDivElement>(null);
  const faceApiRef = useRef<typeof import('face-api.js') | null>(null);
  const mediapipeRef = useRef<MediaPipeResources | null>(null);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      setCameraPosition({ x: window.innerWidth - 280, y: window.innerHeight - 320 });
    }
  }, [mounted]);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [profiles, activeProfileId]
  );

  // Prevent hydration mismatch by only rendering client-specific content after mount
  useEffect(() => {
    setMounted(true);
    
    // Set up MediaPipe Module polyfill early, before any scripts load
    // MediaPipe now uses arguments_ directly, NOT Module.arguments
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (!win.Module) {
        win.Module = { arguments_: [] };
      }
      // Initialize arguments_ if it doesn't exist
      if (!win.Module.arguments_) {
        win.Module.arguments_ = [];
      }
      // Remove any existing arguments property (MediaPipe doesn't want it)
      try {
        if (win.Module && 'arguments' in win.Module) {
          delete win.Module.arguments;
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);

  useEffect(() => {
    if (!cursorRef.current) return;
    cursorRef.current.style.transform = `translate(-50%, -50%) translate(${cursorPosition.x}px, ${cursorPosition.y}px)`;
  }, [cursorPosition]);

  const ensureFaceApi = useCallback(async () => {
    if (faceApiRef.current) {
      return faceApiRef.current;
    }
    try {
      // Try dynamic import first
      const mod = await import('face-api.js');
      // Check if faceapi is available on window (might be loaded via script tag)
      const win = window as any;
      if (win.faceapi && !mod.default) {
        faceApiRef.current = win.faceapi;
        return win.faceapi;
      }
      // Use the imported module or default export
      faceApiRef.current = mod.default || mod;
      return faceApiRef.current;
    } catch (error) {
      // Fallback to window.faceapi if import fails
      const win = window as any;
      if (win.faceapi) {
        faceApiRef.current = win.faceapi;
        return win.faceapi;
      }
      throw new Error('face-api.js not available. Please ensure it is loaded.');
    }
  }, []);

  const ensureMediaPipe = useCallback(async () => {
    if (mediapipeRef.current) {
      return mediapipeRef.current;
    }

    const win = window as any;

    // Initialize Module object for WASM compatibility before loading scripts
    // MediaPipe now uses arguments_ directly, NOT Module.arguments
    if (!win.Module) {
      win.Module = { arguments_: [] };
    }
    // Initialize arguments_ if it doesn't exist
    if (!win.Module.arguments_) {
      win.Module.arguments_ = [];
    }
    // Remove any existing arguments property if it exists (MediaPipe doesn't want it)
    try {
      if (win.Module && 'arguments' in win.Module) {
        delete win.Module.arguments;
      }
    } catch (e) {
      // Ignore errors
    }

    // Check if already loaded
    if (
      win.FaceMesh &&
      win.Camera &&
      win.drawConnectors &&
      win.FACEMESH_TESSELATION
    ) {
      const resources: MediaPipeResources = {
        FaceMesh: win.FaceMesh,
        FACEMESH_TESSELATION: win.FACEMESH_TESSELATION,
        drawConnectors: win.drawConnectors,
        Camera: win.Camera,
      };
      mediapipeRef.current = resources;
      return resources;
    }

    // Load via script tags (MediaPipe's preferred method)
    // IMPORTANT: Load sequentially to ensure proper initialization order
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
    ];

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
          // Add a small delay after each script loads to ensure initialization
          setTimeout(() => resolve(), 50);
        };
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
      });
    };

    // Load scripts sequentially (not in parallel) to ensure proper initialization
    for (const scriptSrc of scripts) {
      await loadScript(scriptSrc);
    }

    // Additional wait after all scripts are loaded to ensure WASM modules are initialized
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Wait for globals to be available with retry mechanism
    const maxRetries = 50; // 5 seconds max wait (50 * 100ms)
    let retries = 0;

    while (retries < maxRetries) {
      if (
        win.FaceMesh &&
        win.Camera &&
        win.drawConnectors &&
        win.FACEMESH_TESSELATION
      ) {
        const resources: MediaPipeResources = {
          FaceMesh: win.FaceMesh,
          FACEMESH_TESSELATION: win.FACEMESH_TESSELATION,
          drawConnectors: win.drawConnectors,
          Camera: win.Camera,
        };

        mediapipeRef.current = resources;
        return resources;
      }

      // Wait 100ms before retrying
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    throw new Error(
      'MediaPipe globals not available after loading scripts. Please refresh the page.'
    );
  }, []);

  const loadEmotionModels = useCallback(async () => {
    console.log('[loadEmotionModels] Called, loading:', modelsLoadingRef.current, 'ready:', modelsReadyRef.current);
    if (modelsLoadingRef.current || modelsReadyRef.current) {
      console.log('[loadEmotionModels] Already loading or ready, returning');
      return;
    }
    console.log('[loadEmotionModels] Starting to load models...');
    modelsLoadingRef.current = true;
    setModelsStatus('loading');
    setStatusMessage('Loading emotion recognition models...');
    try {
      const faceapi = await ensureFaceApi();
      console.log('[loadEmotionModels] faceapi loaded:', !!faceapi, {
        hasNets: !!faceapi?.nets,
        hasTinyFaceDetector: !!faceapi?.nets?.tinyFaceDetector,
        hasFaceExpressionNet: !!faceapi?.nets?.faceExpressionNet
      });
      
      // Check if faceapi is properly loaded
      if (!faceapi || !faceapi.nets) {
        throw new Error('face-api.js not properly initialized');
      }
      
      let loaded = false;
      let lastError: unknown = null;
      
      // Try each CDN URL
      for (const url of EMOTION_MODEL_URLS) {
        try {
          console.log(`[loadEmotionModels] Attempting to load emotion models from: ${url}`);
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(url),
            faceapi.nets.faceExpressionNet.loadFromUri(url),
          ]);
          console.log(`[loadEmotionModels] ✅ Successfully loaded emotion models from: ${url}`);
          loaded = true;
          break;
        } catch (error) {
          console.warn(`[loadEmotionModels] Failed to load from ${url}:`, error);
          lastError = error;
          continue;
        }
      }
      
      if (!loaded) {
        throw lastError ?? new Error('Failed to load models from all CDNs');
      }
      
      console.log('[loadEmotionModels] ✅ Models loaded successfully, setting status to ready');
      modelsLoadingRef.current = false;
      modelsReadyRef.current = true;
      setModelsStatus('ready');
      setStatusMessage('Models ready — start the camera to begin.');
    } catch (error) {
      console.error('[loadEmotionModels] ❌ Error loading models:', error);
      modelsLoadingRef.current = false;
      setModelsStatus('error');
      setStatusMessage('Emotion models failed to load. Tracking still works.');
    }
  }, [ensureFaceApi]);

  const updateEmotion = useCallback(
    (incoming: Emotion, confidence: number) => {
      const now = Date.now();
      
      // If emotion is locked, only update confidence, don't change emotion
      if (emotionLockRef.current > now) {
        setEmotionConfidence(confidence);
        return;
      }

      // Add detected emotion to buffer (single entry - no weighting)
      emotionBufferRef.current.push(incoming);
      const EMOTION_BUFFER_SIZE = 4; // Match original
      if (emotionBufferRef.current.length > EMOTION_BUFFER_SIZE) {
        emotionBufferRef.current.shift();
      }

      // Calculate emotion counts from buffer
      const counts = emotionBufferRef.current.reduce<Record<Emotion, number>>(
        (acc, item) => {
          acc[item] = (acc[item] || 0) + 1;
          return acc;
        },
        {
          happy: 0,
          sad: 0,
          neutral: 0,
          surprised: 0,
          angry: 0,
        }
      );

      // Find emotion with highest count (stabilized emotion)
      let stabilizedEmotion: Emotion = emotion;
      let maxCount = 0;
      for (const [emo, count] of Object.entries(counts) as Array<[Emotion, number]>) {
        if (count > maxCount) {
          maxCount = count;
          stabilizedEmotion = emo;
        }
      }

      // Check if recent emotions (last 2-3 entries) agree on a new emotion
      // This allows new emotions to override old ones more quickly
      let recentStabilizedEmotion: Emotion = stabilizedEmotion;
      if (emotionBufferRef.current.length >= 3) {
        const recentEmotions = emotionBufferRef.current.slice(-3); // Last 3 entries
        const recentCounts: Record<Emotion, number> = {
          happy: 0,
          sad: 0,
          neutral: 0,
          surprised: 0,
          angry: 0,
        };
        recentEmotions.forEach(e => {
          recentCounts[e] = (recentCounts[e] || 0) + 1;
        });
        const recentMax = Math.max(...Object.values(recentCounts));
        const recentEmotion = Object.entries(recentCounts).find(([_, count]) => count === recentMax)?.[0] as Emotion;
        // If recent emotion has 2+ out of 3, prioritize it
        if (recentEmotion && recentCounts[recentEmotion] >= 2) {
          recentStabilizedEmotion = recentEmotion;
        }
      }

      // Only change emotion if it exceeds threshold OR if recent emotions strongly agree
      const EMOTION_THRESHOLD = 0.5; // 50% of frames must agree (2 out of 4 frames)
      const agreementRatio = maxCount / emotionBufferRef.current.length;
      const recentAgreement = emotionBufferRef.current.length >= 3 ? 
        (emotionBufferRef.current.slice(-3).filter(e => e === recentStabilizedEmotion).length / 3) : 0;
      
      const shouldChange = (agreementRatio >= EMOTION_THRESHOLD && stabilizedEmotion !== currentEmotionRef.current) ||
                          (recentAgreement >= 0.67 && recentStabilizedEmotion !== currentEmotionRef.current && recentStabilizedEmotion !== 'neutral');
      
      if (shouldChange) {
        const newEmotion = recentAgreement >= 0.67 ? recentStabilizedEmotion : stabilizedEmotion;
        console.log(`[updateEmotion] Emotion changed: ${currentEmotionRef.current} → ${newEmotion} (Overall: ${Math.round(agreementRatio * 100)}%, Recent: ${Math.round(recentAgreement * 100)}% agreement)`);
        currentEmotionRef.current = newEmotion;
        setEmotion(newEmotion);
        
        // Lock emotion for 2 seconds to prevent rapid changes
        emotionLockRef.current = now + 2000;
      }

      // Update confidence
      setEmotionConfidence(confidence);
    },
    []
  );

  const detectEmotion = useCallback(async () => {
    const now = performance.now();

    console.log('[detectEmotion] Called', {
      modelsStatus,
      hasVideoRef: !!videoRef.current,
      isTracking: isTrackingRef.current,
      emotionBusy: emotionBusyRef.current,
      lastDetectionMsAgo: now - lastDetectionRef.current,
    });
    
    // Debug: log why detection might be skipped
    if (!modelsReadyRef.current) {
      console.log('[detectEmotion] ❌ Skipped: models not ready, status =', modelsStatus);
      return;
    }
    if (!videoRef.current) {
      console.log('[detectEmotion] ❌ Skipped: no videoRef');
      return;
    }

    // If we THINK we're still busy but it's been > 2s since the last start,
    // assume a previous detection got stuck and force-reset the flag.
    if (emotionBusyRef.current && now - lastDetectionRef.current > 2000) {
      console.warn('[detectEmotion] ⚠️ emotionBusyRef stuck for >2s — force resetting flag');
      emotionBusyRef.current = false;
    }

    if (emotionBusyRef.current) {
      console.log('[detectEmotion] ⏸️ Skipped: already processing');
      return; // Already processing
    }

    if (!isTrackingRef.current) {
      console.log('[detectEmotion] ❌ Skipped: not tracking');
      return;
    }
    
    // Check if video is actually playing and has dimensions
    if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
      console.log('[detectEmotion] ❌ Skipped: video not ready', {
        readyState: videoRef.current.readyState,
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight
      });
      return;
    }
    
    if (now - lastDetectionRef.current < 350) {
      return; // Throttled
    }
    lastDetectionRef.current = now;
    emotionBusyRef.current = true;
    
    console.log('[detectEmotion] ✅ Starting detection...');
    
    try {
      const faceapi = await ensureFaceApi();
      if (!faceapi || !videoRef.current) {
        console.warn('[detectEmotion] ❌ faceapi not available');
        emotionBusyRef.current = false;
        return;
      }
      
      // Check if faceapi methods are available
      if (!faceapi.detectSingleFace || !faceapi.TinyFaceDetectorOptions) {
        console.warn('[detectEmotion] ❌ face-api.js methods not available', {
          hasDetectSingleFace: !!faceapi.detectSingleFace,
          hasTinyFaceDetectorOptions: !!faceapi.TinyFaceDetectorOptions,
          faceapiKeys: Object.keys(faceapi)
        });
        emotionBusyRef.current = false;
        return;
      }
      
      console.log('[detectEmotion] 🔍 Running face detection...');
      
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320 })
        )
        .withFaceExpressions();
        
      if (!detection || !detection.expressions) {
        // No face detected, set to neutral with lower confidence
        updateEmotion('neutral', 0.3);
        emotionBusyRef.current = false;
        return;
      }

      const expressions = detection.expressions;
      
      // Map face-api.js emotions to our emotion types
      // face-api.js returns: { neutral, happy, sad, angry, fearful, disgusted, surprised }
      const emotionMap = {
        happy: expressions.happy || 0,
        sad: expressions.sad || 0,
        neutral: expressions.neutral || 0,
        surprised: expressions.surprised || 0,
        angry: (expressions.angry || 0) + (expressions.disgusted || 0), // Combine angry and disgusted
      };
      
      // Debug logging - log every time to see what's happening
      console.log('[detectEmotion] Raw emotion probabilities:', {
        happy: (emotionMap.happy * 100).toFixed(1) + '%',
        sad: (emotionMap.sad * 100).toFixed(1) + '%',
        angry: (emotionMap.angry * 100).toFixed(1) + '%',
        surprised: (emotionMap.surprised * 100).toFixed(1) + '%',
        neutral: (emotionMap.neutral * 100).toFixed(1) + '%',
        rawExpressions: expressions
      });
      
      // Improved emotion detection - more accurate thresholds
      const MIN_THRESHOLD = 0.15; // Minimum confidence to consider an emotion (15%)
      const NEUTRAL_DOMINANCE_THRESHOLD = 0.6; // If neutral is >60%, it's likely dominant
      const EMOTION_OVERRIDE_DIFF = 0.2; // Non-neutral needs to be within 20% of neutral to override
      
      let maxEmotion: Emotion = 'neutral';
      let maxConfidence = emotionMap.neutral;
      
      // Find the highest non-neutral emotion
      const emotions: Emotion[] = ['happy', 'sad', 'angry', 'surprised'];
      let bestNonNeutral: Emotion | null = null;
      let bestNonNeutralConf = 0;
      
      for (const emo of emotions) {
        if (emotionMap[emo] > bestNonNeutralConf) {
          bestNonNeutralConf = emotionMap[emo];
          bestNonNeutral = emo;
        }
      }
      
      // Only override neutral if:
      // 1. Non-neutral emotion is above minimum threshold
      // 2. Non-neutral is close enough to neutral (within override diff) OR neutral is not dominant
      if (bestNonNeutral && bestNonNeutralConf >= MIN_THRESHOLD) {
        const neutralDominant = emotionMap.neutral >= NEUTRAL_DOMINANCE_THRESHOLD;
        const closeToNeutral = bestNonNeutralConf >= emotionMap.neutral - EMOTION_OVERRIDE_DIFF;
        
        if (!neutralDominant || closeToNeutral) {
          maxEmotion = bestNonNeutral;
          maxConfidence = bestNonNeutralConf;
        }
      }
      
      // Final fallback: use highest confidence emotion
      for (const [emotion, confidence] of Object.entries(emotionMap) as Array<[Emotion, number]>) {
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          maxEmotion = emotion;
        }
      }
      
      // Cap confidence at 0.99 for display
      const finalConfidence = Math.min(maxConfidence, 0.99);
      
      // Always log the final result to see what's being detected
      console.log(`[detectEmotion] ✅ Final result: ${maxEmotion} (confidence: ${finalConfidence.toFixed(2)})`, {
        emotionMap,
        maxEmotion,
        maxConfidence: finalConfidence
      });
      
      updateEmotion(maxEmotion, finalConfidence);
    } catch (error) {
      console.warn('[detectEmotion] ❌ Emotion detection error:', error);
      // Don't update emotion on error, keep current state
    } finally {
      emotionBusyRef.current = false;
    }
  }, [modelsStatus, ensureFaceApi, updateEmotion]);

  const handleResults = useCallback(
    (results: any) => {
      const resources = mediapipeRef.current;
      if (!resources) return;
      const { drawConnectors, FACEMESH_TESSELATION } = resources;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {
          color: '#ffffff26',
          lineWidth: 1,
        });

        const noseTip = landmarks[1];
        if (noseTip) {
          const x = noseTip.x * canvas.width;
          const y = noseTip.y * canvas.height;

          smoothingRef.current.x =
            smoothingRef.current.x + (x - smoothingRef.current.x) * SMOOTHING_FACTOR;
          smoothingRef.current.y =
            smoothingRef.current.y + (y - smoothingRef.current.y) * SMOOTHING_FACTOR;

          ctx.beginPath();
          ctx.arc(smoothingRef.current.x, smoothingRef.current.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fff';
          ctx.stroke();

          // Use the SMOOTHED nose position for cursor control to reduce jitter
          // while still reacting quickly to movement.
          let normalizedX = 1 - smoothingRef.current.x / canvas.width;
          let normalizedY = smoothingRef.current.y / canvas.height;
          normalizedX = (normalizedX - 0.5) * NOSE_SENSITIVITY.x + 0.5;
          normalizedY = (normalizedY - 0.5) * NOSE_SENSITIVITY.y + 0.5;
          normalizedX = clamp(normalizedX, 0, 1);
          normalizedY = clamp(normalizedY, 0, 1);

          const viewportX = normalizedX * window.innerWidth;
          const viewportY = normalizedY * window.innerHeight;

          setCursorPosition({
            x: viewportX,
            y: viewportY,
            normalizedX,
            normalizedY,
          });
          setCoordinates({
            x: Math.round(normalizedX * 100),
            y: Math.round(normalizedY * 100),
          });
          cursorRef.current?.classList.remove('hidden');
          cursorRef.current?.classList.add('opacity-100');
          // Call detectEmotion - it will check if models are ready and isTracking
          // Use ref to avoid stale closure issues
          if (isTrackingRef.current) {
            detectEmotion().catch((err) => {
              console.error('[handleResults] Error calling detectEmotion:', err);
            });
          }
          setStatusMessage('Tracking active — move your nose to hover controls.');
        }
      } else {
        cursorRef.current?.classList.remove('opacity-100');
        cursorRef.current?.classList.add('hidden');
        setStatusMessage('No face detected. Please re-align with the camera.');
      }

      ctx.restore();
    },
    [detectEmotion]
  );

  const startCamera = useCallback(async () => {
    if (isTracking || !videoRef.current) return;
    console.log('[startCamera] Starting camera, loading emotion models first...');
    try {
      await loadEmotionModels();
      console.log('[startCamera] Emotion models loaded, status:', modelsStatus);

      const { FaceMesh, Camera } = await ensureMediaPipe();

      if (!faceMeshRef.current) {
        faceMeshRef.current = new FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
      }

      const faceMesh = faceMeshRef.current;
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      faceMesh.onResults(handleResults);

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!faceMeshRef.current || !videoRef.current) return;
          await faceMeshRef.current.send({ image: videoRef.current });
        },
        // Use a slightly lower internal resolution to keep nose tracking smooth
        // while still giving FaceMesh enough detail.
        width: 480,
        height: 360,
      });
      cameraRef.current = camera;
      await camera.start();
      setIsTracking(true);
      setStatusMessage('Tracking active — move your nose to type.');
    } catch (error) {
      console.error('Camera start error', error);
      setStatusMessage(
        'Unable to access camera. Please check permissions and retry.'
      );
    }
  }, [isTracking, handleResults, loadEmotionModels, ensureMediaPipe]);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    if (videoRef.current?.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsTracking(false);
    cursorRef.current?.classList.remove('opacity-100');
    cursorRef.current?.classList.add('hidden');

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    setStatusMessage('Camera stopped.');
  }, []);

  // Ensure MediaPipe resources are released when the component unmounts
  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        try {
          cameraRef.current.stop();
        } catch (error) {
          console.warn('[cleanup] Error stopping camera:', error);
        }
        cameraRef.current = null;
      }

      if (faceMeshRef.current) {
        try {
          faceMeshRef.current.close();
        } catch (error) {
          console.warn('[cleanup] Error closing FaceMesh:', error);
        }
        faceMeshRef.current = null;
      }

      if (videoRef.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !activeProfileId && profiles.length > 0) {
      setActiveProfileId(profiles[0].id);
    }
  }, [mounted, profiles, activeProfileId]);

  const activeVoiceLabel = mounted && activeProfile
    ? `${activeProfile.name} (profile)`
    : `${selectedVoice.name} (quick voice)`;

  const resolveVoice = useCallback(() => {
    if (activeProfileId && activeProfile?.voiceId) {
      return {
        referenceId: activeProfile.voiceId,
        name: activeProfile.name,
        userId: activeProfile.id,
      };
    }
    // Use default voice when activeProfileId is null
    return {
      referenceId: selectedVoice.id,
      name: selectedVoice.name,
      userId: FALLBACK_PROFILE_ID,
    };
  }, [activeProfile, activeProfileId, selectedVoice]);

  const handleSpeak = useCallback(async () => {
    if (speakCooldown) return;
    if (!text.trim()) {
      setStatusMessage('Type something before speaking.');
      return;
    }
    const { referenceId, name, userId } = resolveVoice();
    try {
      setSpeakCooldown(true);
      setTimeout(() => setSpeakCooldown(false), 1500);
      setStatusMessage('Generating expressive speech...');
      const voiceParams =
        EMOTION_VOICE_PARAMS[emotion] ?? EMOTION_VOICE_PARAMS.neutral;
      const processedText = convertTextNumbers(text);
      const response = await fetch(`${PROXY_URL}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: processedText,
          reference_id: referenceId,
          format: 'mp3',
          mp3_bitrate: 128,
          normalize: true,
          prosody: {
            speed: voiceParams.speed,
            volume: voiceParams.volume,
          },
          user_id: userId,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setStatusMessage('Speech complete.');
      };
      await audio.play();
      setStatusMessage(`Speaking via ${name} (${emotion}).`);
    } catch (error) {
      console.error('Speech error', error);
      setStatusMessage(
        'Fish Audio failed. Falling back to system speech synthesis.'
      );
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [text, emotion, resolveVoice, speakCooldown]);

  const handleKeyPress = useCallback(
    (value: string) => {
      if (value === 'ENTER') {
        void handleSpeak();
        return;
      }
      if (value === 'AUTOCOMPLETE') {
        if (!suggestion) return;
        setText((prev) => {
          const trimmed = prev.trimEnd();
          if (!trimmed) {
            return `${suggestion} `;
          }
          const parts = trimmed.split(/\s+/);
          parts[parts.length - 1] = suggestion;
          return `${parts.join(' ')} `;
        });
        return;
      }
      if (value === 'CLEAR') {
        setText('');
        return;
      }
      if (value === 'BACKSPACE') {
        setText((prev) => prev.slice(0, -1));
        return;
      }
      setText((prev) => prev + value);
    },
    [suggestion, handleSpeak]
  );

  useEffect(() => {
    const handlePhysicalKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          (target as HTMLElement).isContentEditable
        ) {
          return;
        }
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handleKeyPress('ENTER');
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        handleKeyPress('BACKSPACE');
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        handleKeyPress(' ');
        return;
      }

      if (event.key.length === 1) {
        event.preventDefault();
        handleKeyPress(event.key);
      }
    };

    window.addEventListener('keydown', handlePhysicalKey);
    return () => window.removeEventListener('keydown', handlePhysicalKey);
  }, [handleKeyPress]);

  const saveProfile = useCallback(
    (profile: VoiceProfile) => {
      setProfiles((prev) => [...prev, profile]);
      setActiveProfileId(profile.id);
      setProfileName('');
    },
    [setProfiles]
  );

  const uploadVoiceAsset = useCallback(
    async (file: Blob, profileId: string) => {
      const formData = new FormData();
      const filename = `voice-${profileId}.webm`;
      formData.append(
        'audio_file',
        file instanceof File ? file : new File([file], filename, { type: file.type || 'audio/webm' })
      );
      formData.append('user_id', profileId);
      const response = await fetch(`${PROXY_URL}/api/create-voice`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Voice creation failed');
      }
      const data = await response.json();
      return data.voice_id || data.reference_id || profileId;
    },
    []
  );

  const startRecording = useCallback(async () => {
    if (recordingState === 'recording' || !profileName.trim()) {
      setUploadStatus('Please name this profile first.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        const profileId = `profile_${Date.now()}`;
        try {
          setRecordingState('processing');
          setUploadStatus('Creating voice model...');
          setUploadProgress(0);
          
          // Start progress simulation
          progressIntervalRef.current = window.setInterval(() => {
            setUploadProgress((prev) => {
              if (prev >= 90) return 90; // Stop at 90% until done
              return prev + Math.random() * 15 + 5; // Increment by 5-20%
            });
          }, 500);
          
          const voiceId = await uploadVoiceAsset(blob, profileId);
          setUploadProgress(100);
          await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause at 100%
          
          saveProfile({
            id: profileId,
            name: profileName.trim(),
            voiceId,
            source: 'recording',
            createdAt: new Date().toISOString(),
          });
          setUploadStatus('Voice profile created from recording.');
        } catch (error) {
          console.error(error);
          setUploadStatus('Recording processing failed.');
        } finally {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          setRecordingState('idle');
          setRecordedMs(0);
          setUploadProgress(0);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordedMs(0);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordedMs((prev) => {
          const next = prev + 1000;
          if (next >= RECORDING_DURATION_MS) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
      setRecordingState('recording');
      setUploadStatus('Recording in progress...');
    } catch (error) {
      console.error('Recording error', error);
      setUploadStatus('Microphone access denied or unavailable.');
    }
  }, [recordingState, profileName, saveProfile, uploadVoiceAsset]);

  const stopRecording = useCallback(() => {
    if (recordingState !== 'recording') return;
    mediaRecorderRef.current?.stop();
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, [recordingState]);

  const handleUploadProfile = useCallback(async () => {
    if (!profileName.trim()) {
      setUploadStatus('Please name this profile before uploading.');
      return;
    }
    if (!uploadFile) {
      setUploadStatus('Choose an audio file first.');
      return;
    }
    try {
      setUploadStatus('Uploading audio and creating voice...');
      setUploadProgress(0);
      setRecordingState('processing');
      const profileId = `profile_${Date.now()}`;
      
      // Start progress simulation
      progressIntervalRef.current = window.setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return 90; // Stop at 90% until done
          return prev + Math.random() * 15 + 5; // Increment by 5-20%
        });
      }, 500);
      
      const voiceId = await uploadVoiceAsset(uploadFile, profileId);
      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause at 100%
      
      saveProfile({
        id: profileId,
        name: profileName.trim(),
        voiceId,
        source: 'upload',
        createdAt: new Date().toISOString(),
        metadata: {
          file: uploadFile.name,
        },
      });
      setUploadStatus('Profile created from uploaded audio.');
      setUploadFile(null);
    } catch (error) {
      console.error(error);
      setUploadStatus('Upload failed. Please try another file.');
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setRecordingState('idle');
      setUploadProgress(0);
    }
  }, [profileName, uploadFile, saveProfile, uploadVoiceAsset]);

  const handleManualProfile = useCallback(async () => {
    if (!profileName.trim() || !manualVoiceId.trim()) {
      setUploadStatus('Profile name and voice ID are required.');
      return;
    }
    const profileId = `profile_${Date.now()}`;
    try {
      await fetch(`${PROXY_URL}/api/save-voice-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profileId,
          voice_id: manualVoiceId.trim(),
        }),
      });
    } catch (error) {
      console.warn('Manual voice sync failed', error);
    }
    saveProfile({
      id: profileId,
      name: profileName.trim(),
      voiceId: manualVoiceId.trim(),
      source: 'manual',
      createdAt: new Date().toISOString(),
      metadata: manualDescription
        ? {
            note: manualDescription,
          }
        : undefined,
    });
    setManualVoiceId('');
    setManualDescription('');
    setUploadStatus('Manual voice saved locally.');
  }, [
    profileName,
    manualVoiceId,
    manualDescription,
    saveProfile,
  ]);

  const handleSaveSearchProfile = useCallback(
    (voice: VoiceSearchResult, name?: string) => {
      setProfilePrompt({
        id: voice.id,
        title: name ?? voice.title ?? 'Fish Audio Voice',
        tags: voice.tags,
      });
    },
    []
  );

  const confirmSearchProfile = useCallback(
    (name: string) => {
      if (!profilePrompt) return;
      saveProfile({
        id: `profile_${Date.now()}`,
        name: name.trim() || profilePrompt.title || 'Fish Audio Voice',
        voiceId: profilePrompt.id,
        source: 'fish',
        createdAt: new Date().toISOString(),
        tags: Array.isArray(profilePrompt.tags)
          ? profilePrompt.tags
          : profilePrompt.tags
          ? [profilePrompt.tags]
          : [],
      });
      setProfilePrompt(null);
    },
    [profilePrompt, saveProfile]
  );

  const removeProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => prev.filter((profile) => profile.id !== id));
      if (activeProfileId === id) {
        setActiveProfileId(null);
      }
    },
    [activeProfileId, setProfiles]
  );

  useEffect(() => {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/);
    const lastWord = words[words.length - 1] ?? '';
    if (!lastWord || lastWord.length < 2 || /^[0-9\W]+$/.test(lastWord)) {
      setSuggestion('');
      return;
    }
    const lower = lastWord.toLowerCase();
    const match = WORD_DICTIONARY.find(
      (word) => word.startsWith(lower) && word !== lower
    );
    setSuggestion(match ?? '');
  }, [text]);

  useEffect(() => {
    if (!voiceQuery.trim()) {
      setVoiceResults([]);
      return;
    }
    setVoiceLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${PROXY_URL}/search-voices?title=${encodeURIComponent(
            voiceQuery.trim()
          )}`,
          { signal: controller.signal }
        );
        const data = await response.json();
        if (data.items) {
          setVoiceResults(data.items);
        } else if (Array.isArray(data)) {
          setVoiceResults(data);
        }
      } catch (error) {
        if (!(error instanceof DOMException)) {
          console.error('Voice search error', error);
        }
      } finally {
        setVoiceLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [voiceQuery]);

  useEffect(() => {
    if (!isTracking) {
      if (hoveredElementRef.current) {
        hoveredElementRef.current.dataset.dwellActive = 'false';
        hoveredElementRef.current = null;
      }
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      if (dwellRepeatRef.current) {
        clearInterval(dwellRepeatRef.current);
        dwellRepeatRef.current = null;
      }
      if (candidateTimerRef.current) {
        clearTimeout(candidateTimerRef.current);
        candidateTimerRef.current = null;
        candidateElementRef.current = null;
      }
      return;
    }
    // Get all eligible elements at cursor point, then select the one with center closest to cursor
    const targetElements: Element[] = document.elementsFromPoint(
      cursorPosition.x,
      cursorPosition.y
    );
    
    // Filter all eligible elements (not just find first)
    let eligibleElements = targetElements.filter(
      (el) =>
        el instanceof HTMLElement &&
        el.dataset.dwellTarget === 'true' &&
        el.getAttribute('aria-disabled') !== 'true' &&
        !(el as HTMLButtonElement).disabled
    ) as HTMLElement[];
    
    // Fallback: if no elements found at exact point, check all dwell targets to see if cursor is within bounds
    // This handles cases where cursor might be slightly off due to jitter
    // Add a small buffer zone (5px) for more reliable detection
    const BUFFER_ZONE = 5;
    if (eligibleElements.length === 0) {
      const allDwellTargets = document.querySelectorAll('[data-dwell-target="true"]');
      for (const el of allDwellTargets) {
        if (
          el instanceof HTMLElement &&
          el.getAttribute('aria-disabled') !== 'true' &&
          !(el as HTMLButtonElement).disabled
        ) {
          const rect = el.getBoundingClientRect();
          if (
            cursorPosition.x >= rect.left - BUFFER_ZONE &&
            cursorPosition.x <= rect.right + BUFFER_ZONE &&
            cursorPosition.y >= rect.top - BUFFER_ZONE &&
            cursorPosition.y <= rect.bottom + BUFFER_ZONE
          ) {
            eligibleElements.push(el);
          }
        }
      }
    }
    
    // Find the element where at least 30-40% of cursor area overlaps with the key
    // This ensures we only select keys that the cursor is truly focused on
    let eligible: HTMLElement | undefined;
    let bestOverlap = 0;
    const MIN_OVERLAP_RATIO = 0.35; // Require at least 35% overlap (between 30-40%)
    const CURSOR_SIZE = 20; // Approximate cursor radius in pixels
    
    for (const el of eligibleElements) {
      const rect = el.getBoundingClientRect();
      
      // Calculate overlap area between cursor circle and element rectangle
      const cursorLeft = cursorPosition.x - CURSOR_SIZE;
      const cursorRight = cursorPosition.x + CURSOR_SIZE;
      const cursorTop = cursorPosition.y - CURSOR_SIZE;
      const cursorBottom = cursorPosition.y + CURSOR_SIZE;
      
      // Calculate intersection rectangle
      const overlapLeft = Math.max(cursorLeft, rect.left);
      const overlapRight = Math.min(cursorRight, rect.right);
      const overlapTop = Math.max(cursorTop, rect.top);
      const overlapBottom = Math.min(cursorBottom, rect.bottom);
      
      // If there's an overlap
      if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
        const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
        const cursorArea = (CURSOR_SIZE * 2) * (CURSOR_SIZE * 2);
        const overlapRatio = overlapArea / cursorArea;
        
        // Only consider elements with sufficient overlap
        if (overlapRatio >= MIN_OVERLAP_RATIO && overlapRatio > bestOverlap) {
          bestOverlap = overlapRatio;
          eligible = el;
        }
      }
    }

    // HYSTERESIS: Don't switch immediately - wait to confirm cursor is stable on new element
    // This prevents rapid switching due to jitter and makes selection SUPER reliable
    const HYSTERESIS_MS = 70; // Wait 70ms (between 50-80ms) before switching to new element
    
    if (eligible === hoveredElementRef.current) {
      // Same element - clear any candidate timer
      if (candidateTimerRef.current) {
        clearTimeout(candidateTimerRef.current);
        candidateTimerRef.current = null;
        candidateElementRef.current = null;
      }
      return;
    }

    // If we have a candidate that's different from current, wait to confirm
    if (eligible && eligible !== hoveredElementRef.current) {
      // If this is a new candidate, start/restart the hysteresis timer
      if (candidateElementRef.current !== eligible) {
        // Clear existing candidate timer
        if (candidateTimerRef.current) {
          clearTimeout(candidateTimerRef.current);
        }
        
        // Set new candidate
        candidateElementRef.current = eligible;
        
        // Wait before actually switching
        candidateTimerRef.current = window.setTimeout(() => {
          // Only switch if candidate is still valid
          if (candidateElementRef.current === eligible && isTrackingRef.current) {
            // Clear previous hover
            if (hoveredElementRef.current) {
              hoveredElementRef.current.dataset.dwellActive = 'false';
            }
            if (dwellTimerRef.current) {
              clearTimeout(dwellTimerRef.current);
              dwellTimerRef.current = null;
            }
            if (dwellRepeatRef.current) {
              clearInterval(dwellRepeatRef.current);
              dwellRepeatRef.current = null;
            }
            
            // Set new hover
            hoveredElementRef.current = eligible;
            eligible.dataset.dwellActive = 'true';
            dwellTimerRef.current = window.setTimeout(() => {
              eligible.dataset.dwellSelected = 'true';
              eligible.click();
              setTimeout(() => {
                eligible.dataset.dwellSelected = 'false';
              }, 250);
              // After the first selection, start auto-repeat while the nose stays on this key.
              const REPEAT_MS = 900;
              if (dwellRepeatRef.current) {
                clearInterval(dwellRepeatRef.current);
              }
              dwellRepeatRef.current = window.setInterval(() => {
                if (
                  hoveredElementRef.current === eligible &&
                  isTrackingRef.current
                ) {
                  eligible.dataset.dwellSelected = 'true';
                  eligible.click();
                  window.setTimeout(() => {
                    eligible.dataset.dwellSelected = 'false';
                  }, 180);
                } else {
                  if (dwellRepeatRef.current) {
                    clearInterval(dwellRepeatRef.current);
                    dwellRepeatRef.current = null;
                  }
                }
              }, REPEAT_MS);
            }, DWELL_SELECT_MS);
            
            candidateElementRef.current = null;
            candidateTimerRef.current = null;
          }
        }, HYSTERESIS_MS);
      }
      return; // Wait for hysteresis timer
    }

    // No eligible element found - clear everything
    if (candidateTimerRef.current) {
      clearTimeout(candidateTimerRef.current);
      candidateTimerRef.current = null;
      candidateElementRef.current = null;
    }
    if (hoveredElementRef.current) {
      hoveredElementRef.current.dataset.dwellActive = 'false';
      hoveredElementRef.current = null;
    }
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (dwellRepeatRef.current) {
      clearInterval(dwellRepeatRef.current);
      dwellRepeatRef.current = null;
    }
  }, [cursorPosition, isTracking]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Camera drag handlers
  const handleCameraMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag from the header area, not buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    if (!cameraDragRef.current) return;
    const rect = cameraDragRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cameraDragRef.current) return;
      const cameraWidth = 256; // w-64 = 256px
      const cameraHeight = 320; // h-80 = 320px
      
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport
      newX = Math.max(0, Math.min(newX, window.innerWidth - cameraWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - cameraHeight));
      
      setCameraPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <main className="h-screen overflow-hidden bg-gray-100 flex flex-col">
      <Navbar />
      <div className="flex flex-1 min-h-0 w-full flex-col">
        {/* Main content area */}
        <div className="flex min-h-0 flex-1 gap-6 p-6 bg-gray-50">
          {/* LEFT: Keyboard, Text, and Camera */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-row gap-3 items-stretch">
              <div className="flex-1">
                <TextComposer text={text} suggestion={suggestion} onClear={() => setText('')} />
              </div>
              <div className="w-64 flex-shrink-0">
                <EmotionWidget
                  emotion={emotion}
                  confidence={emotionConfidence}
                  isTracking={isTracking}
                  emoji={EMOTION_EMOJI[emotion]}
                  label={EMOTION_LABEL[emotion]}
                />
              </div>
            </div>
            <div className="flex min-h-0 flex-1 gap-3">
              <div className="flex-1 min-h-0 flex flex-col">
                <VirtualKeyboard
                  layout={KEYBOARD_LAYOUT}
                  onKeyPress={handleKeyPress}
                  suggestionAvailable={Boolean(suggestion)}
                />
              </div>
              <div className="w-64 flex-shrink-0 flex flex-col gap-3">
                <Card padding="md">
                  <div className="flex flex-col gap-3">
                    <CameraPanel
                      videoRef={videoRef as React.RefObject<HTMLVideoElement>}
                      canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
                      onStart={startCamera}
                      onStop={stopCamera}
                      emotionConfidence={emotionConfidence}
                      isTracking={isTracking}
                    />
                  
                    <div className="flex flex-col gap-2.5">
                    <UIButton
                      onClick={isTracking ? stopCamera : startCamera}
                      data-dwell-target="true"
                      variant={isTracking ? "danger" : "primary"}
                      size="md"
                      fullWidth
                    >
                      {isTracking ? "Stop Camera" : "Start Camera"}
                    </UIButton>
                    <UIButton
                      onClick={() => handleKeyPress('ENTER')}
                      data-dwell-target="true"
                      variant="primary"
                      size="md"
                      fullWidth
                    >
                      Speak
                    </UIButton>
                  </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* RIGHT: Voice controls */}
          <div className="flex w-[400px] min-w-0 min-h-0">
            <ProfilesPanel
              mounted={mounted}
              profiles={profiles}
              activeProfileId={activeProfileId}
              onActivate={(id) => setActiveProfileId(id)}
              onRemove={removeProfile}
              onSaveFromVoice={handleSaveSearchProfile}
              profileTab={profileTab}
              onTabChange={(tab) => setProfileTab(tab)}
              profileName={profileName}
              onProfileNameChange={setProfileName}
              manualVoiceId={manualVoiceId}
              onManualVoiceIdChange={setManualVoiceId}
              manualDescription={manualDescription}
              onManualDescriptionChange={setManualDescription}
              onManualSave={handleManualProfile}
              onUploadProfile={handleUploadProfile}
              uploadStatus={uploadStatus}
              startRecording={startRecording}
              stopRecording={stopRecording}
              recordingState={recordingState}
              recordedMs={recordedMs}
              uploadProgress={uploadProgress}
              onFileChange={setUploadFile}
              uploadFile={uploadFile}
              voiceQuery={voiceQuery}
              onVoiceQueryChange={setVoiceQuery}
              voiceResults={voiceResults}
              voiceLoading={voiceLoading}
              selectedVoiceId={selectedVoice.id}
              onSelectVoice={(voice) => setSelectedVoice(voice)}
              defaultVoiceId={DEFAULT_VOICE_REFERENCES.male.id}
              defaultVoiceName={DEFAULT_VOICE_REFERENCES.male.name}
            />
          </div>
        </div>
      </div>

      <div
        ref={cursorRef}
        className="pointer-events-none fixed left-0 top-0 z-50 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-blue-9 bg-blue-9/80 shadow-[0_0_35px_rgba(42,157,244,0.6)] transition-opacity duration-200 md:block opacity-0"
      >
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </div>

      {profilePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <Card padding="lg" className="w-full max-w-md shadow-xl">
            <Flex direction="column" gap="5">
              <div>
                <Heading size="5" mb="2">
                  Save "{profilePrompt.title}"
                </Heading>
                <Text size="2" color="gray">
                  Give this Fish Audio voice a friendly name for quick access later.
                </Text>
              </div>
              <TextField.Root
                defaultValue={profilePrompt.title}
                onChange={(event) =>
                  setProfilePrompt((prev) =>
                    prev ? { ...prev, title: event.target.value } : prev
                  )
                }
                placeholder="Profile name"
                size="3"
              />
              <Flex gap="3" justify="end">
                <UIButton
                  variant="ghost"
                  onClick={() => setProfilePrompt(null)}
                  size="md"
                >
                  Cancel
                </UIButton>
                <UIButton
                  onClick={() =>
                    confirmSearchProfile(profilePrompt.title || 'Fish Voice')
                  }
                  variant="primary"
                  size="md"
                >
                  Save Profile
                </UIButton>
              </Flex>
            </Flex>
          </Card>
        </div>
      )}
    </main>
  );
}

