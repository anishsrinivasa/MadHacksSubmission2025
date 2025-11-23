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
const autocompleteBtn = document.querySelector('[data-key="AUTOCOMPLETE"]');
const emotionIcon = document.getElementById('emotionIcon');
const emotionLabel = document.getElementById('emotionLabel');
const confidenceFill = document.getElementById('confidenceFill');
const confidenceText = document.getElementById('confidenceText');
const voiceRadios = document.querySelectorAll('input[name="voice"]');

// State
let camera = null;
let faceMesh = null;
let isTracking = false;
let selectedVoice = 'male'; // Default voice selection (American)

// face-api.js model state
let emotionModelsLoaded = false;
let emotionModelLoading = false;
let lastEmotionDetectionTime = 0;
const EMOTION_DETECTION_INTERVAL = 100; // Throttle to ~10 FPS (100ms between detections)
let emotionDetectionPending = false; // Flag to prevent concurrent detections
let emotionDetectionPromise = null; // Track the latest detection promise

// Smoothing variables
let smoothedX = 0;
let smoothedY = 0;
const smoothingFactor = 0.3; // Lower = smoother but more lag

// Keyboard state
let currentText = '';
let currentSuggestion = ''; // Store the current autocomplete suggestion

// Word completion functions
function getBestSuggestion(prefix) {
    if (!prefix || prefix.length < 2) {
        return null;
    }
    
    const lowerPrefix = prefix.toLowerCase();
    const suggestions = WORD_DICTIONARY.filter(word => 
        word.toLowerCase().startsWith(lowerPrefix)
    );
    
    if (suggestions.length === 0) {
        return null;
    }
    
    // Sort by length (shorter first), then alphabetically
    suggestions.sort((a, b) => {
        if (a.length !== b.length) {
            return a.length - b.length;
        }
        return a.localeCompare(b);
    });
    
    // Return the best (first) suggestion
    return suggestions[0];
}

function updateTextDisplay() {
    if (!textOutput) return;
    
    // Extract last word from current text
    const words = currentText.trim().split(/\s+/);
    const lastWord = words.length > 0 ? words[words.length - 1] : '';
    
    // Get suggestion if applicable
    let suggestion = null;
    if (lastWord && lastWord.length >= 2 && !/^[0-9\W]+$/.test(lastWord)) {
        const bestMatch = getBestSuggestion(lastWord);
        if (bestMatch && bestMatch.toLowerCase() !== lastWord.toLowerCase()) {
            suggestion = bestMatch;
            currentSuggestion = bestMatch;
        } else {
            currentSuggestion = '';
        }
    } else {
        currentSuggestion = '';
    }
    
    // Display text with inline suggestion
    if (suggestion) {
        // Show current text + grey suggestion completion
        const suggestionPart = suggestion.substring(lastWord.length);
        
        // Find where the last word ends in currentText
        // We need to find the exact end position of lastWord in currentText
        const lastWordStartIndex = currentText.lastIndexOf(lastWord);
        
        if (lastWordStartIndex >= 0) {
            // Split at the end of the last word
            const textBefore = currentText.substring(0, lastWordStartIndex + lastWord.length);
            const textAfter = currentText.substring(lastWordStartIndex + lastWord.length);
            
            // Escape HTML in the text parts to prevent issues
            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
            
            const escapedTextBefore = escapeHtml(textBefore);
            const escapedTextAfter = escapeHtml(textAfter);
            const escapedSuggestionPart = escapeHtml(suggestionPart);
            
            // Build the display: text up to end of last word + grey completion + any text after
            textOutput.innerHTML = escapedTextBefore + `<span class="autocomplete-preview">${escapedSuggestionPart}</span>` + escapedTextAfter;
        } else {
            // Fallback: just append the suggestion
            const escapedCurrent = escapeHtml(currentText);
            const escapedSuggestionPart = escapeHtml(suggestionPart);
            textOutput.innerHTML = escapedCurrent + `<span class="autocomplete-preview">${escapedSuggestionPart}</span>`;
        }
        
        // Enable autocomplete button
        if (autocompleteBtn) {
            autocompleteBtn.disabled = false;
            autocompleteBtn.style.opacity = '1';
            autocompleteBtn.style.cursor = 'pointer';
        }
    } else {
        // Just show current text
        textOutput.textContent = currentText;
        
        // Disable autocomplete button
        if (autocompleteBtn) {
            autocompleteBtn.disabled = true;
            autocompleteBtn.style.opacity = '0.4';
            autocompleteBtn.style.cursor = 'not-allowed';
        }
    }
}

// Universal element interaction state (for full-page accessibility)
let hoveredElement = null;
let dwellStartTime = null;
const dwellTime = 500; // 0.5 seconds in milliseconds
let dwellTimeout = null;

// Emotion state
let currentEmotion = 'neutral';

// Speak cooldown state (prevents spam)
let speakCooldown = false;
let emotionConfidence = 0;

// Emotion stabilization (prevent flickering)
let emotionBuffer = [];
const EMOTION_BUFFER_SIZE = 4; // Number of frames to consider (reduced for better responsiveness)
const EMOTION_THRESHOLD = 0.5;  // 50% of frames must agree (2 out of 4 frames)
const NON_NEUTRAL_CONFIDENCE_THRESHOLD = 0.7; // High confidence threshold for non-neutral emotions (increased to reduce false positives)

// Emotion lock (maintain emotion for 2 seconds after change - reduced for better responsiveness)
let emotionLocked = false;
let emotionLockTimeout = null;
const EMOTION_LOCK_DURATION = 2000; // 2 seconds

// Emotion icons mapping
const EMOTION_ICONS = {
    happy: '😊',
    sad: '😢',
    neutral: '😐',
    surprised: '😲',
    angry: '😠'
};

