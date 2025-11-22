// DOM Elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const canvasCtx = canvas.getContext('2d');
const keyboardCursor = document.getElementById('keyboardCursor');
const keyboardWrapper = document.querySelector('.keyboard-wrapper');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const coordX = document.getElementById('coordX');
const coordY = document.getElementById('coordY');
const textOutput = document.getElementById('textOutput');
const keyboard = document.getElementById('keyboard');
const keys = document.querySelectorAll('.key');
const emotionIcon = document.getElementById('emotionIcon');
const emotionLabel = document.getElementById('emotionLabel');
const confidenceFill = document.getElementById('confidenceFill');
const confidenceText = document.getElementById('confidenceText');
const voiceRadios = document.querySelectorAll('input[name="voice"]');

// State
let camera = null;
let faceMesh = null;
let isTracking = false;
let selectedVoice = 'female'; // Default voice selection

// Smoothing variables
let smoothedX = 0;
let smoothedY = 0;
const smoothingFactor = 0.3; // Lower = smoother but more lag

// Keyboard state
let currentText = '';
let hoveredKey = null;
let dwellStartTime = null;
const dwellTime = 500; // 0.5 seconds in milliseconds
let dwellTimeout = null;

// Emotion state
let currentEmotion = 'neutral';

// Speak cooldown state (prevents spam)
let speakCooldown = false;
let emotionConfidence = 0;

// Emotion icons mapping
const EMOTION_ICONS = {
    happy: '😊',
    sad: '😢',
    neutral: '😐',
    surprised: '😲',
    angry: '😠'
};

// MediaPipe Face Mesh configuration
function initFaceMesh() {
    faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onResults);
}

// Process face mesh results
function onResults(results) {
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Draw face mesh (optional - can be removed for cleaner look)
        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
            color: '#C0C0C070',
            lineWidth: 1
        });

        // Nose tip is landmark index 1
        const noseTip = landmarks[1];

        // Convert normalized coordinates to pixel coordinates
        const x = noseTip.x * canvas.width;
        const y = noseTip.y * canvas.height;

        // Apply smoothing
        smoothedX = smoothedX + (x - smoothedX) * smoothingFactor;
        smoothedY = smoothedY + (y - smoothedY) * smoothingFactor;

        // Draw nose point on canvas
        canvasCtx.beginPath();
        canvasCtx.arc(smoothedX, smoothedY, 10, 0, 2 * Math.PI);
        canvasCtx.fillStyle = '#FF0000';
        canvasCtx.fill();
        canvasCtx.strokeStyle = '#FFFFFF';
        canvasCtx.lineWidth = 3;
        canvasCtx.stroke();

        // Map nose position to keyboard cursor
        // Use normalized coordinates (0-1) from noseTip
        const keyboardRect = keyboardWrapper.getBoundingClientRect();

        // Map nose position (invert X for natural movement)
        let normalizedX = 1 - noseTip.x; // Invert X for natural left-right
        let normalizedY = noseTip.y;

        // Apply sensitivity multiplier for easier movement (higher = more sensitive)
        // Separate sensitivity for X and Y axes - Y needs more sensitivity for up/down
        const sensitivityX = 2.5;
        const sensitivityY = 3.5; // Higher sensitivity for vertical movement
        normalizedX = (normalizedX - 0.5) * sensitivityX + 0.5;
        normalizedY = (normalizedY - 0.5) * sensitivityY + 0.5;

        // Clamp values to stay within bounds [0, 1]
        normalizedX = Math.max(0, Math.min(1, normalizedX));
        normalizedY = Math.max(0, Math.min(1, normalizedY));

        // Calculate cursor position within keyboard bounds
        const cursorX = normalizedX * keyboardRect.width;
        const cursorY = normalizedY * keyboardRect.height;

        // Update keyboard cursor position (relative to keyboard wrapper)
        keyboardCursor.style.left = `${cursorX}px`;
        keyboardCursor.style.top = `${cursorY}px`;
        keyboardCursor.classList.add('active');

        // Update coordinates display
        coordX.textContent = Math.round(normalizedX * 100);
        coordY.textContent = Math.round(normalizedY * 100);

        // Detect and update emotion
        const { emotion, confidence } = detectEmotion(landmarks);
        updateEmotionUI(emotion, confidence);

        status.textContent = 'Tracking active - Move your nose!';
        status.style.color = '#10b981';
    } else {
        keyboardCursor.classList.remove('active');
        status.textContent = 'No face detected';
        status.style.color = '#ef4444';
    }

    canvasCtx.restore();

    // Check keyboard interaction
    if (isTracking) {
        checkKeyboardHover();
    }
}

