# The "Expressive" AAC Board

> **The Next-Gen Accessibility Tool That Actually Conveys Feeling**

An innovative Augmentative and Alternative Communication (AAC) system that combines **Computer Vision**, **Machine Learning**, and **Fish Audio API** to solve the biggest problem with current accessibility tools: **they sound like robots**.

**Built for MadHacks 2025 - Fish API Track**

## The Problem

Stephen Hawking's voice was iconic, but it was famously monotonic. People with ALS or motor impairments use eye-tracking or similar systems to type, but the output is always flat. They can't:
- Whisper a secret
- Shout for help
- Tell a joke with sarcasm
- Express frustration or joy

**Current AAC tools produce robotic, emotionless speech that strips away the human element of communication.**

## The Solution

This app uses your webcam for **two things simultaneously**:

1. **Nose Tracking** (via MediaPipe Face Mesh): Select words and letters on a virtual keyboard by moving your nose
2. **ML-Based Emotion Detection** (via face-api.js): Uses machine learning models to analyze your facial expressions in real-time (smile, frown, raised eyebrows)

**The Integration:**
- If you select "Hello" while **smiling** → the app sends `(happy) Hello` to the API
- If you select "No" while **frowning** → it sends `(angry) No`
- The result? **Natural, expressive speech that actually conveys feeling**

### Voice Options

**Three Ways to Choose Your Voice:**

1. **Personal Voice Cloning** (Recommended for personal use)
   - Record 30 seconds of your voice directly in the browser
   - Or upload an audio file (30 seconds recommended)
   - Creates a personalized voice model that sounds like you
   - Perfect for users who want to preserve their original voice

2. **Voice Search & Browser** (Explore 200,000+ voices)
   - Search by name, tags, or characteristics
   - Browse through a massive library of voices
   - Select any voice that matches your preference
   - Great for trying different voices or finding specific character voices

3. **Quick Select** (Fast default options)
   - One-click selection of Male or Female voices
   - Perfect for quick setup or testing

## Features

- **Nose Tracking**: Navigate and type using only nose movements - perfect for users with motor impairments
- **ML-Based Real-time Emotion Detection**: Uses machine learning models (face-api.js) to automatically detect facial expressions (happy, sad, angry, surprised, neutral)
- **Expressive Text-to-Speech**: Converts typed text to speech with emotion modulation
- **Voice Search & Browser**: Search and select from 200,000+ voices using an autocomplete search interface with keyboard navigation
- **Personal Voice Cloning**: Record or upload 30 seconds of audio to create your own personalized voice model
- **Voice Management**: Clear your personal voice anytime and switch between personal, searched, or default voices
- **Dwell Selection**: Hover over keys for 0.5 seconds to select (configurable) - works with keyboard, buttons, and voice search results
- **Privacy-First**: All face processing happens client-side in your browser

## Quick Start

### Prerequisites

- Modern web browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Webcam access
- Good lighting for face detection

### Installation

1. Clone the repository:
```bash
git clone https://github.com/anishsrinivasa/MadHacksSubmission2025.git
cd MadHacksSubmission2025
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Start both servers:

**Option A: Using the startup script (Windows)**
```bash
start.bat
```

**Option B: Manual start (all platforms)**

Terminal 1 - Proxy Server:
```bash
python proxy.py
```

Terminal 2 - HTTP Server:
```bash
python -m http.server 8000
```

4. Navigate to `http://localhost:8000` in your browser

**Why two servers?**
- **HTTP Server (port 8000)**: Serves the web application
- **Proxy Server (port 5001)**: 
  - Proxies API calls to avoid CORS restrictions
  - Provides voice search endpoint using Python SDK
  - Handles voice cloning (create, status, clear) endpoints
  - Manages voice storage for personal voices

### Configuration

1. The `config.js` file is already included with default settings. The API key is configured in `proxy.py`.