// Word dictionary for autocomplete (common words + AAC phrases)
const WORD_DICTIONARY = [
    // Common AAC phrases
    'hello', 'help', 'yes', 'no', 'thank', 'you', 'please', 'sorry', 'okay', 'ok',
    'hi', 'hey', 'goodbye', 'bye', 'thanks', 'welcome', 'excuse', 'me',
    
    // Common words (top 300 most used)
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'when', 'make', 'can', 'like', 'time', 'just', 'know', 'take', 'people',
    'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
    'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
    'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
    'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
    'is', 'are', 'was', 'were', 'been', 'being', 'has', 'had', 'having', 'does',
    'did', 'doing', 'done', 'said', 'says', 'saying', 'went', 'going', 'gone',
    'got', 'getting', 'gotten', 'came', 'coming', 'seen', 'saw', 'made', 'making',
    'took', 'taking', 'taken', 'gave', 'giving', 'given', 'found', 'finding',
    'think', 'thought', 'know', 'knew', 'known', 'see', 'saw', 'seen', 'get',
    'got', 'gotten', 'go', 'went', 'gone', 'come', 'came', 'make', 'made',
    'take', 'took', 'taken', 'say', 'said', 'tell', 'told', 'ask', 'asked',
    'try', 'tried', 'trying', 'need', 'needed', 'want', 'wanted', 'use', 'used',
    'work', 'worked', 'working', 'call', 'called', 'calling', 'try', 'tried',
    'move', 'moved', 'moving', 'live', 'lived', 'living', 'believe', 'believed',
    'bring', 'brought', 'happen', 'happened', 'write', 'wrote', 'written',
    'sit', 'sat', 'sitting', 'stand', 'stood', 'standing', 'lose', 'lost', 'losing',
    'pay', 'paid', 'paying', 'meet', 'met', 'meeting', 'include', 'included',
    'continue', 'continued', 'set', 'setting', 'learn', 'learned', 'change',
    'changed', 'lead', 'led', 'leading', 'understand', 'understood', 'watch',
    'watched', 'follow', 'followed', 'stop', 'stopped', 'stopping', 'create',
    'created', 'speak', 'spoke', 'spoken', 'read', 'reading', 'allow', 'allowed',
    'add', 'added', 'adding', 'spend', 'spent', 'spending', 'grow', 'grew', 'grown',
    'open', 'opened', 'walk', 'walked', 'win', 'won', 'winning', 'offer', 'offered',
    'remember', 'remembered', 'love', 'loved', 'consider', 'considered', 'appear',
    'appeared', 'buy', 'bought', 'buying', 'wait', 'waited', 'waiting', 'serve',
    'served', 'die', 'died', 'dying', 'send', 'sent', 'sending', 'build', 'built',
    'stay', 'stayed', 'staying', 'fall', 'fell', 'fallen', 'cut', 'cutting',
    'reach', 'reached', 'kill', 'killed', 'raise', 'raised', 'pass', 'passed',
    'sell', 'sold', 'selling', 'decide', 'decided', 'return', 'returned',
    'explain', 'explained', 'hope', 'hoped', 'hoping', 'develop', 'developed',
    'carry', 'carried', 'break', 'broke', 'broken', 'receive', 'received',
    'agree', 'agreed', 'support', 'supported', 'hit', 'hitting', 'produce',
    'produced', 'eat', 'ate', 'eaten', 'cover', 'covered', 'catch', 'caught',
    'draw', 'drew', 'drawn', 'choose', 'chose', 'chosen', 'die', 'died', 'dying',
    'expect', 'expected', 'fight', 'fought', 'save', 'saved', 'saving', 'serve',
    'served', 'end', 'ended', 'ending', 'create', 'created', 'join', 'joined',
    'reduce', 'reduced', 'establish', 'established', 'ensure', 'ensured',
    'require', 'required', 'indicate', 'indicated', 'suggest', 'suggested',
    'maintain', 'maintained', 'present', 'presented', 'prevent', 'prevented',
    'recognize', 'recognized', 'describe', 'described', 'improve', 'improved',
    'achieve', 'achieved', 'manage', 'managed', 'obtain', 'obtained', 'express',
    'expressed', 'determine', 'determined', 'prepare', 'prepared', 'operate',
    'operated', 'discover', 'discovered', 'examine', 'examined', 'identify',
    'identified', 'observe', 'observed', 'realize', 'realized', 'involve',
    'involved', 'represent', 'represented', 'protect', 'protected', 'reflect',
    'reflected', 'remove', 'removed', 'removing', 'replace', 'replaced',
    'respond', 'responded', 'reveal', 'revealed', 'separate', 'separated',
    'survive', 'survived', 'transform', 'transformed', 'transport', 'transported',
    'treat', 'treated', 'treating', 'warn', 'warned', 'warning', 'waste',
    'wasted', 'wasting', 'wonder', 'wondered', 'worry', 'worried', 'wrap',
    'wrapped', 'wrapping', 'accept', 'accepted', 'achieve', 'achieved',
    'acknowledge', 'acknowledged', 'acquire', 'acquired', 'adapt', 'adapted',
    'adjust', 'adjusted', 'admire', 'admired', 'admit', 'admitted', 'adopt',
    'adopted', 'advance', 'advanced', 'advise', 'advised', 'affect', 'affected',
    'afford', 'afforded', 'agree', 'agreed', 'aim', 'aimed', 'aiming', 'allow',
    'allowed', 'announce', 'announced', 'anticipate', 'anticipated', 'apologize',
    'apologized', 'appear', 'appeared', 'apply', 'applied', 'appreciate',
    'appreciated', 'approach', 'approached', 'approve', 'approved', 'argue',
    'argued', 'arise', 'arose', 'arisen', 'arrange', 'arranged', 'arrest',
    'arrested', 'arrive', 'arrived', 'ask', 'asked', 'assess', 'assessed',
    'assign', 'assigned', 'assist', 'assisted', 'assume', 'assumed', 'assure',
    'assured', 'attach', 'attached', 'attack', 'attacked', 'attempt', 'attempted',
    'attend', 'attended', 'attract', 'attracted', 'avoid', 'avoided', 'award',
    'awarded', 'aware', 'back', 'bad', 'bag', 'ball', 'band', 'bank', 'bar',
    'base', 'basic', 'bath', 'beach', 'bear', 'beat', 'beautiful', 'bed',
    'been', 'beer', 'before', 'begin', 'behind', 'being', 'believe', 'bell',
    'below', 'beside', 'best', 'better', 'between', 'beyond', 'bicycle', 'big',
    'bill', 'bird', 'birth', 'bit', 'bite', 'bitter', 'black', 'blade', 'blood',
    'blow', 'blue', 'board', 'boat', 'body', 'bone', 'book', 'border', 'born',
    'both', 'bottle', 'bottom', 'box', 'boy', 'branch', 'brave', 'bread',
    'break', 'breakfast', 'breath', 'brick', 'bridge', 'bright', 'bring',
    'broad', 'broken', 'brother', 'brown', 'brush', 'build', 'burn', 'bus',
    'business', 'busy', 'but', 'buy', 'by', 'cake', 'call', 'calm', 'came',
    'camp', 'can', 'card', 'care', 'careful', 'careless', 'carry', 'case',
    'cat', 'catch', 'cause', 'certain', 'chain', 'chair', 'chance', 'change',
    'chase', 'cheap', 'cheese', 'chicken', 'chief', 'child', 'children', 'choose',
    'church', 'circle', 'city', 'class', 'clean', 'clear', 'climb', 'clock',
    'close', 'cloth', 'cloud', 'cloudy', 'coat', 'coffee', 'cold', 'collect',
    'college', 'color', 'comb', 'come', 'comfortable', 'common', 'compare',
    'complete', 'computer', 'condition', 'consider', 'contain', 'continue',
    'control', 'cook', 'cool', 'copy', 'corn', 'corner', 'correct', 'cost',
    'cotton', 'cough', 'could', 'count', 'country', 'couple', 'courage', 'course',
    'court', 'cover', 'cow', 'crack', 'crash', 'crawl', 'crazy', 'cream', 'create',
    'creature', 'credit', 'crew', 'crop', 'cross', 'crowd', 'cruel', 'cry',
    'cup', 'curious', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cut',
    'dad', 'damage', 'damp', 'dance', 'danger', 'dangerous', 'dark', 'date',
    'daughter', 'dawn', 'day', 'dead', 'deaf', 'deal', 'dear', 'death', 'debt',
    'decide', 'deep', 'deer', 'defeat', 'defend', 'defense', 'degree', 'delay',
    'delicate', 'delicious', 'delight', 'deliver', 'demand', 'dentist', 'deny',
    'depart', 'depend', 'depth', 'describe', 'desert', 'design', 'desire',
    'desk', 'destroy', 'detail', 'determine', 'develop', 'devil', 'diamond',
    'dictionary', 'die', 'difference', 'different', 'difficult', 'dig', 'dinner',
    'direct', 'direction', 'dirt', 'dirty', 'discover', 'discuss', 'disease',
    'dish', 'distance', 'distant', 'divide', 'do', 'doctor', 'dog', 'dollar',
    'door', 'dot', 'double', 'doubt', 'down', 'dozen', 'draw', 'drawer', 'dream',
    'dress', 'drink', 'drive', 'drop', 'drown', 'drug', 'drum', 'dry', 'duck',
    'due', 'dull', 'during', 'dust', 'duty', 'each', 'eager', 'ear', 'early',
    'earn', 'earth', 'east', 'easy', 'eat', 'edge', 'education', 'effect',
    'effort', 'egg', 'eight', 'either', 'elbow', 'elder', 'electric', 'elephant',
    'eleven', 'else', 'empty', 'end', 'enemy', 'energy', 'engine', 'engineer',
    'enjoy', 'enough', 'enter', 'entire', 'entrance', 'envelope', 'equal',
    'equipment', 'escape', 'especially', 'essential', 'establish', 'even',
    'evening', 'event', 'ever', 'every', 'everyone', 'everything', 'everywhere',
    'exact', 'examine', 'example', 'excellent', 'except', 'exchange', 'excite',
    'exciting', 'excuse', 'exercise', 'exist', 'expect', 'expense', 'expensive',
    'experience', 'experiment', 'explain', 'explode', 'explore', 'express',
    'extra', 'extreme', 'eye', 'face', 'fact', 'factor', 'factory', 'fail',
    'failure', 'fair', 'fairly', 'faith', 'fall', 'false', 'familiar', 'family',
    'famous', 'fan', 'far', 'farm', 'farmer', 'fashion', 'fast', 'fat', 'father',
    'fault', 'favor', 'favorite', 'fear', 'feast', 'feather', 'feature', 'feed',
    'feel', 'feeling', 'fellow', 'female', 'fence', 'festival', 'fetch', 'fever',
    'few', 'field', 'fierce', 'fight', 'figure', 'file', 'fill', 'film', 'final',
    'find', 'fine', 'finger', 'finish', 'fire', 'firm', 'first', 'fish', 'fit',
    'five', 'fix', 'flag', 'flame', 'flash', 'flat', 'flavor', 'flesh', 'flight',
    'float', 'flood', 'floor', 'flour', 'flow', 'flower', 'fly', 'fold', 'folk',
    'follow', 'fond', 'food', 'fool', 'foolish', 'foot', 'for', 'forbid', 'force',
    'foreign', 'forest', 'forget', 'forgive', 'fork', 'form', 'formal', 'former',
    'fort', 'forth', 'fortune', 'forty', 'forward', 'fought', 'found', 'four',
    'fourth', 'fox', 'frame', 'free', 'freedom', 'freeze', 'fresh', 'friend',
    'friendly', 'friendship', 'frighten', 'frog', 'from', 'front', 'fruit',
    'fuel', 'full', 'fun', 'funny', 'fur', 'furniture', 'further', 'future',
    'gain', 'game', 'garage', 'garden', 'gas', 'gate', 'gather', 'gave', 'gay',
    'general', 'generous', 'gentle', 'gentleman', 'geography', 'get', 'giant',
    'gift', 'girl', 'give', 'glad', 'glass', 'globe', 'glory', 'glove', 'glow',
    'go', 'goat', 'god', 'gold', 'golden', 'gone', 'good', 'goodbye', 'goods',
    'goose', 'got', 'govern', 'government', 'gown', 'grace', 'grade', 'grain',
    'grand', 'grandfather', 'grandmother', 'grant', 'grass', 'grave', 'gray',
    'great', 'green', 'greet', 'grew', 'grey', 'grief', 'grin', 'grip', 'ground',
    'group', 'grow', 'grown', 'growth', 'guard', 'guess', 'guest', 'guide',
    'guilt', 'guilty', 'gulf', 'gun', 'habit', 'had', 'hair', 'half', 'hall',
    'ham', 'hand', 'handful', 'handle', 'handsome', 'hang', 'happen', 'happy',
    'harbor', 'hard', 'hardly', 'harm', 'harmful', 'harp', 'harsh', 'harvest',
    'has', 'haste', 'hat', 'hate', 'have', 'hay', 'he', 'head', 'heal', 'health',
    'healthy', 'heap', 'hear', 'heard', 'heart', 'heat', 'heaven', 'heavy',
    'hedge', 'heel', 'height', 'held', 'hell', 'hello', 'help', 'helpful', 'hen',
    'her', 'here', 'herd', 'hero', 'hers', 'herself', 'hesitate', 'hew', 'hid',
    'hidden', 'hide', 'high', 'highway', 'hill', 'him', 'himself', 'hind', 'hint',
    'hip', 'hire', 'his', 'history', 'hit', 'hive', 'ho', 'hold', 'hole', 'holiday',
    'hollow', 'holy', 'home', 'honest', 'honey', 'honor', 'hook', 'hope', 'horn',
    'horror', 'horse', 'hospital', 'host', 'hot', 'hotel', 'hour', 'house',
    'how', 'however', 'huge', 'human', 'humble', 'humor', 'hundred', 'hung',
    'hunger', 'hungry', 'hunt', 'hurry', 'hurt', 'husband', 'hut', 'i', 'ice',
    'idea', 'ideal', 'idle', 'if', 'ill', 'image', 'imagine', 'immediate',
    'importance', 'important', 'impossible', 'improve', 'in', 'inch', 'income',
    'increase', 'indeed', 'independent', 'indicate', 'individual', 'industry',
    'influence', 'inform', 'information', 'ink', 'inn', 'inner', 'innocent',
    'insect', 'inside', 'insist', 'instance', 'instant', 'instead', 'instrument',
    'insult', 'intend', 'interest', 'interesting', 'interior', 'internal',
    'international', 'interpret', 'interrupt', 'into', 'introduce', 'invent',
    'invite', 'involve', 'iron', 'is', 'island', 'it', 'its', 'itself', 'jacket',
    'jam', 'jar', 'jaw', 'jazz', 'jealous', 'jeans', 'jet', 'jewel', 'job',
    'join', 'joke', 'journey', 'joy', 'judge', 'juice', 'jump', 'junior', 'jury',
    'just', 'justice', 'keep', 'kept', 'key', 'kick', 'kid', 'kill', 'kind',
    'king', 'kiss', 'kitchen', 'kite', 'knee', 'knew', 'knife', 'knock', 'knot',
    'know', 'known', 'lab', 'label', 'labor', 'lack', 'ladder', 'lady', 'laid',
    'lake', 'lamb', 'lamp', 'land', 'lane', 'language', 'lap', 'large', 'last',
    'late', 'lately', 'later', 'latter', 'laugh', 'launch', 'law', 'lawn', 'lawyer',
    'lay', 'lazy', 'lead', 'leader', 'leaf', 'league', 'lean', 'learn', 'least',
    'leather', 'leave', 'led', 'left', 'leg', 'legal', 'lemon', 'lend', 'length',
    'lens', 'less', 'lesson', 'let', 'letter', 'level', 'liar', 'liberty',
    'library', 'license', 'lid', 'lie', 'life', 'lift', 'light', 'like', 'likely',
    'limb', 'lime', 'limit', 'line', 'lion', 'lip', 'liquid', 'list', 'listen',
    'liter', 'little', 'live', 'lively', 'liver', 'living', 'load', 'loaf',
    'loan', 'local', 'locate', 'lock', 'locomotive', 'log', 'lonely', 'long',
    'look', 'loose', 'lose', 'loss', 'lost', 'lot', 'loud', 'love', 'lovely',
    'low', 'lower', 'luck', 'lucky', 'lunch', 'lung', 'machine', 'mad', 'made',
    'magazine', 'magic', 'maid', 'mail', 'main', 'mainly', 'maintain', 'major',
    'make', 'male', 'mall', 'man', 'manage', 'manager', 'manner', 'many', 'map',
    'march', 'mark', 'market', 'marriage', 'married', 'marry', 'mass', 'master',
    'match', 'mate', 'material', 'matter', 'may', 'maybe', 'mayor', 'me', 'meal',
    'mean', 'meaning', 'meant', 'meanwhile', 'measure', 'meat', 'mechanic',
    'medical', 'medicine', 'meet', 'meeting', 'melt', 'member', 'memory', 'men',
    'mend', 'mental', 'mention', 'menu', 'mercy', 'mere', 'merely', 'merry',
    'mess', 'message', 'metal', 'method', 'meter', 'middle', 'might', 'mild',
    'mile', 'milk', 'mill', 'million', 'mind', 'mine', 'mineral', 'minister',
    'minor', 'minus', 'minute', 'miracle', 'mirror', 'misery', 'miss', 'mistake',
    'mix', 'model', 'modern', 'modest', 'moment', 'monday', 'money', 'monkey',
    'month', 'mood', 'moon', 'moral', 'more', 'moreover', 'morning', 'most',
    'mother', 'motion', 'motor', 'mountain', 'mouse', 'mouth', 'move', 'movement',
    'movie', 'much', 'mud', 'multiply', 'murder', 'muscle', 'museum', 'music',
    'musical', 'must', 'mute', 'mutual', 'my', 'myself', 'mystery', 'nail',
    'naked', 'name', 'narrow', 'nation', 'nation', 'national', 'native', 'natural',
    'naturally', 'nature', 'naughty', 'navy', 'near', 'nearly', 'neat', 'necessary',
    'neck', 'need', 'needle', 'negative', 'neighbor', 'neighborhood', 'neither',
    'nephew', 'nerve', 'nervous', 'nest', 'net', 'network', 'never', 'nevertheless',
    'new', 'news', 'newspaper', 'next', 'nice', 'niece', 'night', 'nine', 'no',
    'noble', 'nobody', 'nod', 'noise', 'noisy', 'none', 'noon', 'nor', 'normal',
    'north', 'nose', 'not', 'note', 'nothing', 'notice', 'noun', 'novel', 'now',
    'nowhere', 'nuclear', 'number', 'numerous', 'nurse', 'nut', 'oak', 'oar',
    'obey', 'object', 'observe', 'obtain', 'obvious', 'occasion', 'occur',
    'ocean', 'odd', 'of', 'off', 'offer', 'office', 'officer', 'official',
    'often', 'oh', 'oil', 'okay', 'old', 'on', 'once', 'one', 'only', 'onto',
    'open', 'opera', 'operate', 'opinion', 'opportunity', 'oppose', 'opposite',
    'or', 'orange', 'order', 'ordinary', 'organ', 'organize', 'origin', 'original',
    'other', 'otherwise', 'ought', 'our', 'ours', 'ourselves', 'out', 'outdoor',
    'outer', 'outline', 'outside', 'outstanding', 'over', 'overall', 'overcoat',
    'owe', 'own', 'owner', 'pace', 'pack', 'package', 'page', 'paid', 'pain',
    'paint', 'pair', 'palace', 'pale', 'pan', 'pants', 'paper', 'paragraph',
    'pardon', 'parent', 'park', 'part', 'particular', 'particularly', 'partly',
    'partner', 'party', 'pass', 'passage', 'passenger', 'past', 'paste', 'pat',
    'path', 'patience', 'patient', 'pattern', 'pause', 'paw', 'pay', 'peace',
    'peaceful', 'peach', 'peak', 'pear', 'peasant', 'pen', 'pencil', 'penny',
    'people', 'pepper', 'per', 'percent', 'perfect', 'perform', 'performance',
    'perhaps', 'period', 'permanent', 'permit', 'person', 'personal', 'personally',
    'persuade', 'pet', 'phase', 'philosophy', 'phone', 'photograph', 'phrase',
    'physical', 'piano', 'pick', 'picnic', 'picture', 'pie', 'piece', 'pig',
    'pile', 'pill', 'pillow', 'pilot', 'pin', 'pine', 'pink', 'pint', 'pipe',
    'pistol', 'pit', 'pitch', 'pity', 'place', 'plain', 'plan', 'plane', 'planet',
    'plant', 'plastic', 'plate', 'platform', 'play', 'player', 'playground',
    'pleasant', 'please', 'pleasure', 'plenty', 'plot', 'plow', 'plug', 'plunge',
    'plural', 'plus', 'pocket', 'poem', 'poet', 'poetry', 'point', 'poison',
    'pole', 'police', 'policeman', 'polish', 'polite', 'political', 'politician',
    'politics', 'pollution', 'pond', 'pool', 'poor', 'pop', 'popular', 'population',
    'porch', 'port', 'portion', 'portrait', 'position', 'positive', 'possess',
    'possession', 'possibility', 'possible', 'possibly', 'post', 'postage',
    'postman', 'pot', 'potato', 'pound', 'pour', 'poverty', 'powder', 'power',
    'powerful', 'practical', 'practice', 'praise', 'pray', 'prayer', 'precious',
    'precise', 'predict', 'prefer', 'preference', 'prejudice', 'prepare',
    'presence', 'present', 'preserve', 'president', 'press', 'pressure', 'pretend',
    'pretty', 'prevent', 'previous', 'previously', 'price', 'pride', 'priest',
    'primary', 'prime', 'prince', 'princess', 'principal', 'principle', 'print',
    'prison', 'prisoner', 'private', 'prize', 'probably', 'problem', 'process',
    'produce', 'product', 'production', 'profession', 'professional', 'professor',
    'profit', 'program', 'progress', 'project', 'promise', 'promote', 'prompt',
    'pronounce', 'pronunciation', 'proof', 'proper', 'properly', 'property',
    'proposal', 'propose', 'protect', 'protection', 'proud', 'prove', 'provide',
    'provided', 'province', 'public', 'publish', 'pull', 'pump', 'punch', 'punish',
    'punishment', 'pupil', 'purchase', 'pure', 'purple', 'purpose', 'purse',
    'push', 'put', 'puzzle', 'qualify', 'quality', 'quantity', 'quarrel', 'quarter',
    'queen', 'question', 'quick', 'quickly', 'quiet', 'quietly', 'quit', 'quite',
    'quote', 'rabbit', 'race', 'radio', 'rail', 'railroad', 'railway', 'rain',
    'raise', 'range', 'rank', 'rapid', 'rapidly', 'rare', 'rarely', 'rat', 'rate',
    'rather', 'raw', 'ray', 'reach', 'react', 'reaction', 'read', 'reader',
    'reading', 'ready', 'real', 'reality', 'realize', 'really', 'rear', 'reason',
    'reasonable', 'reasonably', 'receive', 'recent', 'recently', 'recognize',
    'record', 'recorder', 'recover', 'red', 'reduce', 'reduction', 'refer',
    'reference', 'reflect', 'reflection', 'reform', 'refuse', 'regard', 'region',
    'regret', 'regular', 'regularly', 'reject', 'relate', 'relation', 'relationship',
    'relative', 'relatively', 'relax', 'release', 'relief', 'religion', 'religious',
    'rely', 'remain', 'remark', 'remarkable', 'remember', 'remind', 'remote',
    'remove', 'rent', 'repair', 'repeat', 'replace', 'reply', 'report', 'represent',
    'representative', 'reputation', 'request', 'require', 'requirement', 'rescue',
    'research', 'reserve', 'resident', 'resist', 'resistance', 'resolve', 'resort',
    'resource', 'respect', 'respond', 'response', 'responsibility', 'responsible',
    'rest', 'restaurant', 'restore', 'restrict', 'result', 'retain', 'retire',
    'return', 'reveal', 'revenge', 'review', 'revolution', 'reward', 'rice',
    'rich', 'rid', 'ride', 'rider', 'ridiculous', 'rifle', 'right', 'ring',
    'ripe', 'rise', 'risk', 'rival', 'river', 'road', 'roar', 'roast', 'rob',
    'robber', 'rock', 'rocket', 'rod', 'role', 'roll', 'roof', 'room', 'root',
    'rope', 'rose', 'rot', 'rotten', 'rough', 'roughly', 'round', 'route',
    'row', 'royal', 'rub', 'rubber', 'rubbish', 'rude', 'ruin', 'rule', 'ruler',
    'rumor', 'run', 'rural', 'rush', 'rust', 'sad', 'saddle', 'safe', 'safety',
    'sail', 'sailor', 'sake', 'salad', 'salary', 'sale', 'salt', 'salute',
    'same', 'sample', 'sand', 'satisfaction', 'satisfactory', 'satisfy', 'saturday',
    'sauce', 'save', 'saw', 'say', 'scale', 'scandal', 'scarce', 'scarcely',
    'scare', 'scatter', 'scene', 'scenery', 'schedule', 'scheme', 'scholar',
    'scholarship', 'school', 'science', 'scientific', 'scientist', 'scissors',
    'scold', 'scope', 'score', 'scorn', 'scout', 'scrape', 'scratch', 'scream',
    'screen', 'screw', 'sea', 'seal', 'search', 'season', 'seat', 'second',
    'secondary', 'secret', 'secretary', 'section', 'secure', 'security', 'see',
    'seed', 'seek', 'seem', 'seize', 'seldom', 'select', 'selection', 'self',
    'sell', 'send', 'senior', 'sense', 'sensible', 'sensitive', 'sentence',
    'separate', 'september', 'series', 'serious', 'seriously', 'servant', 'serve',
    'service', 'session', 'set', 'settle', 'settlement', 'seven', 'several',
    'severe', 'sew', 'shade', 'shadow', 'shake', 'shall', 'shame', 'shape',
    'share', 'sharp', 'shave', 'she', 'sheep', 'sheet', 'shelf', 'shell', 'shelter',
    'shield', 'shift', 'shine', 'ship', 'shirt', 'shock', 'shoe', 'shoot', 'shop',
    'shore', 'short', 'shortly', 'shot', 'should', 'shoulder', 'shout', 'show',
    'shower', 'shut', 'sick', 'side', 'sight', 'sign', 'signal', 'signature',
    'significant', 'silence', 'silent', 'silk', 'silly', 'silver', 'similar',
    'similarly', 'simple', 'simply', 'sin', 'since', 'sincere', 'sing', 'singer',
    'single', 'sink', 'sir', 'sister', 'sit', 'site', 'situation', 'six', 'size',
    'skill', 'skin', 'skirt', 'sky', 'slave', 'sleep', 'slice', 'slide', 'slight',
    'slightly', 'slip', 'slope', 'slow', 'slowly', 'small', 'smart', 'smell',
    'smile', 'smoke', 'smooth', 'snake', 'snow', 'so', 'soap', 'soar', 'sob',
    'social', 'society', 'sock', 'soft', 'soil', 'soldier', 'sole', 'solid',
    'solution', 'solve', 'some', 'somebody', 'somehow', 'someone', 'something',
    'sometimes', 'somewhat', 'somewhere', 'son', 'song', 'soon', 'sore', 'sorrow',
    'sorry', 'sort', 'soul', 'sound', 'soup', 'sour', 'south', 'southern',
    'space', 'spare', 'speak', 'speaker', 'special', 'species', 'specific',
    'speech', 'speed', 'spell', 'spend', 'spirit', 'spiritual', 'spit', 'spite',
    'splendid', 'split', 'spoil', 'spoon', 'sport', 'spot', 'spread', 'spring',
    'square', 'squeeze', 'stable', 'staff', 'stage', 'stain', 'stair', 'stake',
    'stale', 'stamp', 'stand', 'standard', 'star', 'stare', 'start', 'starve',
    'state', 'statement', 'station', 'statue', 'status', 'stay', 'steady', 'steal',
    'steam', 'steel', 'steep', 'steer', 'stem', 'step', 'stick', 'stiff', 'still',
    'sting', 'stir', 'stock', 'stomach', 'stone', 'stool', 'stop', 'store',
    'storm', 'story', 'stove', 'straight', 'strain', 'strange', 'stranger',
    'strap', 'straw', 'stream', 'street', 'strength', 'stress', 'stretch',
    'strict', 'strike', 'string', 'strip', 'stripe', 'stroke', 'strong',
    'strongly', 'structure', 'struggle', 'stubborn', 'student', 'study', 'stuff',
    'stupid', 'style', 'subject', 'submit', 'substance', 'succeed', 'success',
    'successful', 'such', 'sudden', 'suddenly', 'suffer', 'sugar', 'suggest',
    'suit', 'suitable', 'sum', 'summer', 'sun', 'sunday', 'sunny', 'sunset',
    'sunshine', 'super', 'superior', 'supper', 'supply', 'support', 'suppose',
    'sure', 'surely', 'surface', 'surprise', 'surround', 'surrounding', 'survive',
    'suspect', 'suspicion', 'suspicious', 'swallow', 'swamp', 'swan', 'swear',
    'sweat', 'sweep', 'sweet', 'swell', 'swift', 'swim', 'swing', 'switch',
    'sword', 'symbol', 'sympathy', 'system', 'table', 'tail', 'take', 'tale',
    'talk', 'tall', 'tame', 'tank', 'tap', 'tape', 'target', 'task', 'taste',
    'tax', 'taxi', 'tea', 'teach', 'teacher', 'team', 'tear', 'tease', 'teeth',
    'telephone', 'television', 'tell', 'temper', 'temperature', 'temple', 'tempt',
    'ten', 'tend', 'tendency', 'tender', 'tennis', 'tense', 'tent', 'term',
    'terrible', 'terribly', 'territory', 'terror', 'test', 'text', 'than', 'thank',
    'that', 'the', 'theater', 'theatre', 'their', 'theirs', 'them', 'themselves',
    'then', 'there', 'therefore', 'these', 'they', 'thick', 'thief', 'thin',
    'thing', 'think', 'third', 'thirst', 'thirsty', 'thirteen', 'thirty', 'this',
    'thorough', 'those', 'though', 'thought', 'thousand', 'thread', 'threat',
    'threaten', 'three', 'threw', 'throat', 'through', 'throughout', 'throw',
    'thumb', 'thunder', 'thursday', 'thus', 'tick', 'ticket', 'tide', 'tidy',
    'tie', 'tiger', 'tight', 'till', 'time', 'tin', 'tiny', 'tip', 'tire',
    'tired', 'tissue', 'title', 'to', 'tobacco', 'today', 'toe', 'together',
    'toilet', 'tomato', 'tomorrow', 'ton', 'tone', 'tongue', 'tonight', 'too',
    'took', 'tool', 'tooth', 'top', 'topic', 'torch', 'torn', 'torture', 'toss',
    'total', 'touch', 'tough', 'tour', 'toward', 'towards', 'towel', 'tower',
    'town', 'toy', 'trace', 'track', 'trade', 'tradition', 'traditional',
    'traffic', 'tragedy', 'trail', 'train', 'trainer', 'training', 'transfer',
    'transform', 'translate', 'transport', 'trap', 'travel', 'tray', 'treasure',
    'treat', 'treatment', 'tree', 'tremble', 'tremendous', 'trend', 'trial',
    'tribe', 'trick', 'tried', 'trip', 'troop', 'trouble', 'troublesome', 'trousers',
    'truck', 'true', 'truly', 'trunk', 'trust', 'truth', 'try', 'tube', 'tuesday',
    'tune', 'tunnel', 'turn', 'twelve', 'twenty', 'twice', 'twin', 'twist', 'two',
    'type', 'typical', 'ugly', 'umbrella', 'unable', 'uncle', 'under', 'underground',
    'understand', 'understanding', 'undertake', 'unemployment', 'unexpected',
    'unfair', 'unfortunate', 'unfortunately', 'unhappy', 'uniform', 'union',
    'unique', 'unit', 'unite', 'united', 'unity', 'universal', 'universe',
    'university', 'unknown', 'unless', 'unlike', 'unlikely', 'until', 'unusual',
    'up', 'upon', 'upper', 'upset', 'upside', 'upstairs', 'upward', 'urge',
    'urgent', 'us', 'use', 'used', 'useful', 'useless', 'usual', 'usually',
    'utility', 'utilize', 'utmost', 'utter', 'utterly', 'vacation', 'vain',
    'valid', 'valley', 'valuable', 'value', 'van', 'variety', 'various', 'vary',
    'vast', 'vegetable', 'vehicle', 'venture', 'verb', 'verse', 'version',
    'versus', 'very', 'vessel', 'veteran', 'via', 'vice', 'victim', 'victory',
    'video', 'view', 'village', 'violence', 'violent', 'violin', 'virtue',
    'virus', 'visible', 'vision', 'visit', 'visitor', 'visual', 'vital', 'voice',
    'volume', 'volunteer', 'vote', 'wage', 'waist', 'wait', 'wake', 'walk',
    'wall', 'wander', 'want', 'war', 'ward', 'warm', 'warn', 'warning', 'wash',
    'waste', 'watch', 'water', 'wave', 'way', 'we', 'weak', 'weakness', 'wealth',
    'weapon', 'wear', 'weather', 'wedding', 'wednesday', 'weed', 'week', 'weep',
    'weigh', 'weight', 'welcome', 'welfare', 'well', 'went', 'were', 'west',
    'western', 'wet', 'what', 'whatever', 'wheat', 'wheel', 'when', 'whenever',
    'where', 'whereas', 'wherever', 'whether', 'which', 'whichever', 'while',
    'whisper', 'whistle', 'white', 'who', 'whoever', 'whole', 'whom', 'whose',
    'why', 'wide', 'widely', 'widespread', 'wife', 'wild', 'will', 'willing',
    'win', 'wind', 'window', 'wine', 'wing', 'winner', 'winter', 'wipe', 'wire',
    'wise', 'wish', 'wit', 'with', 'withdraw', 'within', 'without', 'witness',
    'woman', 'wonder', 'wonderful', 'wood', 'wooden', 'wool', 'word', 'work',
    'worker', 'world', 'worn', 'worried', 'worry', 'worse', 'worship', 'worst',
    'worth', 'worthy', 'would', 'wound', 'wrap', 'wreck', 'wrist', 'write',
    'writer', 'writing', 'written', 'wrong', 'wrote', 'yard', 'yawn', 'year',
    'yellow', 'yes', 'yesterday', 'yet', 'yield', 'you', 'young', 'your',
    'yours', 'yourself', 'youth', 'zero', 'zone'
];

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