// Check if keyboard cursor is hovering over a key
function checkKeyboardHover() {
    const cursorRect = keyboardCursor.getBoundingClientRect();
    const cursorCenterX = cursorRect.left + cursorRect.width / 2;
    const cursorCenterY = cursorRect.top + cursorRect.height / 2;

    let foundKey = null;

    keys.forEach(key => {
        const keyRect = key.getBoundingClientRect();

        // Check if cursor center is within key bounds
        if (cursorCenterX >= keyRect.left &&
            cursorCenterX <= keyRect.right &&
            cursorCenterY >= keyRect.top &&
            cursorCenterY <= keyRect.bottom) {
            foundKey = key;
        }
    });

    // Handle key hover state
    if (foundKey !== hoveredKey) {
        // Clear previous hover
        if (hoveredKey) {
            hoveredKey.classList.remove('hovering');
            clearTimeout(dwellTimeout);
            dwellTimeout = null;
        }

        // Set new hover
        hoveredKey = foundKey;

        if (hoveredKey) {
            hoveredKey.classList.add('hovering');
            dwellStartTime = Date.now();

            // Start dwell timer
            dwellTimeout = setTimeout(() => {
                selectKey(hoveredKey);
            }, dwellTime);
        }
    }
}

// Handle key selection
function selectKey(key) {
    const keyValue = key.getAttribute('data-key');

    // Add selection visual feedback
    key.classList.add('selecting');
    setTimeout(() => {
        key.classList.remove('selecting', 'hovering');
    }, 200);

    // Handle different key types
    if (keyValue === 'BACKSPACE') {
        currentText = currentText.slice(0, -1);
    } else if (keyValue === 'CLEAR') {
        currentText = '';
    } else if (keyValue === 'ENTER') {
        // Check cooldown before speaking
        if (speakCooldown) {
            console.log('SPEAK button on cooldown, please wait...');
            status.textContent = 'Please wait (cooldown)...';
            status.style.color = '#f59e0b';
            return;
        }

        // Trigger text-to-speech with detected emotion
        speakText(currentText, currentEmotion);

        // Set cooldown for 2 seconds
        speakCooldown = true;
        setTimeout(() => {
            speakCooldown = false;
            console.log('SPEAK button cooldown expired');
        }, 2000);
    } else {
        currentText += keyValue;
    }

    // Update text display
    textOutput.textContent = currentText;

    // Clear hover state
    hoveredKey = null;
    clearTimeout(dwellTimeout);
    dwellTimeout = null;
}

// Detect emotion from face landmarks
function detectEmotion(landmarks) {
    // Simple emotion detection based on facial feature positions
    // This is a basic implementation - you could use more sophisticated models

    // Key landmarks: eyes, eyebrows, mouth
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const leftEyebrow = landmarks[70];
    const rightEyebrow = landmarks[300];
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    const mouthTop = landmarks[13];
    const mouthBottom = landmarks[14];

    // Calculate mouth opening (vertical distance)
    const mouthOpen = Math.abs(mouthTop.y - mouthBottom.y);

    // Calculate mouth width
    const mouthWidth = Math.abs(mouthLeft.x - mouthRight.x);

    // Calculate eyebrow position relative to eyes
    const leftEyebrowDist = leftEyebrow.y - leftEye.y;
    const rightEyebrowDist = rightEyebrow.y - rightEye.y;
    const avgEyebrowDist = (leftEyebrowDist + rightEyebrowDist) / 2;

    // Determine emotion based on features
    let emotion = 'neutral';
    let confidence = 0.5;

    // Happy: mouth corners up, eyes slightly closed
    if (mouthWidth > 0.08 && mouthOpen < 0.03) {
        emotion = 'happy';
        confidence = 0.8;
    }
    // Sad: mouth corners down, eyebrows down
    else if (mouthWidth < 0.06 && avgEyebrowDist > -0.02) {
        emotion = 'sad';
        confidence = 0.7;
    }
    // Surprised: mouth open, eyebrows raised
    else if (mouthOpen > 0.05 && avgEyebrowDist < -0.03) {
        emotion = 'surprised';
        confidence = 0.75;
    }
    // Angry: eyebrows lowered, mouth tense
    else if (avgEyebrowDist > -0.015 && mouthWidth < 0.07) {
        emotion = 'angry';
        confidence = 0.6;
    }

    return { emotion, confidence };
}

