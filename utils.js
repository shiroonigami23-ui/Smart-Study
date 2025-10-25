// ====================================
// UTILITY FUNCTIONS
// ====================================

/**
 * Displays a toast notification.
 * @param {string} message The message to display.
 * @param {string} type 'info' (default), 'success', 'error', or 'warning'.
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Shows the global loading overlay.
 * @param {string} text The text to display (e.g., "Processing...").
 */
function showLoading(text = 'Processing...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = text;
    if (overlay) overlay.classList.remove('hidden');
}

/**
 * Hides the global loading overlay.
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

/**
 * Shows a modal dialog.
 * @param {string} title The title for the modal header.
 * @param {string} body The HTML content for the modal body.
 * @param {function | null} onConfirm A callback function to run when the confirm button is clicked.
 */
function showModal(title, body, onConfirm = null) {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm');
    if (!overlay || !modalTitle || !modalBody || !confirmBtn) return;
    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    overlay.classList.remove('hidden');

    // Remove old listener and add new one
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.onclick = () => {
        if (onConfirm) onConfirm();
        hideModal();
    };
}

/**
 * Hides the modal dialog.
 */
function hideModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
}

// ====================================
// WEB SPEECH API (CRITICAL FIX: Safe initialization)
// ====================================

let speechSynthesis = window.speechSynthesis;
let speechRecognition = null;

// Only initialize speech recognition if the API is supported
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition = new SpeechRecognition();
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;
        speechRecognition.lang = 'en-US';
    } catch (e) {
        console.warn("Speech Recognition API initialization failed:", e);
        speechRecognition = null;
    }
} else {
    console.warn("Speech Recognition API not supported in this browser.");
}

// utils.js
let currentUtterance = null; // Declare a global variable near the top of utils.js

/**
 * Speaks the given text using the browser's speech synthesis.
 * @param {string} text The text to speak.
 */
function speak(text) {
    if (!speechSynthesis || !appState.userProfile.settings.voiceEnabled) return;
    
    speechSynthesis.cancel();
    
    // Assign the utterance to a global variable to prevent garbage collection
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = 0.9;
    currentUtterance.pitch = 1;
    speechSynthesis.speak(currentUtterance);
}


/**
 * Starts voice recognition and calls a callback with the transcript.
 * @param {function} callback A function to call with the resulting transcript.
 */
function startVoiceRecognition(callback) {
    if (!speechRecognition || !appState.userProfile.settings.voiceEnabled) {
        showToast('Voice recognition not available', 'error');
        return;
    }

    speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        callback(transcript);
    };

    speechRecognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        showToast('Voice recognition error. Please try again.', 'error');
    };
    
    // Safety check to ensure it's not already running
    if (speechRecognition.recognizing) {
        speechRecognition.stop(); 
    }

    try {
        speechRecognition.start();
        showToast('Listening...', 'info');
    } catch (e) {
        console.error("Speech recognition start error:", e);
        showToast('Voice recognition could not start.', 'error');
    }
}

// ====================================
// GAMIFICATION & FORMATTING UTILS
// ====================================

/**
 * Calculates the user's level and title based on their XP.
 * @param {number} xp The user's total XP.
 * @returns {{level: number, title: string}} The calculated level and title.
 */
function calculateLevel(xp) {
    // XP_LEVELS is a global constant from config.js
    if (typeof XP_LEVELS === 'undefined') {
        console.error("XP_LEVELS is not defined. Check config.js.");
        return { level: 1, title: "Beginner" };
    }
    
    let level = 1;
    let title = "Beginner";
    for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
        if (xp >= XP_LEVELS[i].xpRequired) {
            level = XP_LEVELS[i].level;
            title = XP_LEVELS[i].title;
            break;
        }
    }
    return { level, title };
}

/**
 * Formats a duration in seconds into a human-readable string (e.g., "1h 30m" or "45s").
 * @param {number} seconds The total seconds.
 * @returns {string} The formatted time string.
 */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Formats a file size in bytes to a human-readable string.
 * @param {number} bytes The file size in bytes.
 * @returns {string} The formatted file size.
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