// Initialize face-api.js emotion recognition models
async function initEmotionModel() {
    if (emotionModelsLoaded || emotionModelLoading) {
        return;
    }

    emotionModelLoading = true;
    status.textContent = 'Loading emotion models...';
    status.style.color = '#f59e0b';

    try {
        // Check if face-api is available
        if (typeof faceapi === 'undefined') {
            console.error('face-api.js not loaded');
            status.textContent = 'Emotion models failed to load';
            status.style.color = '#ef4444';
            emotionModelLoading = false;
            return;
        }

        // Load models from CDN
        // Try multiple CDN options for reliability (GitHub raw is most reliable)
        const MODEL_URLS = [
            'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights',
            'https://unpkg.com/face-api.js@0.22.2/weights',
            'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights'
        ];
        
        let modelLoaded = false;
        let lastError = null;
        
        // Try each CDN until one works
        for (const MODEL_URL of MODEL_URLS) {
            try {
                console.log(`Attempting to load models from: ${MODEL_URL}`);
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);
                modelLoaded = true;
                console.log(`Successfully loaded models from: ${MODEL_URL}`);
                break;
            } catch (error) {
                console.warn(`Failed to load from ${MODEL_URL}:`, error);
                lastError = error;
                continue;
            }
        }
        
        if (!modelLoaded) {
            throw new Error(`Failed to load models from all CDNs. Last error: ${lastError?.message}`);
        }

        emotionModelsLoaded = true;
        emotionModelLoading = false;
        console.log('Emotion models loaded successfully');
        
        if (status.textContent.includes('Loading emotion models')) {
            status.textContent = 'Models loaded - Click "Start Camera" to begin';
            status.style.color = '#10b981';
        }
    } catch (error) {
        console.error('Error loading emotion models:', error);
        emotionModelLoading = false;
        status.textContent = 'Emotion models failed to load - using fallback';
        status.style.color = '#ef4444';
    }
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

        // Map nose position to full viewport cursor (full-page accessibility)
        // Use normalized coordinates (0-1) from noseTip

        // Map nose position (invert X for natural movement)
        let normalizedX = 1 - noseTip.x; // Invert X for natural left-right
        let normalizedY = noseTip.y;

        // Apply sensitivity multiplier for easier movement (higher = more sensitive)
        // Separate sensitivity for X and Y axes - Y needs more sensitivity for up/down
        const sensitivityX = 4.0;  // Increased from 2.5 for tilting instead of full head movement
        const sensitivityY = 5.0;  // Increased from 3.5 for easier vertical navigation
        normalizedX = (normalizedX - 0.5) * sensitivityX + 0.5;
        normalizedY = (normalizedY - 0.5) * sensitivityY + 0.5;

        // Clamp values to stay within bounds [0, 1]
        normalizedX = Math.max(0, Math.min(1, normalizedX));
        normalizedY = Math.max(0, Math.min(1, normalizedY));

        // Calculate cursor position within FULL VIEWPORT bounds
        const cursorX = normalizedX * window.innerWidth;
        const cursorY = normalizedY * window.innerHeight;

        // Update cursor position (fixed positioning relative to viewport)
        keyboardCursor.style.left = `${cursorX}px`;
        keyboardCursor.style.top = `${cursorY}px`;
        keyboardCursor.classList.add('active');

        // Update coordinates display
        coordX.textContent = Math.round(normalizedX * 100);
        coordY.textContent = Math.round(normalizedY * 100);

        // Detect and update emotion using ML (async, non-blocking)
        // Only detect if models are loaded and no detection is already pending
        if (emotionModelsLoaded && !emotionDetectionPending) {
            emotionDetectionPending = true;
            emotionDetectionPromise = detectEmotion()
                .then((result) => {
                    // Skip if throttled (result is null)
                    if (result === null) {
                        emotionDetectionPending = false;
                        return;
                    }
                    const { emotion, confidence } = result;
                    if (Math.random() < 0.1) { // Log occasionally
                        console.log('[onResults] Emotion detected:', emotion, 'confidence:', confidence);
                    }
        updateEmotionUI(emotion, confidence);
                    emotionDetectionPending = false;
                })
                .catch(error => {
                    console.error('[onResults] Emotion detection error:', error);
                    // Fallback to neutral on error
                    updateEmotionUI('neutral', 0.5);
                    emotionDetectionPending = false;
                });
        } else if (!emotionModelsLoaded && !emotionModelLoading) {
            // Models not loaded yet, show status
            console.warn('[onResults] Emotion models not loaded yet. emotionModelsLoaded:', emotionModelsLoaded);
        }

        status.textContent = 'Tracking active - Move your nose!';
        status.style.color = '#10b981';
    } else {
        keyboardCursor.classList.remove('active');
        status.textContent = 'No face detected';
        status.style.color = '#ef4444';
    }

    canvasCtx.restore();

    // Check element interaction (full-page accessibility)
    if (isTracking) {
        checkElementHover();
    }
}

