export type Emotion = 'happy' | 'sad' | 'neutral' | 'surprised' | 'angry';

export type VoiceProfileSource = 'fish' | 'recording' | 'upload' | 'manual';

export interface VoiceProfile {
  id: string;
  name: string;
  voiceId: string | null;
  source: VoiceProfileSource;
  createdAt: string;
  description?: string;
  tags?: string[];
  lastSyncedVoiceId?: string | null;
  metadata?: Record<string, string>;
}

export interface VoiceSearchResult {
  id: string;
  title: string;
  tags?: string[] | string;
}

