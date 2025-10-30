// ====================================
// SMART STUDY ASSISTANT - MAIN LOGIC (ORCHESTRATOR)
// This file initializes the app and sets up event listeners.
// All core feature logic is delegated to other specialized files.
// ====================================

// Global variable for the quiz timer, declared here to be accessible by all modules.
quizTimer = null; 

// ====================================
// CORE INITIALIZATION LOGIC (CRITICAL FIX: DEFINING initializeApp)
// ====================================

/**
 * Main function to initialize the application after login/guest entry.
 * This function orchestrates the application startup and is called by auth modules.
 */
function initializeApp() {
    console.log("initializeApp: Starting...");

    try {
        // Functions from gamification.js
        updateStreak();
        checkStudyTimeBadges();
        
        // Functions from ui.js
        updateDashboardStats();
        updateProfileStats();
        
        // Load user settings and apply them
        const { voiceEnabled, soundEnabled, remindersEnabled } = appState.userProfile.settings;
        document.getElementById('voice-toggle').checked = voiceEnabled;
        document.getElementById('sound-toggle').checked = soundEnabled;
        document.getElementById('reminder-toggle').checked = remindersEnabled;
        
        // Welcome message
        setTimeout(() => {
            if (voiceEnabled) {
                speak(`Welcome back, ${appState.userProfile.name}!`);
            }
        }, 500);

        // Function from ui.js
        addRecentActivity('🎓', 'Welcome! Start by uploading study materials or try a sample quiz.', 'Just now');

        console.log("initializeApp: Finished successfully.");
    } catch (error) {
        console.error("ERROR during initializeApp:", error);
        // showToast is in utils.js
        showToast("An error occurred initializing the app. Check console for details.", "error"); 
    }
}

// ====================================
// PROFILE LOGIC (New handlers for image upload)
// ====================================

/**
 * Handles the profile picture upload process.
 */