// Universal element hover detection (full-page accessibility)
function checkElementHover() {
    const cursorRect = keyboardCursor.getBoundingClientRect();
    const cursorCenterX = cursorRect.left + cursorRect.width / 2;
    const cursorCenterY = cursorRect.top + cursorRect.height / 2;

    // Get all elements under the cursor center point
    const elementsAtPoint = document.elementsFromPoint(cursorCenterX, cursorCenterY);

    // Find first interactive element (buttons, keyboard keys, voice options)
    let foundElement = null;
    for (const element of elementsAtPoint) {
        // Check for keyboard keys (skip if disabled)
        if (element.classList.contains('key') && !element.disabled) {
            foundElement = element;
            break;
        }
        // Check for control buttons (Start/Stop Camera)
        if ((element.id === 'startBtn' || element.id === 'stopBtn') && !element.disabled) {
            foundElement = element;
            break;
        }
        // Check for voice selector labels
        if (element.classList.contains('voice-option')) {
            foundElement = element;
            break;
        }
    }

    // Handle element hover state change
    if (foundElement !== hoveredElement) {
        // Clear previous hover
        if (hoveredElement) {
            // Remove hover class based on element type
            if (hoveredElement.classList.contains('key')) {
                hoveredElement.classList.remove('hovering');
            } else {
                hoveredElement.classList.remove('nose-hovering');
            }
            clearTimeout(dwellTimeout);
            dwellTimeout = null;
        }

        // Set new hover
        hoveredElement = foundElement;

        if (hoveredElement) {
            // Add hover class based on element type
            if (hoveredElement.classList.contains('key')) {
                hoveredElement.classList.add('hovering');
            } else {
                hoveredElement.classList.add('nose-hovering');
            }
            dwellStartTime = Date.now();

            // Start dwell timer
            dwellTimeout = setTimeout(() => {
                selectElement(hoveredElement);
            }, dwellTime);
        }
    }
}

