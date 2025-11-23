# Unsilenced
### An expressive AAC System that helps the specially-abled reclaim their voices and connect emotionably

Unsilenced is a hands-free AAC communication tool that uses nose tracking and real-time emotion detection to generate expressive speech through Fish Audio API. Built for **MadHacks 2025 - Fish API Track**.

## About

Mainstream AAC tools strip away emotion from communication, leading to robotic, monotone speech. Unsilenced uses your nose as a pointer to type and detects facial emotions in real time with machine learning. It combines typed text with detected emotions to generate natural-sounding speech through Fish Audio. Users can clone their own voice, search 200,000+ AI voices, or create custom voice profiles.

## Development

**Tech Stack**: Frontend built with Next.js, MediaPipe Face Mesh for nose tracking, and face-api.js for emotion detection. Backend uses Flask proxy server to handle CORS and Fish Audio API calls. Voice synthesis powered by Fish Audio API with emotion modulation via prosody parameters. Voice search uses Fish Audio Python SDK for browsing 200,000+ voices.

**Challenges**: We hit a CORS error when accessing Fish Audio API directly from the browser, solved by creating a Flask proxy server. Emotion modulation required using Fish Audio's "prosody" object (speed/volume) instead of inline text commands. Information tooltips were being clipped by parent containers, fixed with proper CSS containment.

**Results**: We achieved 84% accuracy on emotion detection (above the 75-80% industry average). Our system is over 100% faster than Dr. Stephen Hawking's synthesizer (3m21s vs 7 minutes for a 35-word response). We learned that combining MediaPipe, face-api.js, and Fish Audio required careful timing and state management to synchronize nose tracking, emotion detection, and speech synthesis in real-time. Processing facial recognition entirely client-side maintained user privacy and improved performance. Most importantly, we realized that solving overlooked problems in accessibility technology can make a real impact.

**Future Plans**: Multi-language support using Fish Audio API capabilities, scaling the tool into a full product, and reaching 100 active users per month.

## Features

- **Nose Tracking**: Navigate and type using only nose movements via MediaPipe Face Mesh - perfect for users with motor impairments
- **ML-Based Real-time Emotion Detection**: Uses machine learning models (face-api.js) to automatically detect facial expressions (happy, sad, angry, surprised, neutral) with 84% accuracy
- **Expressive Text-to-Speech**: Converts typed text to speech with emotion modulation using Fish Audio API prosody parameters
- **Voice Cloning**: Record 30 seconds of audio directly in the browser or upload an audio file to create personalized voice models
- **Voice Search & Browser**: Search and select from 200,000+ voices using Fish Audio Python SDK with autocomplete search interface
- **Voice Profile Management**: Save, activate, and manage multiple voice profiles for different use cases
- **Autocomplete Word Suggestions**: Intelligent word completion based on a dictionary of common words and AAC phrases (2,800+ words)
- **Dwell Selection**: Adaptive hover-based selection mechanism that adjusts timing based on cursor overlap for improved accuracy
- **Progress Tracking**: Real-time progress bars for voice model creation and upload processes
- **Privacy-First Design**: All face processing happens client-side in the browser - no video or facial data sent to external servers

## Technology Stack

**Fish API Track Technologies:**
- **Fish Audio API**: Core text-to-speech service with emotion modulation and expressive speech generation
- **Fish Audio Python SDK**: Voice search and browsing functionality across 200,000+ voice library
- **Fish Audio Voice Cloning**: Personal voice model creation and management via REST API

**Frontend:**
- **Next.js 16**: React framework with TypeScript for modern web application
- **React 19**: UI library for component-based architecture
- **Tailwind CSS 4**: Utility-first CSS framework for styling
- **Radix UI**: Component library for accessible UI primitives (Themes, Tabs, ScrollArea)
- **MediaPipe Face Mesh**: Google's framework for facial landmark detection and nose tracking
- **face-api.js**: Machine learning library for face detection and emotion recognition in the browser

**Backend:**
- **Flask 3.0**: Python web framework for proxy server
- **Flask-CORS**: CORS handling for cross-origin requests
- **Requests**: HTTP library for API communication
- **Pillow**: Image processing library for voice cloning cover image generation
- **fish-audio-sdk**: Official Python SDK for Fish Audio API integration

