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

// State
let camera = null;
let faceMesh = null;
let isTracking = false;

// Smoothing variables
let smoothedX = 0;
let smoothedY = 0;
const smoothingFactor = 0.15; // Lower = smoother but more lag (reduced for less jitter)

// Keyboard state
let currentText = '';
let hoveredKey = null;
let dwellStartTime = null;
const dwellTime = 650; // Slightly longer for more reliability (in milliseconds)
let dwellTimeout = null;

// Cursor stability tracking for point-and-click behavior
let lastCursorX = 0;
let lastCursorY = 0;
let lastCursorTime = 0;
const stabilityThreshold = 15; // pixels - cursor must move less than this to be considered stable (increased for more forgiveness)
const stabilityCheckTime = 50; // milliseconds - check stability over this time window (reduced for faster response)
let stabilityGracePeriod = 0; // Track when we first hovered to allow initial timer start

// Emotion state
let currentEmotion = 'neutral';
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
        // Use SMOOTHED coordinates instead of raw nose position for less jitter
        const keyboardRect = keyboardWrapper.getBoundingClientRect();

        // Convert smoothed pixel coordinates back to normalized (0-1)
        const smoothedNormalizedX = smoothedX / canvas.width;
        const smoothedNormalizedY = smoothedY / canvas.height;

        // Map nose position (invert X for natural movement)
        let normalizedX = 1 - smoothedNormalizedX; // Invert X for natural left-right
        let normalizedY = smoothedNormalizedY;

        // Sensitivity multipliers for cursor movement
        const sensitivityX = 6.0; // Slightly higher for left/right
        const sensitivityY = 9.0; // WAY WAY higher for up/down
        
        // Offset adjustments to center the neutral face position
        const offsetX = 0.0; // X offset (usually 0)
        const offsetY = -0.12; // Y offset (negative = move center point up, so you don't need to look as far up)
        
        // Apply offset first (adjusts the center point)
        normalizedX = normalizedX + offsetX;
        normalizedY = normalizedY + offsetY;
        
        // Apply sensitivity multipliers
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

    // Calculate cursor movement speed
    const now = Date.now();
    const timeDelta = now - lastCursorTime;
    let isStable = false;

    if (lastCursorTime > 0 && timeDelta > 0) {
        const distance = Math.sqrt(
            Math.pow(cursorCenterX - lastCursorX, 2) + 
            Math.pow(cursorCenterY - lastCursorY, 2)
        );
        
        // Consider stable if movement is below threshold
        // More forgiving: just check if movement is small, don't require full time window
        isStable = distance < stabilityThreshold;
    } else if (lastCursorTime === 0) {
        // First frame - initialize but don't consider stable yet
        isStable = false;
    }

    // Update last position and time
    lastCursorX = cursorCenterX;
    lastCursorY = cursorCenterY;
    lastCursorTime = now;

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
            dwellStartTime = null;
            stabilityGracePeriod = 0;
        }

        // Set new hover
        hoveredKey = foundKey;

        if (hoveredKey) {
            hoveredKey.classList.add('hovering');
            // Allow a grace period when first hovering (200ms) to start timer
            stabilityGracePeriod = Date.now() + 200;
            dwellStartTime = null;
            dwellTimeout = null;
        }
    } else if (hoveredKey && foundKey === hoveredKey) {
        // Same key, check if we should start/resume the timer
        const inGracePeriod = Date.now() < stabilityGracePeriod;
        
        if (isStable || inGracePeriod || lastCursorTime === 0) {
            // Cursor is stable, in grace period, or first frame - start or continue the timer
            if (!dwellStartTime) {
                // Start the timer for the first time
                dwellStartTime = Date.now();
                dwellTimeout = setTimeout(() => {
                    selectKey(hoveredKey);
                }, dwellTime);
            }
            // Timer is already running, let it continue
        } else {
            // Cursor is moving and grace period expired, cancel the timer
            if (dwellTimeout) {
                clearTimeout(dwellTimeout);
                dwellTimeout = null;
                dwellStartTime = null;
            }
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
        // Trigger text-to-speech with detected emotion
        speakText(currentText, currentEmotion);
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

        // Call Fish Audio API
        const response = await fetch(`${CONFIG.FISH_AUDIO_BASE_URL}/tts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.FISH_AUDIO_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                reference_id: 'default', // You can customize this
                format: 'mp3',
                mp3_bitrate: 128,
                normalize: true,
                speed: voiceParams.speed || 1.0
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        // Get audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Play audio
        const audio = new Audio(audioUrl);

        audio.onplay = () => {
            status.textContent = 'Speaking...';
            status.style.color = '#10b981';
        };

        audio.onended = () => {
            status.textContent = 'Speech complete!';
            status.style.color = '#10b981';
            URL.revokeObjectURL(audioUrl);

            setTimeout(() => {
                status.textContent = 'Tracking active - Move your nose!';
            }, 2000);
        };

        audio.onerror = () => {
            throw new Error('Audio playback failed');
        };

        await audio.play();

    } catch (error) {
        console.error('TTS Error:', error);
        status.textContent = 'Speech generation failed';
        status.style.color = '#ef4444';
        alert(`Error generating speech: ${error.message}`);
    }
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

    // Reset cursor tracking
    lastCursorX = 0;
    lastCursorY = 0;
    lastCursorTime = 0;

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

// Initialize
status.textContent = 'Click "Start Camera" to begin';
status.style.color = '#6b7280';