// Universal element selection (handles all interactive elements)
function selectElement(element) {
    // Add selection visual feedback
    if (element.classList.contains('key')) {
        element.classList.add('selecting');
    setTimeout(() => {
            element.classList.remove('selecting', 'hovering');
    }, 200);
    } else {
        element.classList.remove('nose-hovering');
    }

    // Handle different element types
    if (element.classList.contains('key')) {
        // Keyboard key selected
        const keyValue = element.getAttribute('data-key');

    // Handle different key types
    if (keyValue === 'BACKSPACE') {
        currentText = currentText.slice(0, -1);
            updateTextDisplay();
    } else if (keyValue === 'CLEAR') {
        currentText = '';
            currentSuggestion = '';
            updateTextDisplay();
        } else if (keyValue === 'AUTOCOMPLETE') {
            // Accept autocomplete suggestion (only if button is enabled)
            if (element.disabled || !currentSuggestion) {
                return; // Don't do anything if disabled or no suggestion
            }
            const words = currentText.trim().split(/\s+/);
            if (words.length > 0) {
                words[words.length - 1] = currentSuggestion;
                currentText = words.join(' ') + ' ';
            } else {
                currentText = currentSuggestion + ' ';
            }
            currentSuggestion = '';
            updateTextDisplay();
    } else if (keyValue === 'ENTER') {
        // Check cooldown before speaking
        if (speakCooldown) {
            console.log('SPEAK button on cooldown, please wait...');
            status.textContent = 'Please wait (cooldown)...';
            status.style.color = '#f59e0b';
            return;
        }

            // DEBUG: Log emotion state at button press
            console.log('=== SPEAK BUTTON PRESSED ===');
            console.log('currentEmotion value:', currentEmotion);
            console.log('currentEmotion type:', typeof currentEmotion);
            console.log('emotionConfidence:', emotionConfidence);

        // Trigger text-to-speech with detected emotion
        speakText(currentText, currentEmotion);

        // Set cooldown for 2 seconds
        speakCooldown = true;
        setTimeout(() => {
            speakCooldown = false;
            console.log('SPEAK button cooldown expired');
        }, 2000);
            
            // Clear suggestion when speaking
            currentSuggestion = '';
            updateTextDisplay();
        } else if (keyValue === ' ') {
            // Space key - word complete, clear suggestion
            currentText += keyValue;
            currentSuggestion = '';
            updateTextDisplay();
    } else {
            // Regular letter/number/punctuation
        currentText += keyValue;
            updateTextDisplay();
        }
    } else if (element.id === 'startBtn') {
        // Start Camera button selected
        if (!element.disabled) {
            startTracking();
        }
    } else if (element.id === 'stopBtn') {
        // Stop Camera button selected
        if (!element.disabled) {
            stopTracking();
        }
    } else if (element.classList.contains('voice-option')) {
        // Voice selector option selected
        const radioInput = element.querySelector('input[type="radio"]');
        if (radioInput) {
            radioInput.checked = true;
            selectedVoice = radioInput.value;
            console.log(`Voice changed to: ${selectedVoice} (via nose selection)`);
        }
    }

    // Clear hover state
    hoveredElement = null;
    clearTimeout(dwellTimeout);
    dwellTimeout = null;
}

