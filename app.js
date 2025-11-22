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

// State
let camera = null;
let faceMesh = null;
let isTracking = false;

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
        const normalizedX = 1 - noseTip.x; // Invert X for natural left-right
        const normalizedY = noseTip.y;

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
        // TODO: This will trigger text-to-speech in Phase 3
        console.log('SPEAK:', currentText);
        alert('Phase 3 coming soon: Text-to-speech with emotion!\n\nText: ' + currentText);
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

// Initialize
status.textContent = 'Click "Start Camera" to begin';
status.style.color = '#6b7280';
