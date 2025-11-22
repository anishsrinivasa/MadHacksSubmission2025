# The "Expressive" AAC Board

> **The Next-Gen Accessibility Tool That Actually Conveys Feeling**

An innovative Augmentative and Alternative Communication (AAC) system that combines **Computer Vision** with **Fish Audio** to solve the biggest problem with current accessibility tools: **they sound like robots**.

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
2. **Emotion Detection** (via face-api.js): Analyze your facial expressions in real-time (smile, frown, raised eyebrows)

**The Fish Audio Hook:**
- If you select "Hello" while **smiling** → the app sends `(happy) Hello` to Fish Audio
- If you select "No" while **frowning** → it sends `(angry) No`
- The result? **Natural, expressive speech that actually conveys feeling**

### Bonus: Voice Cloning
Use voice cloning so it sounds like you (from before you lost your voice), not a generic robot.

## Features

- **Nose Tracking**: Navigate and type using only nose movements - perfect for users with motor impairments
- **Real-time Emotion Detection**: Automatically detects facial expressions (happy, sad, angry, surprised, neutral, disgusted, fearful)
- **Expressive Text-to-Speech**: Converts typed text to speech with emotion modulation using Fish Audio API
- **Voice Cloning Support**: Optional voice cloning to sound like your original voice
- **Dwell Selection**: Hover over keys for 0.5 seconds to select (configurable)
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

2. Install Python dependencies (for Fish Audio proxy):
```bash
pip install -r requirements.txt
```

3. Start both servers:

**Option A: Using the startup script (Windows)**
```bash
start.bat
```

**Option B: Manual start (all platforms)**

Terminal 1 - Fish Audio Proxy Server:
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
- **Proxy Server (port 5000)**: Proxies Fish Audio API calls to avoid CORS restrictions

### Configuration

1. Create a `config.js` file in the root directory:
```javascript
const CONFIG = {
    FISH_AUDIO_API_KEY: 'your_api_key_here',
    FISH_AUDIO_API_URL: 'https://api.fishaudio.com/v1/text-to-speech',
    VOICE_ID: '', // Optional: cloned voice ID
    DWELL_TIME: 500 // milliseconds (0.5 seconds)
};
```

2. Get your Fish Audio API key from [Fish Audio](https://fishaudio.com)

## How It Works

### Step-by-Step Usage

1. **Start the Camera**: Click the "Start Camera" button and allow camera permissions
2. **Position Yourself**: Sit in front of your webcam with good lighting
3. **Navigate**: Move your nose to hover over keys on the virtual keyboard
4. **Select Keys**: Hold your nose over a key for 0.5 seconds to select it
5. **Type Your Message**: Build your text using the keyboard
6. **Express Emotion**: Your facial expressions are detected in real-time (shown in sidebar)
7. **Speak**: Click "SPEAK" to convert your text to speech with emotion modulation

### How Emotion Detection Works

The app continuously analyzes your facial expressions while you type:
- **Smile** → Detected as "happy" → Speech will sound joyful
- **Frown** → Detected as "sad" → Speech will sound melancholic
- **Raised eyebrows** → Detected as "surprised" → Speech will sound excited
- **Neutral** → Default tone

When you click "SPEAK", the app combines your typed text with your detected emotion and sends it to Fish Audio API, which generates natural, expressive speech.

## Use Cases

- **ALS/Motor Impairments**: Enables expressive communication for users who cannot use traditional input methods
- **Accessibility**: Hands-free typing for anyone with limited mobility
- **Expressive Communication**: Conveys emotion through speech, not just words - the key differentiator from traditional AAC tools

## Technology Stack

- **MediaPipe Face Mesh**: Nose tracking and facial landmark detection
- **face-api.js**: Real-time emotion recognition from facial expressions
- **Fish Audio API**: Expressive text-to-speech with emotion modulation
- **Vanilla JavaScript**: No framework dependencies - lightweight and fast

## Project Structure

```
MadHacksSubmission2025/
├── index.html          # Main HTML file
├── app.js              # Core application logic (nose tracking, emotion detection, TTS)
├── config.js           # Configuration (API keys, voice settings, emotion parameters)
├── style.css           # Styling
├── proxy.py            # Fish Audio API proxy server (solves CORS)
├── requirements.txt    # Python dependencies for proxy server
├── start.bat           # Startup script (Windows) - runs both servers
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
- Ensure both servers are running (HTTP server on port 8000, proxy on port 5000)
- Check your API key in `config.js`
- Verify API key is valid and has credits
- Check browser console for error messages
- Verify proxy server is running: visit `http://localhost:5000/health`
- If you see CORS errors, make sure the proxy server is running

## Why This Matters

Traditional AAC tools strip away the human element of communication. This project bridges that gap by:

1. **Keeping the Computer Vision hook** - Using webcam for hands-free input (nose tracking)
2. **Adding Fish Audio** - Solving the robotic voice problem with expressive, emotion-modulated speech
3. **Combining both simultaneously** - Detecting emotion while typing, then applying it to speech

**Result**: Users can finally communicate with the full range of human expression, not just words.

## License

MIT License - Feel free to use for your projects!

## Credits

Built for **MadHacks 2025** - Combining accessibility with cutting-edge AI for expressive communication.

**The "Expressive" AAC Board** - Because communication should sound human, not robotic.

---

**Made with love for accessibility**