// ML-based emotion detection using face-api.js
async function detectEmotion() {
    // Check if models are loaded
    if (!emotionModelsLoaded) {
        console.warn('[detectEmotion] Models not loaded. emotionModelsLoaded:', emotionModelsLoaded);
        // Fallback to neutral if models not loaded
        return { emotion: 'neutral', confidence: 0.5 };
    }

    // Throttle emotion detection to avoid performance issues
    const now = Date.now();
    if (now - lastEmotionDetectionTime < EMOTION_DETECTION_INTERVAL) {
        // Don't return cached - instead, skip this detection entirely
        // This prevents stale cached values from being used
        // The pending flag will prevent multiple concurrent calls anyway
        return null; // Signal to skip this detection
    }
    lastEmotionDetectionTime = now;
    if (Math.random() < 0.1) { // Log occasionally
        console.log('[detectEmotion] Running detection...');
    }

    try {
        // Check if face-api is available
        if (typeof faceapi === 'undefined') {
            console.warn('face-api.js not available');
            return { emotion: 'neutral', confidence: 0.5 };
        }

        // Check if video is ready
        if (!video || video.readyState < 2) {
            console.warn('Video not ready for emotion detection');
            return { emotion: 'neutral', confidence: 0.3 };
        }

        // Detect face and expressions in the video frame
        // Use smaller input size for better performance
        const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
            .withFaceExpressions();

        if (!detection) {
            // No face detected, return neutral
            console.debug('No face detected by face-api.js');
            return { emotion: 'neutral', confidence: 0.3 };
        }

        // Get emotion expressions from face-api.js
        // face-api.js returns: { neutral, happy, sad, angry, fearful, disgusted, surprised }
        const expressions = detection.expressions;
        
        // Debug: log all expressions (only log occasionally to reduce console spam)
        if (Math.random() < 0.1) { // Log ~10% of the time
            console.log('Face-api.js expressions:', expressions);
        }

        // Map face-api.js emotions to our 5 emotions
        // face-api.js uses: happy, sad, angry, surprised, neutral, fearful, disgusted
        // We need: happy, sad, neutral, surprised, angry
        const emotionMap = {
            'happy': expressions.happy || 0,
            'sad': expressions.sad || 0,
            'neutral': expressions.neutral || 0,
            'surprised': expressions.surprised || 0,
            'angry': expressions.angry || 0
        };
        
        // Debug: log emotion map when sad/angry are detected or when they're close
        // Always log when sad/angry are above threshold to help debug
        if (emotionMap.sad > 0.08 || emotionMap.angry > 0.10 || Math.random() < 0.05) {
            console.log('[detectEmotion] Raw emotion probabilities:', {
                happy: (emotionMap.happy * 100).toFixed(1) + '%',
                sad: (emotionMap.sad * 100).toFixed(1) + '%',
                angry: (emotionMap.angry * 100).toFixed(1) + '%',
                surprised: (emotionMap.surprised * 100).toFixed(1) + '%',
                neutral: (emotionMap.neutral * 100).toFixed(1) + '%'
            });
            if (emotionMap.sad > 0.08) {
                console.log(`[detectEmotion] 🔍 Sad detected at ${(emotionMap.sad * 100).toFixed(1)}%, neutral at ${(emotionMap.neutral * 100).toFixed(1)}%`);
            }
            if (emotionMap.angry > 0.10) {
                console.log(`[detectEmotion] 🔍 Angry detected at ${(emotionMap.angry * 100).toFixed(1)}%, neutral at ${(emotionMap.neutral * 100).toFixed(1)}%`);
            }
        }

        // Find emotion with highest probability
        // Very aggressive handling for subtle emotions like sad and angry
        // face-api.js often under-detects these, so we need to be very lenient
        const SAD_MIN_THRESHOLD = 0.08; // Very low threshold for sad (8% - very sensitive)
        const ANGRY_MIN_THRESHOLD = 0.10; // Low threshold for angry (10%)
        const OTHER_NON_NEUTRAL_MIN_THRESHOLD = 0.25; // Threshold for other emotions
        
        let maxEmotion = 'neutral';
        let maxConfidence = emotionMap.neutral;
        
        // VERY AGGRESSIVE handling for sad: prioritize it heavily
        // If sad is above a very low threshold, give it priority even if neutral is much higher
        if (emotionMap.sad >= SAD_MIN_THRESHOLD) {
            // If sad is within 0.35 of neutral (very lenient), prefer sad
            // This helps catch even very subtle sad expressions (frowns, downturned lips)
            if (emotionMap.sad >= emotionMap.neutral - 0.35) {
                maxEmotion = 'sad';
                maxConfidence = emotionMap.sad;
                console.log(`[detectEmotion] ✅ Prioritizing SAD (${emotionMap.sad.toFixed(2)}) over neutral (${emotionMap.neutral.toFixed(2)})`);
            } else {
                // Even if not within range, if sad is above threshold and neutral isn't dominant, still consider it
                if (emotionMap.neutral < 0.7 && emotionMap.sad > 0.1) {
                    maxEmotion = 'sad';
                    maxConfidence = emotionMap.sad;
                    console.log(`[detectEmotion] ✅ Choosing SAD (${emotionMap.sad.toFixed(2)}) - neutral not dominant (${emotionMap.neutral.toFixed(2)})`);
                }
            }
        }
        
        // AGGRESSIVE handling for angry: prioritize it if sad didn't win
        if (emotionMap.angry >= ANGRY_MIN_THRESHOLD && maxEmotion === 'neutral') {
            // If angry is within 0.30 of neutral, prefer angry
            if (emotionMap.angry >= emotionMap.neutral - 0.30) {
                maxEmotion = 'angry';
                maxConfidence = emotionMap.angry;
                console.log(`[detectEmotion] ✅ Prioritizing ANGRY (${emotionMap.angry.toFixed(2)}) over neutral (${emotionMap.neutral.toFixed(2)})`);
            } else {
                // Even if not within range, if angry is above threshold and neutral isn't dominant, still consider it
                if (emotionMap.neutral < 0.7 && emotionMap.angry > 0.12) {
                    maxEmotion = 'angry';
                    maxConfidence = emotionMap.angry;
                    console.log(`[detectEmotion] ✅ Choosing ANGRY (${emotionMap.angry.toFixed(2)}) - neutral not dominant (${emotionMap.neutral.toFixed(2)})`);
                }
            }
        }
        
        // For other non-neutral emotions (happy, surprised), use standard logic
        if (maxEmotion === 'neutral') {
            let bestNonNeutral = null;
            let bestNonNeutralConf = 0;
            
            // Check happy and surprised
            for (const [emotion, confidence] of Object.entries(emotionMap)) {
                if (emotion !== 'neutral' && emotion !== 'sad' && emotion !== 'angry' && confidence > bestNonNeutralConf) {
                    bestNonNeutralConf = confidence;
                    bestNonNeutral = emotion;
                }
            }
            
            // If we have a non-neutral emotion above threshold, prefer it
            if (bestNonNeutral && bestNonNeutralConf >= OTHER_NON_NEUTRAL_MIN_THRESHOLD) {
                // If non-neutral is within 0.15 of neutral, prefer non-neutral
                if (bestNonNeutralConf >= emotionMap.neutral - 0.15) {
                    maxEmotion = bestNonNeutral;
                    maxConfidence = bestNonNeutralConf;
                    if (Math.random() < 0.1) {
                        console.log(`[detectEmotion] Prioritizing non-neutral emotion: ${bestNonNeutral} (${bestNonNeutralConf.toFixed(2)}) over neutral (${emotionMap.neutral.toFixed(2)})`);
                    }
                }
            }
            
            // Fallback: if no special case matched, use the emotion with highest confidence
            if (maxEmotion === 'neutral') {
                for (const [emotion, confidence] of Object.entries(emotionMap)) {
                    if (confidence > maxConfidence) {
                        maxConfidence = confidence;
                        maxEmotion = emotion;
                    }
                }
            }
        }

        // Debug: log detected emotion (only occasionally to reduce console spam)
        if (Math.random() < 0.1) { // Log ~10% of the time
            console.log(`[detectEmotion] Detected emotion: ${maxEmotion} (confidence: ${maxConfidence.toFixed(2)})`);
        }

        // Return detected emotion and confidence
        return { 
            emotion: maxEmotion, 
            confidence: Math.min(maxConfidence, 0.99) // Cap at 0.99 for display
        };

    } catch (error) {
        console.error('Error in ML emotion detection:', error);
        // Fallback to neutral on error
        return { emotion: 'neutral', confidence: 0.5 };
    }
}