async function handleAvatarUpload() {
    // CRITICAL FIX: Ensure user is authenticated before proceeding
    if (!appState.currentUser) {
        showToast('Please log in to upload a profile picture.', 'warning'); // from utils.js
        return;
    }

    const fileInput = document.getElementById('avatar-upload-input');
    if (fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    showLoading('Uploading profile picture...'); // from utils.js

    try {
        // uploadProfileAvatar is in cloudinary.js
        await uploadProfileAvatar(file);
        
        // Update local state is handled inside uploadProfileAvatar, 
        // but we ensure UI reflects the change.
        updateProfileStats(); // from ui.js

        hideLoading(); // from utils.js
        showToast('Profile picture updated!', 'success'); // from utils.js
        addRecentActivity('👤', 'Updated profile picture', 'Just now'); // from ui.js
    } catch (error) {
        hideLoading(); // from utils.js
        console.error("Avatar upload failed:", error);
        showToast(`Profile picture upload failed: ${error.message}`, 'error'); // from utils.js
    }
}

// ====================================
// EXPORT/DOWNLOAD LOGIC (New Feature Handlers)
// ====================================

/**
 * Exports the current generated notes or summary to the specified format.
 * @param {string} format 'pdf', 'docx', or 'wav' (changed from mp3 due to technical limitation)
 * @param {string} type 'notes' or 'summary'
 */
async function handleExport(format, type) {
    const content = type === 'notes' ? appState.generatedNotes : appState.generatedSummary;
    // CRITICAL FIX: Ensure content is plain text before passing to export functions
    const contentText = content ? (content.replace(/<br>/g, '\n').trim() || '') : null;
    
    const title = type === 'notes' ? 'Study_Notes' : 'Content_Summary';

    if (!contentText) {
        showToast(`No generated ${type} content to export.`, 'warning'); // from utils.js
        return;
    }

    showLoading(`Preparing ${format.toUpperCase()} download...`); // from utils.js

    try {
        if (format === 'pdf') {
            // exportContentToPDF is in fileApi.js
            await exportContentToPDF(contentText, title);
        } else if (format === 'docx') {
            // exportContentToDOCX is in fileApi.js
            await exportContentToDOCX(contentText, title);
        } else if (format === 'wav') {
            // exportContentToWAV is in fileApi.js
            // MP3 is not possible client-side, using WAV placeholder
            await exportContentToWAV(contentText, title); 
        }
        
        hideLoading(); // from utils.js
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully as ${format.toUpperCase()}!`, 'success'); // from utils.js
        addRecentActivity('💾', `Exported ${type} to ${format.toUpperCase()}`, 'Just now'); // from ui.js
        addXP(25, 'Exported content'); // from gamification.js

    } catch (error) {
        hideLoading(); // from utils.js
        console.error(`Export to ${format} failed:`, error);
        showToast(`Export failed: ${error.message}. Try refreshing the page.`, 'error'); // from utils.js
    }
}

// ====================================
// EVENT LISTENER ATTACHMENT (The Orchestrator)
// ====================================

function addEventListeners() {
    // --- Auth Handlers ---
    // All these functions are globally defined in auth.js.
    document.getElementById('login-form')?.addEventListener('submit', handleLogin); 
    document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
    document.getElementById('google-login-btn')?.addEventListener('click', handleGoogleLogin);
    
    // Guest button replacement to ensure listener is attached
    const guestBtn = document.getElementById('guest-mode-btn');
    if (guestBtn) {
        const newGuestBtn = guestBtn.cloneNode(true);
        guestBtn.parentNode.replaceChild(newGuestBtn, guestBtn);
        newGuestBtn.addEventListener('click', handleGuestLogin);
    }
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            const targetForm = document.getElementById(`${tabName}-form`);
            if (targetForm) targetForm.classList.add('active');
        });
    });

    // --- Navigation (Functions in ui.js) ---
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => navigateToSection(item.dataset.section)); 
    });
    document.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', () => navigateToSection(card.dataset.action)); 
    });
    document.querySelector('.mobile-menu-toggle')?.addEventListener('click', () => {
        document.querySelector('.nav-menu')?.classList.toggle('active');
    });

    // --- Modal Controls (Functions in utils.js) ---
    document.getElementById('modal-close')?.addEventListener('click', hideModal);
    document.getElementById('modal-cancel')?.addEventListener('click', hideModal);
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') hideModal();
    });

    // --- Upload/Content Generation (Functions in content.js) ---
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');

    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }

    if (uploadArea && fileInput) {
        // Prevent default click behavior if element has children
        uploadArea.addEventListener('click', (e) => {
             if (e.target.id === 'upload-area' || e.target.parentNode.id === 'upload-area') {
                fileInput.click();
            }
        });
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                // handleFileUpload is in content.js
                handleFileUpload(e.dataTransfer.files[0]); 
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                // handleFileUpload is in content.js
                handleFileUpload(e.target.files[0]); 
            }
        });
    }

    // Generation buttons (Functions in content.js)
    document.getElementById('generate-quiz-btn')?.addEventListener('click', () => generateContent('quiz'));
    document.getElementById('generate-flashcards-btn')?.addEventListener('click', () => generateContent('flashcards'));
    document.getElementById('generate-notes-btn')?.addEventListener('click', () => generateContent('notes'));
    document.getElementById('generate-summary-btn')?.addEventListener('click', () => generateContent('summary'));
    document.getElementById('generate-research-paper-btn')?.addEventListener('click', () => generateContent('research_paper'));
    document.getElementById('convert-docx-btn')?.addEventListener('click', () => handleFileConversion('docx'));
    document.getElementById('convert-epub-btn')?.addEventListener('click', () => handleFileConversion('epub'));
    document.getElementById('convert-txt-btn')?.addEventListener('click', () => handleFileConversion('txt'));
    document.getElementById('convert-png-btn')?.addEventListener('click', () => handleFileConversion('png')); 
    document.getElementById('convert-jpeg-btn')?.addEventListener('click', () => handleFileConversion('jpeg')); 
    
    // Q&A button (Functions in content.js)
    document.getElementById('ask-question-btn')?.addEventListener('click', handleAskQuestion);

    // --- Quiz Controls (Functions in quiz.js) ---
    document.getElementById('start-quiz-btn')?.addEventListener('click', startQuiz);
    document.getElementById('use-sample-quiz-btn')?.addEventListener('click', useSampleQuiz);
    document.getElementById('speak-question-btn')?.addEventListener('click', speakQuestion);
    document.getElementById('voice-answer-btn')?.addEventListener('click', voiceAnswer);
    document.getElementById('hint-btn')?.addEventListener('click', handleHint);
    document.getElementById('submit-answer-btn')?.addEventListener('click', submitAnswer);
    document.getElementById('skip-btn')?.addEventListener('click', skipQuestion);
    document.getElementById('next-question-btn')?.addEventListener('click', nextQuestion);
    document.getElementById('retake-quiz-btn')?.addEventListener('click', () => showQuizView('quiz-start'));
    document.getElementById('back-to-dashboard-btn')?.addEventListener('click', () => navigateToSection('dashboard'));

    // --- Flashcard Controls (Functions in flashcards.js) ---
    document.getElementById('start-flashcards-btn')?.addEventListener('click', () => startFlashcards(false)); // Start fresh
    document.getElementById('use-sample-flashcards-btn')?.addEventListener('click', useSampleFlashcards);
    document.getElementById('flashcard')?.addEventListener('click', flipFlashcard);
    document.getElementById('speak-card-btn')?.addEventListener('click', speakCard);
    document.getElementById('shuffle-cards-btn')?.addEventListener('click', shuffleCards);
    document.getElementById('know-btn')?.addEventListener('click', markAsKnown);
    document.getElementById('dont-know-btn')?.addEventListener('click', markAsUnknown);
    document.getElementById('mark-review-btn')?.addEventListener('click', toggleMarkReview);
    document.getElementById('review-again-btn')?.addEventListener('click', () => startFlashcards(true)); // Review current deck
    document.getElementById('review-marked-btn')?.addEventListener('click', reviewMarkedFlashcards);
    document.getElementById('flashcards-dashboard-btn')?.addEventListener('click', () => navigateToSection('dashboard'));

    // --- Profile Picture Upload ---
    document.getElementById('profile-avatar-container')?.addEventListener('click', () => {
        document.getElementById('avatar-upload-input').click();
    });
    document.getElementById('avatar-upload-input')?.addEventListener('change', handleAvatarUpload);

    // --- Export Buttons (Using the main export handler) ---
    document.getElementById('export-notes-pdf-btn')?.addEventListener('click', () => handleExport('pdf', 'notes'));
    document.getElementById('export-notes-docx-btn')?.addEventListener('click', () => handleExport('docx', 'notes'));
    document.getElementById('export-notes-mp3-btn')?.addEventListener('click', () => {
        if (appState.generatedNotes) {
            showToast('Reading notes aloud...');
            // speak() is in utils.js
            speak(appState.generatedNotes.substring(0, 2500)); // Speak first 2500 chars
        } else {
            showToast('Generate notes first!', 'warning');
        }
    }); 


    // --- Profile Settings ---
    document.getElementById('voice-toggle')?.addEventListener('change', (e) => {
        appState.userProfile.settings.voiceEnabled = e.target.checked;
        showToast(`Voice features ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
        if (appState.currentUser) saveUserProfileToFirestore();
    });
    document.getElementById('sound-toggle')?.addEventListener('change', (e) => {
        appState.userProfile.settings.soundEnabled = e.target.checked;
        showToast(`Sound effects ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
        if (appState.currentUser) saveUserProfileToFirestore();
    });
    document.getElementById('reminder-toggle')?.addEventListener('change', (e) => {
        appState.userProfile.settings.remindersEnabled = e.target.checked;
        showToast(`Reminders ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
        if (appState.currentUser) saveUserProfileToFirestore();
    });

    // --- Global Keydowns (Function in quiz.js) ---
    // CRITICAL: Ensure this is attached last
    document.addEventListener('keydown', handleGlobalKeydown);
}

// ====================================
// APPLICATION ENTRY POINT
// ====================================

/**
 * Runs when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing Firebase...");

    // --- STEP 1: Initialize Firebase (from firebaseApi.js) ---
    const firebaseServices = initializeFirebase();

    if (!firebaseServices || !firebaseServices.auth || !firebaseServices.db) {
        // Only show toast if Firebase failed completely
        showToast("Critical Error: Could not connect to Firebase. Features disabled.", "error"); // from utils.js
        console.error("Firebase failed to initialize.");
        // Still add listeners for guest mode functionality
        addEventListeners();
        return;
    }

    console.log("Firebase initialized successfully.");

    // --- STEP 2: Add Event Listeners ---
    console.log("Adding event listeners...");
    addEventListeners();
    console.log("Event listeners added.");

    // --- STEP 3: Show initial page ---
    // Auth state listener in firebaseApi.js will handle showing the app page if user is logged in
    // Otherwise, show the auth page.
    if (!appState.currentUser) {
        showPage('auth'); // from ui.js
    }
    
    console.log('%c🎓 Smart Study Assistant Loaded!', 'color: #6366f1; font-size: 20px; font-weight: bold;');
});