**Supporting Technologies:**
- **TypeScript**: Type-safe JavaScript development
- **LocalStorage**: Client-side storage for voice profiles and settings
- **WebRTC**: Browser APIs for camera and microphone access
- **MediaRecorder API**: Browser API for audio recording

## Installation & Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+
- Modern web browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Webcam access
- Good lighting for face detection

### Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/anishsrinivasa/MadHacksSubmission2025.git
cd MadHacksSubmission2025
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Install Node.js dependencies:**
```bash
cd next-ui
npm install
```

4. **Configure API Key:**

Update the Fish Audio API key in `proxy.py`:
   ```python
   FISH_AUDIO_API_KEY = 'your_api_key_here'
   ```

Get your API key from [Fish Audio](https://fishaudio.com)

5. **Start the servers:**

**Terminal 1 - Flask Proxy Server:**
   ```bash
   python proxy.py
   ```
   The proxy server will run on `http://localhost:5001`

**Terminal 2 - Next.js Frontend:**
   ```bash
cd next-ui
npm run dev
```
The frontend will run on `http://localhost:3000`

6. **Open in browser:**
Navigate to `http://localhost:3000` in your browser

## Usage

### Getting Started

1. **Start the Camera**: Click the "Start Camera" button and allow camera permissions
2. **Position Yourself**: Sit in front of your webcam with good lighting
3. **Select a Voice** (optional):
   - **Search for a voice**: Type in the voice search box to browse 200,000+ voices from Fish Audio
   - **Quick select**: Use the Male/Female quick-select buttons
   - **Create personal voice**: Record 30 seconds or upload an audio file in the "Voice Profiles" panel
4. **Navigate**: Move your nose to hover over keys on the virtual keyboard
5. **Select Keys**: Hold your nose over a key for 750ms (dwell time) to select it
6. **Type Your Message**: Build your text using the keyboard
7. **Express Emotion**: Your facial expressions are detected in real-time and displayed in the emotion widget
8. **Speak**: Click "Speak" to convert your text to speech with emotion modulation using your selected voice

### Voice Selection Priority

The app uses voices in this order:
1. **Active Voice Profile** (if you've activated one) - Your saved voice profile
2. **Selected Voice from Search** - Any voice you've selected from the 200k+ voice library
3. **Default Voice** - Falls back to Male (American) if nothing is selected

### Voice Profile Management

**Creating a Voice Profile:**
- **Record**: Click the red record button and speak for 30 seconds to create a voice clone
- **Upload**: Upload a 30-second audio file (MP3, WAV, WEBM supported)
- **Explore**: Search and save voices from Fish Audio's library
- **Manual**: Enter a voice ID manually if you've created a voice in Fish Audio dashboard

**Managing Profiles:**
- Click on any profile card to activate it
- Use the trash icon to remove a profile
- Profiles are saved locally in your browser

### Emotion Detection

The app continuously analyzes your facial expressions while you type:
- **Smile** → Detected as "happy" → Speech will sound joyful (faster speed, normal volume)
- **Frown** → Detected as "sad" → Speech will sound melancholic (slower speed, quieter)
- **Raised eyebrows** → Detected as "surprised" → Speech will sound excited (faster speed, louder)
- **Furrowed brow** → Detected as "angry" → Speech will sound intense (faster speed, louder)
- **Neutral** → Default tone (normal speed and volume)

Emotion detection uses machine learning models that run entirely in your browser for privacy.

### Autocomplete

The keyboard includes an "Autocomplete" button that suggests word completions based on the current word you're typing. Suggestions come from a dictionary of 2,800+ common words and AAC phrases.

## Project Structure

```
MadHacksSubmission2025/
├── next-ui/                      # Next.js frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── app/
│   │   │   │   └── page.tsx     # Main application page (nose tracking, emotion, TTS)
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── page.tsx          # Landing page
│   │   │   └── globals.css       # Global styles
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── CameraPanel.tsx      # Camera display component
│   │   │   │   ├── EmotionWidget.tsx    # Emotion display widget
│   │   │   │   ├── HeaderSection.tsx    # Status bar and info display
│   │   │   │   ├── ProfilesPanel.tsx    # Voice profile management
│   │   │   │   ├── TextComposer.tsx     # Text input and display
│   │   │   │   ├── VirtualKeyboard.tsx  # On-screen keyboard
│   │   │   │   └── VoiceExplorer.tsx    # Voice search interface
│   │   │   ├── Navbar.tsx               # Navigation bar
│   │   │   └── ui/                      # Reusable UI components
│   │   ├── lib/
│   │   │   ├── config.ts                # Configuration constants
│   │   │   ├── numberConverter.ts       # Number to word conversion
│   │   │   └── wordDictionary.ts        # Autocomplete word dictionary
│   │   └── types/
│   │       ├── index.ts                 # TypeScript type definitions
│   │       └── mediapipe.d.ts           # MediaPipe type definitions
│   ├── package.json
│   └── next.config.ts
├── proxy.py                      # Flask proxy server (CORS, voice cloning, voice search)
├── requirements.txt              # Python dependencies
├── voice_storage.json            # Local voice ID storage (auto-generated)
└── README.md                     # This file
```

## Configuration

### Nose Tracking Sensitivity

Edit `next-ui/src/lib/config.ts`:
```typescript
export const NOSE_SENSITIVITY = {
  x: 4.1,  // Horizontal sensitivity
  y: 4.2,  // Vertical sensitivity
};
```

### Dwell Time

Edit `next-ui/src/lib/config.ts`:
```typescript
export const DWELL_SELECT_MS = 750; // Time to hover before selection (milliseconds)
```

### Smoothing Factor

Edit `next-ui/src/lib/config.ts`:
```typescript
export const SMOOTHING_FACTOR = 0.25; // Lower = smoother but more lag
```

### Emotion Detection Sensitivity

Edit `next-ui/src/app/app/page.tsx` to adjust emotion detection thresholds:
- `SAD_MIN_THRESHOLD`: Minimum confidence for sad emotion detection
- `ANGRY_MIN_THRESHOLD`: Minimum confidence for angry emotion detection
- `NEUTRAL_DOMINANCE_THRESHOLD`: Threshold for neutral emotion dominance

## Troubleshooting

### Camera not working
- Ensure camera permissions are granted
- Check that no other app is using the camera
- Try refreshing the page
- Verify browser supports WebRTC

### Face detection not working
- Ensure good lighting (face should be clearly visible)
- Position face clearly in front of camera
- Wait for emotion models to load (first time may take a moment)
- Check browser console for error messages

### TTS not working
- Ensure both servers are running (proxy on port 5001, Next.js on port 3000)
- Check your API key in `proxy.py`
- Verify API key is valid and has credits
- Check browser console for error messages
- Verify proxy server is running: visit `http://localhost:5001/health`

### Voice search not working
- Ensure Python SDK is installed: `pip install fish-audio-sdk`
- Check proxy server console for SDK initialization messages
- The system will fall back to REST API if SDK is not available
- Verify your API key has access to voice search features

### Voice cloning not working
- Ensure Pillow is installed: `pip install Pillow` (required for cover image generation)
- Check that you're recording/uploading at least 30 seconds of audio
- Verify audio file format is supported (WebM, MP3, WAV)
- Check proxy server console for detailed error messages
- Ensure microphone permissions are granted if recording

### CORS errors
- Make sure the Flask proxy server is running on port 5001
- Verify `NEXT_PUBLIC_PROXY_URL` in `next-ui/src/lib/config.ts` matches your proxy server URL
- Check that Flask-CORS is properly installed and enabled

## Privacy & Security

- **Client-Side Processing**: All facial recognition and emotion detection happens entirely in your browser using WebAssembly and TensorFlow.js models. No video or facial data is sent to external servers.
- **API Calls**: Only text and audio files (for voice cloning) are sent to Fish Audio API. Facial images are never transmitted.
- **Local Storage**: Voice profiles and settings are stored locally in your browser using localStorage.
- **No Tracking**: The application does not include any analytics or tracking code.

## Performance

- **Emotion Detection**: 84% accuracy on standard emotion recognition datasets
- **Speed**: Over 100% faster than Dr. Stephen Hawking's synthesizer (3m21s vs 7 minutes for 35-word response)
- **Real-Time Processing**: Both nose tracking and emotion detection run at 30+ FPS in modern browsers
- **Memory Efficient**: Models are loaded once and cached for the session

## License

MIT License - Feel free to use for your projects!