// Update emotion UI with stabilization and 5-second lock
function updateEmotionUI(emotion, confidence) {
    console.log(`[updateEmotionUI] Called with emotion: ${emotion}, confidence: ${confidence}, locked: ${emotionLocked}`);
    
    // If emotion is locked, don't update
    if (emotionLocked) {
        console.log('[updateEmotionUI] Emotion is locked, skipping update');
        return;
    }

    // Add detected emotion to buffer (single entry - no weighting to prevent dominance)
    // Remove oldest entry if buffer is full
    if (emotionBuffer.length >= EMOTION_BUFFER_SIZE) {
        emotionBuffer.shift();
    }
    
    emotionBuffer.push(emotion);
    
    // Log high confidence detections for debugging
    if (emotion !== 'neutral' && confidence >= NON_NEUTRAL_CONFIDENCE_THRESHOLD) {
        console.log(`[updateEmotionUI] High confidence ${emotion} detected (${(confidence * 100).toFixed(0)}%)`);
    }

    // Calculate majority emotion from buffer
    const emotionCounts = {};
    emotionBuffer.forEach(e => {
        emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    });

    // Find emotion with highest count
    let stabilizedEmotion = currentEmotion;
    let maxCount = 0;
    for (const [emo, count] of Object.entries(emotionCounts)) {
        if (count > maxCount) {
            maxCount = count;
            stabilizedEmotion = emo;
        }
    }

    // Check if recent emotions (last 2-3 entries) agree on a new emotion
    // This allows new emotions to override old ones more quickly
    let recentStabilizedEmotion = stabilizedEmotion;
    if (emotionBuffer.length >= 3) {
        const recentEmotions = emotionBuffer.slice(-3); // Last 3 entries
        const recentCounts = {};
        recentEmotions.forEach(e => {
            recentCounts[e] = (recentCounts[e] || 0) + 1;
        });
        const recentMax = Math.max(...Object.values(recentCounts));
        const recentEmotion = Object.keys(recentCounts).find(e => recentCounts[e] === recentMax);
        // If recent emotion has 2+ out of 3, prioritize it
        if (recentEmotion && recentCounts[recentEmotion] >= 2) {
            recentStabilizedEmotion = recentEmotion;
        }
    }

    // Only change emotion if it exceeds threshold OR if recent emotions strongly agree
    const agreementRatio = maxCount / emotionBuffer.length;
    const recentAgreement = emotionBuffer.length >= 3 ? 
        (emotionBuffer.slice(-3).filter(e => e === recentStabilizedEmotion).length / 3) : 0;
    
    const shouldChange = (agreementRatio >= EMOTION_THRESHOLD && stabilizedEmotion !== currentEmotion) ||
                        (recentAgreement >= 0.67 && recentStabilizedEmotion !== currentEmotion && recentStabilizedEmotion !== 'neutral');
    
    if (shouldChange) {
        const newEmotion = recentAgreement >= 0.67 ? recentStabilizedEmotion : stabilizedEmotion;
        console.log('[EMOTION CHANGED] From:', currentEmotion, 'To:', newEmotion,
                    `(Overall: ${Math.round(agreementRatio * 100)}%, Recent: ${Math.round(recentAgreement * 100)}% agreement)`);
        currentEmotion = newEmotion;

        // Lock emotion for 2 seconds
        emotionLocked = true;
        if (emotionLockTimeout) {
            clearTimeout(emotionLockTimeout);
        }
        emotionLockTimeout = setTimeout(() => {
            emotionLocked = false;
            console.log('[EMOTION UNLOCKED] Can change emotion again');
        }, EMOTION_LOCK_DURATION);
        console.log(`[EMOTION LOCKED] Locked for ${EMOTION_LOCK_DURATION / 1000} seconds`);
    }

    emotionConfidence = confidence;

    // Display logic: Prioritize recent emotions for immediate feedback
    let displayEmotion = currentEmotion;
    
    if (emotionBuffer.length >= 2) {
        // Check last 2 entries - if they agree, show that emotion immediately
        const lastTwo = emotionBuffer.slice(-2);
        if (lastTwo[0] === lastTwo[1] && lastTwo[0] !== currentEmotion) {
            displayEmotion = lastTwo[0];
        } else if (agreementRatio >= EMOTION_THRESHOLD) {
            // Otherwise use stabilized emotion if threshold met
            displayEmotion = stabilizedEmotion;
        } else {
            // Fallback to most recent
            displayEmotion = emotion;
        }
    } else {
        // Buffer not full yet, show latest detected
        displayEmotion = emotion;
    }
    
    emotionIcon.textContent = EMOTION_ICONS[displayEmotion];
    emotionLabel.textContent = displayEmotion.charAt(0).toUpperCase() + displayEmotion.slice(1);
    confidenceFill.style.width = `${confidence * 100}%`;
    confidenceText.textContent = `${Math.round(confidence * 100)}%`;
    
    console.log(`[updateEmotionUI] UI updated - Display: ${displayEmotion}, Current: ${currentEmotion}, Stabilized: ${stabilizedEmotion}, Buffer: ${emotionBuffer.length}, Agreement: ${(agreementRatio * 100).toFixed(0)}%`);
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

        // DEBUG: Log emotion parameter received
        console.log('=== speakText() called ===');
        console.log('emotion parameter:', emotion);
        console.log('emotion type:', typeof emotion);
        console.log('CONFIG.EMOTION_VOICE_PARAMS:', CONFIG.EMOTION_VOICE_PARAMS);
        console.log('CONFIG.EMOTION_VOICE_PARAMS[emotion]:', CONFIG.EMOTION_VOICE_PARAMS[emotion]);

        // Get voice parameters based on emotion
        const voiceParams = CONFIG.EMOTION_VOICE_PARAMS[emotion] || CONFIG.EMOTION_VOICE_PARAMS.neutral;

        console.log('voiceParams object:', voiceParams);
        console.log('voiceParams.speed:', voiceParams.speed);

        // Validate CONFIG is loaded
        if (!CONFIG || !CONFIG.VOICE_REFERENCES) {
            throw new Error('CONFIG not loaded. Please refresh the page.');
        }

        // Get selected voice reference ID (male/female)
        const voiceReferenceId = CONFIG.VOICE_REFERENCES[selectedVoice];

        // Validate voice reference ID exists
        if (!voiceReferenceId) {
            const availableVoices = Object.keys(CONFIG.VOICE_REFERENCES).join(', ');
            console.error(`Voice reference ID not found for voice: "${selectedVoice}"`);
            console.error(`Available voices: ${availableVoices}`);
            console.error(`CONFIG.VOICE_REFERENCES:`, CONFIG.VOICE_REFERENCES);
            throw new Error(`Voice reference ID not found for voice: ${selectedVoice}. Available voices: ${availableVoices}`);
        }

        // Debug logging
        console.log('=== Fish Audio TTS Request ===');
        console.log('Text:', text);
        console.log('Emotion:', emotion);
        console.log('Selected Voice:', selectedVoice);
        console.log('Voice Reference ID:', voiceReferenceId);
        console.log('Speed (from emotion):', voiceParams.speed);
        console.log('Volume (from emotion):', voiceParams.volume);

        // Convert numbers to words for better TTS pronunciation
        const processedText = convertTextNumbers(text);
        console.log('Original text:', text);
        console.log('Processed text (numbers→words):', processedText);

        // Prepare request payload with correct Fish Audio API format
        // Speed and volume must be nested inside 'prosody' object
        const requestBody = {
            text: processedText,  // Text with numbers converted to words
            reference_id: voiceReferenceId, // Male or Female voice
            format: 'mp3',
            mp3_bitrate: 128,
            normalize: true,
            prosody: {
                speed: voiceParams.speed || 1.0,  // Speech speed multiplier (0.5-2.0)
                volume: voiceParams.volume || 0   // Volume adjustment in dB
            }
        };

        console.log('Request Body:', JSON.stringify(requestBody, null, 2));

        // Call local proxy server (avoids CORS issues)
        const response = await fetch('http://localhost:5001/tts', {
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
        console.error('Selected Voice:', selectedVoice);
        console.error('Voice Reference ID:', CONFIG.VOICE_REFERENCES[selectedVoice]);
        console.error('CONFIG.VOICE_REFERENCES:', CONFIG.VOICE_REFERENCES);

        // Show error to user
        status.textContent = `Error: ${error.message}`;
        status.style.color = '#ef4444';

        // Fallback to Web Speech API if Fish Audio fails
        console.log('Falling back to Web Speech API...');
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

    // Adjust speech rate and pitch based on emotion (enhanced ranges)
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (emotion === 'happy') {
        utterance.rate = 1.0;   // Much faster for happiness
        utterance.pitch = 1.3;  // Higher pitch for cheerfulness
    } else if (emotion === 'sad') {
        utterance.rate = 0.5;   // Much slower for sadness
        utterance.pitch = 1.5;  // Lower pitch for melancholy
    } else if (emotion === 'angry') {
        utterance.rate = 1.5;   // Faster for intensity
        utterance.pitch = 0.5;  // Lower pitch for anger
    } else if (emotion === 'surprised') {
        utterance.rate = 2.0;   // Very fast for surprise
        utterance.pitch = 2.5;  // Very high pitch for excitement
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

        // Initialize emotion models if not already loaded
        if (!emotionModelsLoaded && !emotionModelLoading) {
            await initEmotionModel();
        }

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

        // Reset emotion buffer and state when starting fresh
        emotionBuffer = [];
        currentEmotion = 'neutral';
        emotionLocked = false;
        emotionDetectionPending = false;
        emotionDetectionPromise = null;
        if (emotionLockTimeout) {
            clearTimeout(emotionLockTimeout);
            emotionLockTimeout = null;
        }

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

    keyboardCursor.classList.remove('active');
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
// Voice selection event listeners
voiceRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        selectedVoice = e.target.value;
        console.log(`Voice changed to: ${selectedVoice}`);
    });
});

