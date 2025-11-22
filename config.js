// Fish Audio API Configuration
const CONFIG = {
    FISH_AUDIO_API_KEY: 'e216cf13d15d4dfa9072558b9c6c9a3e',
    FISH_AUDIO_BASE_URL: 'https://api.fish.audio/v1',

    // Emotion to voice parameter mapping
    EMOTION_VOICE_PARAMS: {
        happy: {
            speed: 1.1,
            pitch: 1.1,
            energy: 1.2
        },
        sad: {
            speed: 0.9,
            pitch: 0.9,
            energy: 0.7
        },
        neutral: {
            speed: 1.0,
            pitch: 1.0,
            energy: 1.0
        },
        surprised: {
            speed: 1.15,
            pitch: 1.2,
            energy: 1.3
        },
        angry: {
            speed: 1.05,
            pitch: 0.95,
            energy: 1.3
        }
    }
};