2. Get your API key from [Fish Audio](https://fishaudio.com) and update it in `proxy.py`:
```python
FISH_AUDIO_API_KEY = 'your_api_key_here'
```

3. Install Python dependencies (includes SDK for voice search):
```bash
pip install -r requirements.txt
```

**Note**: The Python SDK (`fish-audio-sdk`) is required for voice search functionality. If not installed, the system will fall back to REST API calls.

## How It Works

### Step-by-Step Usage

1. **Start the Camera**: Click the "Start Camera" button and allow camera permissions
2. **Position Yourself**: Sit in front of your webcam with good lighting
3. **Select a Voice** (optional):
   - **Search for a voice**: Type in the voice search box to browse 200,000+ voices
   - **Quick select**: Use the Male/Female quick-select buttons
   - **Create personal voice**: Record 30 seconds or upload an audio file in the "Personal Voice" section
4. **Navigate**: Move your nose to hover over keys on the virtual keyboard
5. **Select Keys**: Hold your nose over a key for 0.5 seconds to select it
6. **Type Your Message**: Build your text using the keyboard
7. **Express Emotion**: Your facial expressions are detected in real-time (shown in sidebar)
8. **Speak**: Click "SPEAK" to convert your text to speech with emotion modulation using your selected voice

### Voice Selection Priority

The app uses voices in this order:
1. **Personal Voice** (if you've created one) - Your own cloned voice
2. **Selected Voice from Search** - Any voice you've selected from the 200k+ voice library
3. **Default Voice** - Falls back to Male (American) if nothing is selected

### How ML-Based Emotion Detection Works

The app uses **machine learning models** (face-api.js) to continuously analyze your facial expressions while you type:
- **Smile** → ML model detects as "happy" → Speech will sound joyful
- **Frown** → ML model detects as "sad" → Speech will sound melancholic
- **Raised eyebrows** → ML model detects as "surprised" → Speech will sound excited
- **Neutral** → Default tone

The ML models run entirely in your browser, processing facial landmarks and expression patterns in real-time. When you click "SPEAK", the app combines your typed text with your detected emotion and generates natural, expressive speech with the full range of human emotion.

## Use Cases

- **ALS/Motor Impairments**: Enables expressive communication for users who cannot use traditional input methods
- **Accessibility**: Hands-free typing for anyone with limited mobility
- **Expressive Communication**: Conveys emotion through speech, not just words - the key differentiator from traditional AAC tools

## Technology Stack

**Fish API Track Technologies:**
- **Fish Audio API**: Core text-to-speech service with emotion modulation and expressive speech generation
- **Fish Audio Python SDK**: Voice search and browsing functionality across 200,000+ voice library
- **Fish Audio Voice Cloning**: Personal voice model creation and management

**Supporting Technologies:**
- **MediaPipe Face Mesh**: Nose tracking and facial landmark detection
- **face-api.js**: ML-based real-time emotion recognition from facial expressions (uses TinyFaceDetector and FaceExpressionNet models)
- **Flask**: Python proxy server for API calls and voice cloning endpoints
- **Vanilla JavaScript**: No framework dependencies - lightweight and fast

## Project Structure

```
MadHacksSubmission2025/
├── index.html          # Main HTML file
├── app.js              # Core application logic (nose tracking, emotion detection, TTS, voice search)
├── config.js           # Configuration (voice settings, emotion parameters)
├── style.css           # Styling
├── proxy.py            # API proxy server (CORS, voice search, voice cloning)
├── requirements.txt    # Python dependencies (Flask, Fish Audio SDK, Pillow)
├── start.bat           # Startup script (Windows) - runs both servers
├── voice_storage.json  # Local storage for personal voice IDs (auto-generated)
└── README.md           # This file
```

## Customization

### Adjust Dwell Time

Edit `config.js`:
```javascript
const CONFIG = {
    DWELL_TIME: 750 // Increase to 750ms for slower selection
};
```

### Change Emotion Detection Sensitivity

Modify the emotion detection interval in `app.js`:
```javascript
emotionDetectionInterval = setInterval(detectEmotion, 100); // Adjust interval (ms)
```

## Privacy

- All face processing happens **client-side** in your browser
- No video or facial data is sent to external servers (except for TTS API calls with text only)
- Camera feed is never recorded or stored
- Your privacy is protected - facial analysis stays on your device

## Troubleshooting

### Camera not working
- Ensure camera permissions are granted
- Check that no other app is using the camera
- Try refreshing the page

### Face detection not working
- Ensure good lighting
- Position face clearly in front of camera
- Wait for models to load (first time may take a moment)

### TTS not working
- Ensure both servers are running (HTTP server on port 8000, proxy on port 5001)
- Check your API key in `proxy.py`
- Verify API key is valid and has credits
- Check browser console for error messages
- Verify proxy server is running: visit `http://localhost:5001/health`
- If you see CORS errors, make sure the proxy server is running

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

## Why This Matters

Traditional AAC tools strip away the human element of communication. This project bridges that gap by:

1. **Keeping the Computer Vision hook** - Using webcam for hands-free input (nose tracking)
2. **Leveraging expressive speech synthesis** - Solving the robotic voice problem with emotion-modulated speech
3. **Combining both simultaneously** - Detecting emotion while typing, then applying it to speech

**Result**: Users can finally communicate with the full range of human expression, not just words.

## License

MIT License - Feel free to use for your projects!

## Credits

Built for **MadHacks 2025 - Fish API Track** - Combining accessibility with cutting-edge AI for expressive communication.

**The "Expressive" AAC Board** - Because communication should sound human, not robotic.

---

**Made with love for accessibility**