// Add mouse hover and click support to keyboard keys for testing
let mouseHoveredKey = null;
let mouseDwellTimeout = null;

keys.forEach(key => {
    // Mouse hover with dwell time (same as nose tracking)
    key.addEventListener('mouseenter', () => {
        // Clear any existing timeout
        if (mouseDwellTimeout) {
            clearTimeout(mouseDwellTimeout);
        }
        
        // Clear previous hovered key
        if (mouseHoveredKey && mouseHoveredKey !== key) {
            mouseHoveredKey.classList.remove('hovering');
        }
        
        mouseHoveredKey = key;
        key.classList.add('hovering');
        
        // Start dwell timer
        mouseDwellTimeout = setTimeout(() => {
            selectElement(key);
            key.classList.remove('hovering');
            mouseHoveredKey = null;
        }, dwellTime);
    });
    
    key.addEventListener('mouseleave', () => {
        if (mouseDwellTimeout) {
            clearTimeout(mouseDwellTimeout);
            mouseDwellTimeout = null;
        }
        if (mouseHoveredKey === key) {
            key.classList.remove('hovering');
            mouseHoveredKey = null;
        }
    });
    
    // Immediate click support (for faster testing)
    key.addEventListener('click', (e) => {
        e.preventDefault();
        // Clear hover timeout if exists
        if (mouseDwellTimeout) {
            clearTimeout(mouseDwellTimeout);
            mouseDwellTimeout = null;
        }
        if (mouseHoveredKey === key) {
            key.classList.remove('hovering');
            mouseHoveredKey = null;
        }
        selectElement(key);
    });
});

// Initialize emotion models on page load
initEmotionModel().catch(error => {
    console.error('Failed to initialize emotion models:', error);
});

// Initialize autocomplete button (disabled by default)
if (autocompleteBtn) {
    autocompleteBtn.disabled = true;
    autocompleteBtn.style.opacity = '0.4';
    autocompleteBtn.style.cursor = 'not-allowed';
}

// Initialize
status.textContent = 'Click "Start Camera" to begin';
status.style.color = '#6b7280';