// Update emotion UI
function updateEmotionUI(emotion, confidence) {
    currentEmotion = emotion;
    emotionConfidence = confidence;

    emotionIcon.textContent = EMOTION_ICONS[emotion];
    emotionLabel.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
    confidenceFill.style.width = `${confidence * 100}%`;
    confidenceText.textContent = `${Math.round(confidence * 100)}%`;
}

// Fish Audio TTS function
async function speakText(text, emotion) {
    if (!text || text.trim() === '') {
        alert('Please type some text first!');
        return;
    }

    try {
        // Show loading state
        status.textContent = 'Generating speech...';
        status.style.color = '#3b82f6';

        // Get voice parameters based on emotion
        const voiceParams = CONFIG.EMOTION_VOICE_PARAMS[emotion] || CONFIG.EMOTION_VOICE_PARAMS.neutral;

        // Get selected voice reference ID (male/female)
        const voiceReferenceId = CONFIG.VOICE_REFERENCES[selectedVoice];

        // Debug logging
        console.log('=== Fish Audio TTS Request ===');
        console.log('Text:', text);
        console.log('Emotion:', emotion);
        console.log('Selected Voice:', selectedVoice);
        console.log('Voice Reference ID:', voiceReferenceId);
        console.log('Speed (from emotion):', voiceParams.speed);

        // Prepare request payload
        const requestBody = {
            text: text,
            reference_id: voiceReferenceId, // Male or Female voice
            format: 'mp3',
            mp3_bitrate: 128,
            normalize: true,
            speed: voiceParams.speed || 1.0 // Emotion-based speed modulation
        };

        console.log('Request Body:', JSON.stringify(requestBody, null, 2));

        // Call local proxy server (avoids CORS issues)
        const response = await fetch('http://localhost:5000/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('API Response Status:', response.status);
        console.log('API Response Headers:', [...response.headers.entries()]);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`Fish Audio API error: ${response.status} - ${errorText}`);
        }

        // Get audio blob
        const audioBlob = await response.blob();
        console.log('Audio Blob Size:', audioBlob.size, 'bytes');
        console.log('Audio Blob Type:', audioBlob.type);

        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('Audio URL Created:', audioUrl);

        // Play audio
        const audio = new Audio(audioUrl);

        audio.onplay = () => {
            console.log('Audio playback started');
            status.textContent = `Speaking (${selectedVoice}, ${emotion})...`;
            status.style.color = '#10b981';
        };

        audio.onended = () => {
            console.log('Audio playback complete');
            status.textContent = 'Speech complete!';
            status.style.color = '#10b981';
            URL.revokeObjectURL(audioUrl);

            setTimeout(() => {
                status.textContent = 'Tracking active - Move your nose!';
            }, 2000);
        };

        audio.onerror = (e) => {
            console.error('Audio playback error:', e);
            throw new Error('Audio playback failed');
        };

        await audio.play();
        console.log('=== Fish Audio TTS Success ===');

    } catch (error) {
        console.error('=== Fish Audio TTS Error ===');
        console.error('Error Type:', error.name);
        console.error('Error Message:', error.message);
        console.error('Stack Trace:', error.stack);

        // Fallback to Web Speech API if Fish Audio fails
        status.textContent = 'Fish Audio failed, using fallback...';
        status.style.color = '#f59e0b';

        console.log('Falling back to Web Speech API');
        return speakWithWebSpeech(text, emotion);
    }
}

// Web Speech API with proper male/female voice selection
function speakWithWebSpeech(text, emotion) {
    if (!('speechSynthesis' in window)) {
        alert('Speech synthesis not supported in this browser');
        return;
    }

    console.log('=== Web Speech API Request ===');
    console.log('Text:', text);
    console.log('Emotion:', emotion);
    console.log('Selected Voice Gender:', selectedVoice);

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices:', voices.length);

    const utterance = new SpeechSynthesisUtterance(text);

    // Select voice based on gender
    let selectedVoiceObj = null;

    if (selectedVoice === 'female') {
        // Try to find female voices (in order of preference)
        selectedVoiceObj = voices.find(v => v.name.includes('Female')) ||
                          voices.find(v => v.name.includes('Zira')) ||
                          voices.find(v => v.name.includes('Samantha')) ||
                          voices.find(v => v.name.includes('Victoria')) ||
                          voices.find(v => v.name === 'Google US English') ||
                          voices.find(v => !v.name.includes('Male'));
    } else {
        // Try to find male voices (in order of preference)
        selectedVoiceObj = voices.find(v => v.name.includes('Male')) ||
                          voices.find(v => v.name.includes('David')) ||
                          voices.find(v => v.name.includes('Mark')) ||
                          voices.find(v => v.name.includes('Daniel')) ||
                          voices.find(v => v.name === 'Google UK English Male');
    }

    if (selectedVoiceObj) {
        utterance.voice = selectedVoiceObj;
        console.log('Selected voice:', selectedVoiceObj.name, '(' + selectedVoiceObj.lang + ')');
    } else {
        console.log('No specific voice found, using default');
    }

    // Adjust speech rate and pitch based on emotion
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (emotion === 'happy') {
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
    } else if (emotion === 'sad') {
        utterance.rate = 0.9;
        utterance.pitch = 0.8;
    } else if (emotion === 'angry') {
        utterance.rate = 1.2;
        utterance.pitch = 1.1;
    } else if (emotion === 'surprised') {
        utterance.rate = 1.15;
        utterance.pitch = 1.3;
    }

    console.log('Speech parameters:', {
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume
    });

    utterance.onstart = () => {
        console.log('Web Speech playback started');
        status.textContent = `Speaking (${selectedVoice}, ${emotion})...`;
        status.style.color = '#10b981';
    };

    utterance.onend = () => {
        console.log('Web Speech playback complete');
        status.textContent = 'Speech complete!';
        status.style.color = '#10b981';
        setTimeout(() => {
            status.textContent = 'Tracking active - Move your nose!';
        }, 2000);
    };

    utterance.onerror = (error) => {
        console.error('Web Speech Error:', error);
        status.textContent = 'Speech failed';
        status.style.color = '#ef4444';
    };

    window.speechSynthesis.speak(utterance);
    console.log('=== Web Speech API Success ===');
}

// Start camera and tracking
async function startTracking() {
    try {
        status.textContent = 'Initializing camera...';
        status.style.color = '#f59e0b';

        // Initialize Face Mesh
        if (!faceMesh) {
            initFaceMesh();
        }

        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = stream;

        // Wait for video to load
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });

        // Start camera
        camera = new Camera(video, {
            onFrame: async () => {
                await faceMesh.send({ image: video });
            },
            width: 1280,
            height: 720
        });

        await camera.start();

        isTracking = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;

        status.textContent = 'Camera started - Looking for face...';
        status.style.color = '#3b82f6';

    } catch (error) {
        console.error('Error starting camera:', error);
        status.textContent = 'Error: Could not access camera';
        status.style.color = '#ef4444';
        alert('Could not access camera. Please make sure you have granted camera permissions.');
    }
}

// Stop camera and tracking
function stopTracking() {
    if (camera) {
        camera.stop();
        camera = null;
    }

    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }

    cursor.classList.remove('active');
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    isTracking = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;

    status.textContent = 'Camera stopped';
    status.style.color = '#6b7280';
    coordX.textContent = '0';
    coordY.textContent = '0';
}

// Event listeners
startBtn.addEventListener('click', startTracking);
stopBtn.addEventListener('click', stopTracking);

// Voice selection event listeners
voiceRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        selectedVoice = e.target.value;
        console.log(`Voice changed to: ${selectedVoice}`);
    });
});

// Initialize
status.textContent = 'Click "Start Camera" to begin';
status.style.color = '#6b7280';
