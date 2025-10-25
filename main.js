// ====================================
// SMART STUDY ASSISTANT - MAIN LOGIC
// ====================================

// Global variable for the quiz timer
let quizTimer = null;

// ====================================
// AUTHENTICATION LOGIC
// ====================================

/**
 * Handles the login form submission.
 */
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showLoading('Logging in...');
    try {
        const user = await firebaseLogin(email, password); // api.js
        appState.currentUser = user; // state.js
        appState.userProfile.email = email;
        appState.userProfile.name = user.displayName || email.split('@')[0];
        
        hideLoading(); // utils.js
        showToast('Welcome back!', 'success'); // utils.js
        initializeApp();
        showPage('app'); // ui.js
    } catch (error) {
        hideLoading(); // utils.js
        console.error("Login failed:", error);
        showToast('Login failed. Please try again.', 'error'); // utils.js
    }
}

/**
 * Handles the signup form submission.
 */
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    showLoading('Creating account...');
    try {
        const user = await firebaseSignup(email, password, name); // api.js
        appState.currentUser = user; // state.js
        appState.userProfile.email = email;
        appState.userProfile.name = name;
        
        hideLoading(); // utils.js
        showToast('Account created successfully!', 'success'); // utils.js
        initializeApp();
        showPage('app'); // ui.js
    } catch (error) {
        hideLoading(); // utils.js
        console.error("Signup failed:", error);
        showToast('Signup failed. Please try again.', 'error'); // utils.js
    }
}

/**
 * Handles guest mode login.
 */
function handleGuestLogin() {
    appState.userProfile.name = 'Guest'; // state.js
    showToast('Welcome, Guest!', 'info'); // utils.js
    initializeApp();
    showPage('app'); // ui.js
}

/**
 * Handles user logout.
 */
function handleLogout() {
    showModal( // utils.js
        'Logout Confirmation',
        'Are you sure you want to logout? Your progress will be saved (if not in guest mode).',
        () => {
            showToast('Logged out successfully', 'info'); // utils.js
            // In a real app with Firebase auth, you'd call firebase.auth().signOut()
            location.reload();
        }
    );
}

// ====================================
// GAMIFICATION LOGIC
// ====================================

/**
 * Adds XP to the user's profile and checks for level ups.
 * @param {number} amount The amount of XP to add.
 * @param {string} reason A description for the activity log (optional).
 */
function addXP(amount, reason = '') {
    const oldLevel = appState.userProfile.level;
    appState.userProfile.xp += amount; // state.js
    
    const { level, title } = calculateLevel(appState.userProfile.xp); // utils.js
    appState.userProfile.level = level;
    
    if (level > oldLevel) {
        showToast(`🎉 Level Up! You're now level ${level} - ${title}!`, 'success'); // utils.js
        if (appState.userProfile.settings.soundEnabled) {
            speak(`Congratulations! You've reached level ${level}!`); // utils.js
        }
    }
    
    updateDashboardStats(); // ui.js
    updateProfileStats(); // ui.js
}

/**
 * Checks if a badge condition is met and unlocks it if new.
 * @param {string} badgeId The ID of the badge to check.
 * @returns {boolean} True if the badge was newly unlocked, false otherwise.
 */
function checkAndUnlockBadge(badgeId) {
    const badge = SAMPLE_BADGES.find(b => b.id === badgeId); // config.js
    if (!badge || appState.userProfile.badges.includes(badgeId)) {
        return false;
    }
    
    badge.unlocked = true; // This updates the sample data in memory, which is fine for this demo
    appState.userProfile.badges.push(badgeId); // state.js
    
    showToast(`🏆 Badge Unlocked: ${badge.name}!`, 'success'); // utils.js
    addXP(badge.xpReward, `Badge: ${badge.name}`);
    
    // Show badge earned on results screen if it's active
    const badgesEarnedDiv = document.getElementById('badges-earned');
    if (badgesEarnedDiv && !badgesEarnedDiv.classList.contains('hidden')) {
         badgesEarnedDiv.innerHTML += `<p>+ Badge: ${badge.name}!</p>`;
    }

    return true;
}

/**
 * Updates the user's study streak.
 */
function updateStreak() {
    const today = new Date().toDateString();
    const lastLogin = appState.userProfile.lastLoginDate;
    
    if (!lastLogin) {
        appState.userProfile.streak = 1;
    } else if (lastLogin !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastLogin === yesterday.toDateString()) {
            appState.userProfile.streak++;
        } else {
            appState.userProfile.streak = 1;
        }
    }
    
    appState.userProfile.lastLoginDate = today; // state.js
    
    if (appState.userProfile.streak >= 7) {
        checkAndUnlockBadge('week_warrior');
    }
}

/**
 * Checks for time-based badges (e.g., Early Bird, Night Owl).
 */
function checkStudyTimeBadges() {
    const hour = new Date().getHours();
    
    if (hour < 8) { // Before 8 AM
        checkAndUnlockBadge('early_bird');
    } else if (hour >= 22) { // 10 PM or later
        checkAndUnlockBadge('night_owl');
    }
    
    // Note: 'study_marathon' check might be better placed after a study session ends
    if (appState.userProfile.studyTime >= 7200) { // 2 hours
        checkAndUnlockBadge('study_marathon');
    }
}

// ====================================
// UPLOAD & CONTENT GENERATION
// ====================================

/**
 * Handles the file upload (drag/drop or browse).
 * @param {File} file The file object.
 */
async function handleFileUpload(file) {
    if (file.type !== 'application/pdf') {
        showToast('Please upload a PDF file', 'error'); // utils.js
        return;
    }
    
    showLoading('Processing PDF...'); // utils.js
    
    // Simulate PDF processing
    // In production, you'd use a library like PDF.js
    // const fileText = await readPdfFile(file);
    setTimeout(() => {
        const sampleText = "This is extracted content from the PDF. In a real application, you would use PDF.js library to extract text from the uploaded PDF file. This sample text will be used to generate a sample quiz.";
        appState.uploadedContent = sampleText; // state.js
        document.getElementById('content-text').value = sampleText;
        hideLoading(); // utils.js
        showToast('PDF processed successfully!', 'success'); // utils.js
    }, 1500);
}

/**
 * Generates quiz/flashcards based on the content in the textarea.
 * @param {string} type 'quiz', 'flashcards', or 'both'.
 */
async function generateContent(type) {
    const content = document.getElementById('content-text').value.trim() || appState.uploadedContent;
    
    if (!content) {
        showToast('Please upload a file or paste some content first', 'warning'); // utils.js
        return;
    }
    
    const subject = document.getElementById('subject-select').value;
    const difficulty = document.getElementById('difficulty-select').value;
    const questionCount = parseInt(document.getElementById('question-count').value, 10) || 5;
    
    if (!subject) {
        showToast('Please select a subject', 'warning'); // utils.js
        return;
    }
    
    showLoading('AI is generating your study materials...'); // utils.js
    
    try {
        if (type === 'quiz' || type === 'both') {
            const quiz = await generateQuizFromContent(content, difficulty, questionCount); // api.js
            appState.currentQuiz = { // state.js
                questions: quiz,
                currentQuestion: 0,
                answers: [],
                startTime: 0,
                subject: subject || 'General'
            };
        }
        
        if (type === 'flashcards' || type === 'both') {
            const flashcards = await generateFlashcardsFromContent(content, questionCount * 2); // api.js
            appState.currentFlashcardDeck = { // state.js
                cards: flashcards,
                currentCard: 0,
                knownCards: [],
                markedCards: [],
                subject: subject || 'General'
            };
        }
        
        hideLoading(); // utils.js
        
        if (type === 'quiz') {
            showToast('Quiz generated successfully!', 'success'); // utils.js
            navigateToSection('quiz'); // ui.js
        } else if (type === 'flashcards') {
            showToast('Flashcards generated successfully!', 'success'); // utils.js
            navigateToSection('flashcards'); // ui.js
        } else {
            showToast('Quiz and Flashcards generated successfully!', 'success'); // utils.js
            navigateToSection('quiz'); // ui.js
        }
    } catch (error) {
        hideLoading(); // utils.js
        console.error("Content generation error:", error);
        showToast('Error generating content. Please try again.', 'error'); // utils.js
    }
}

// ====================================
// QUIZ LOGIC
// ====================================

/**
 * Starts the quiz (either sample or generated).
 */
function startQuiz() {
    showQuizView('quiz-taking'); // ui.js
    appState.currentQuiz.currentQuestion = 0;
    appState.currentQuiz.answers = [];
    appState.currentQuiz.startTime = Date.now();
    
    if (document.getElementById('enable-timer').checked) {
        // Stop any existing timer
        if (quizTimer) clearInterval(quizTimer);
        // 5 minutes per quiz (300 seconds)
        quizTimer = startQuizTimerUI(300, finishQuiz); // ui.js
    } else {
        document.getElementById('quiz-timer').classList.add('hidden');
    }
    
    displayQuestion(); // ui.js
    checkStudyTimeBadges();
}

/**
 * Submits the selected answer for the current question.
 */
function submitAnswer() {
    const quiz = appState.currentQuiz;
    const question = quiz.questions[quiz.currentQuestion];
    const selected = document.querySelector('.option.selected');
    
    if (!selected) return;
    
    const userAnswerIndex = parseInt(selected.dataset.index, 10);
    const isCorrect = userAnswerIndex === question.correct;
    
    quiz.answers.push({
        questionIndex: quiz.currentQuestion,
        userAnswer: userAnswerIndex,
        correct: isCorrect,
        skipped: false
    });
    
    showExplanation(isCorrect); // ui.js
    
    if (isCorrect) {
        speak('Correct! Great job!'); // utils.js
    } else {
        speak('Not quite right. Here is the explanation.'); // utils.js
    }
    
    // Speak explanation
    if (appState.userProfile.settings.voiceEnabled) {
        setTimeout(() => speak(question.explanation), 1500); // utils.js
    }
}

/**
 * Skips the current question.
 */
function skipQuestion() {
    appState.currentQuiz.answers.push({ correct: false, skipped: true });
    nextQuestion();
}

/**
 * Moves to the next question or finishes the quiz.
 */
function nextQuestion() {
    const quiz = appState.currentQuiz;
    quiz.currentQuestion++;
    
    if (quiz.currentQuestion >= quiz.questions.length) {
        finishQuiz();
    } else {
        displayQuestion(); // ui.js
    }
}

/**
 * Finishes the quiz, calculates score, and updates stats.
 */
function finishQuiz() {
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
    
    const quiz = appState.currentQuiz;
    if (!quiz) return; // Quiz might already be finished

    const correctAnswers = quiz.answers.filter(a => a.correct).length;
    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100) || 0;
    const timeTaken = Math.floor((Date.now() - quiz.startTime) / 1000);
    
    // Calculate XP
    let xpEarned = 50 + (correctAnswers * 10);
    if (percentage === 100) {
        xpEarned += 100;
        checkAndUnlockBadge('perfect_score');
    }
    
    // Update stats
    appState.userProfile.quizzesCompleted++;
    appState.userProfile.studyTime += timeTaken;
    
    // Save to history
    appState.quizHistory.push({
        subject: quiz.subject,
        score: correctAnswers,
        total: totalQuestions,
        percentage: percentage,
        timeTaken: timeTaken,
        date: new Date().toISOString()
    });
    
    // Check badges
    if (appState.userProfile.quizzesCompleted === 1) {
        checkAndUnlockBadge('first_steps');
    }
    if (appState.userProfile.quizzesCompleted >= 50) {
        checkAndUnlockBadge('knowledge_seeker');
    }
    
    addXP(xpEarned, 'Quiz completion');
    
    displayQuizResults(); // ui.js
    
    speak(`Quiz complete! You scored ${percentage} percent.`); // utils.js
    
    // Clear the quiz
    appState.currentQuiz = null;
}

// ====================================
// FLASHCARDS LOGIC
// ====================================

/**
 * Starts a flashcard review session.
 */
function startFlashcards() {
    showFlashcardView('flashcards-studying'); // ui.js
    appState.currentFlashcardDeck.currentCard = 0;
    appState.currentFlashcardDeck.knownCards = [];
    appState.currentFlashcardDeck.markedCards = [];
    displayFlashcard(); // ui.js
    checkStudyTimeBadges();
}

/**
 * Moves to the next flashcard or finishes the session.
 */
function nextFlashcard() {
    const deck = appState.currentFlashcardDeck;
    deck.currentCard++;
    
    if (deck.currentCard >= deck.cards.length) {
        finishFlashcards();
    } else {
        displayFlashcard(); // ui.js
    }
}

/**
 * Finishes the flashcard session and updates stats.
 */
function finishFlashcards() {
    const deck = appState.currentFlashcardDeck;
    const xpEarned = deck.cards.length * 10;
    
    // Estimate study time (e.g., 5 seconds per card)
    const timeTaken = deck.cards.length * 5; 
    appState.userProfile.studyTime += timeTaken;
    
    if (appState.userProfile.flashcardsReviewed >= 500) {
        checkAndUnlockBadge('flashcard_master');
    }

    displayFlashcardResults(); // ui.js
    
    speak('Flashcard review complete! Great work!'); // utils.js
    
    // Add to recent activity
    addRecentActivity('🎴', `Reviewed ${deck.cards.length} ${deck.subject} flashcards.`, 'Just now');
}

/**
 * Starts a new session with only the marked cards.
 */
function reviewMarkedFlashcards() {
    const deck = appState.currentFlashcardDeck;
    if (deck.markedCards.length === 0) {
        showToast('No cards marked for review', 'info'); // utils.js
        return;
    }
    
    const markedDeck = {
        cards: deck.markedCards.map(index => deck.cards[index]),
        currentCard: 0,
        knownCards: [],
        markedCards: [],
        subject: `${deck.subject} (Marked)`
    };
    
    appState.currentFlashcardDeck = markedDeck; // state.js
    startFlashcards();
}

// ====================================
// EVENT LISTENERS
// ====================================

function addEventListeners() {
    // --- Auth ---
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
    document.getElementById('guest-mode-btn')?.addEventListener('click', handleGuestLogin);
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            document.getElementById(`${tabName}-form`).classList.add('active');
        });
    });

    // --- Navigation ---
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => navigateToSection(item.dataset.section)); // ui.js
    });
    document.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', () => navigateToSection(card.dataset.action)); // ui.js
    });
    document.querySelector('.mobile-menu-toggle')?.addEventListener('click', () => {
        document.querySelector('.nav-menu')?.classList.toggle('active');
    });

    // --- Modals ---
    document.getElementById('modal-close')?.addEventListener('click', hideModal); // utils.js
    document.getElementById('modal-cancel')?.addEventListener('click', hideModal); // utils.js
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') hideModal(); // utils.js
    });

    // --- Upload ---
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    
    document.getElementById('browse-btn')?.addEventListener('click', () => fileInput?.click());
    uploadArea?.addEventListener('click', () => fileInput?.click());
    
    uploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea?.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    uploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    fileInput?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    document.getElementById('generate-quiz-btn')?.addEventListener('click', () => generateContent('quiz'));
    document.getElementById('generate-flashcards-btn')?.addEventListener('click', () => generateContent('flashcards'));
    document.getElementById('generate-both-btn')?.addEventListener('click', () => generateContent('both'));

    // --- Quiz ---
    document.getElementById('start-quiz-btn')?.addEventListener('click', () => {
        if (!appState.currentQuiz) {
            showToast('Please generate a quiz first from the Upload section', 'warning');
            return;
        }
        startQuiz();
    });
    document.getElementById('use-sample-quiz-btn')?.addEventListener('click', () => {
        appState.currentQuiz = { // state.js
            questions: SAMPLE_QUIZ, // config.js
            currentQuestion: 0,
            answers: [],
            startTime: 0,
            subject: 'Sample'
        };
        startQuiz();
    });
    
    document.getElementById('speak-question-btn')?.addEventListener('click', () => {
        const text = document.getElementById('question-text').textContent;
        speak(text); // utils.js
    });
    document.getElementById('voice-answer-btn')?.addEventListener('click', () => {
        startVoiceRecognition((transcript) => { // utils.js
            const answerLetter = transcript.toUpperCase().trim().charAt(0);
            if (['A', 'B', 'C', 'D'].includes(answerLetter)) {
                const index = answerLetter.charCodeAt(0) - 65;
                const option = document.querySelector(`.option[data-index="${index}"]`);
                if (option) {
                    selectOption(option); // ui.js
                    showToast(`Selected option ${answerLetter}`, 'info'); // utils.js
                }
            } else {
 showToast('Please say A, B, C, or D', 'warning'); // utils.js
            }
        });
    });
    
    document.getElementById('hint-btn')?.addEventListener('click', async () => {
        const quiz = appState.currentQuiz;
        const question = quiz.questions[quiz.currentQuestion];
        const selected = document.querySelector('.option.selected');
        const userAnswer = selected ? selected.textContent : 'No answer yet';
        
        showLoading('Getting hint from AI...'); // utils.js
        const hint = await getHintForQuestion(question.question, userAnswer); // api.js
        hideLoading(); // utils.js
        showModal('Hint', hint); // utils.js
        speak(hint); // utils.js
    });
    
    document.getElementById('submit-answer-btn')?.addEventListener('click', submitAnswer);
    document.getElementById('skip-btn')?.addEventListener('click', skipQuestion);
    document.getElementById('next-question-btn')?.addEventListener('click', nextQuestion);
    document.getElementById('retake-quiz-btn')?.addEventListener('click', () => showQuizView('quiz-start')); // ui.js
    document.getElementById('back-to-dashboard-btn')?.addEventListener('click', () => navigateToSection('dashboard')); // ui.js

    // --- Flashcards ---
    document.getElementById('start-flashcards-btn')?.addEventListener('click', () => {
        if (!appState.currentFlashcardDeck) {
            showToast('Please generate flashcards first from the Upload section', 'warning');
            return;
        }
        startFlashcards();
    });
    document.getElementById('use-sample-flashcards-btn')?.addEventListener('click', () => {
        appState.currentFlashcardDeck = { // state.js
            cards: SAMPLE_FLASHCARDS, // config.js
            currentCard: 0,
            knownCards: [],
            markedCards: [],
            subject: 'Sample'
        };
        startFlashcards();
    });
    
    const flashcard = document.getElementById('flashcard');
    flashcard?.addEventListener('click', () => flashcard.classList.toggle('flipped'));
    
    document.getElementById('speak-card-btn')?.addEventListener('click', () => {
        const isFlipped = flashcard.classList.contains('flipped');
        const text = document.getElementById(isFlipped ? 'flashcard-back-content' : 'flashcard-front-content').textContent;
        speak(text); // utils.js
    });
    
    document.getElementById('shuffle-cards-btn')?.addEventListener('click', () => {
        const deck = appState.currentFlashcardDeck;
        for (let i = deck.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
        }
        displayFlashcard(); // ui.js
        showToast('Flashcards shuffled', 'info'); // utils.js
    });

    document.getElementById('know-btn')?.addEventListener('click', () => {
        appState.currentFlashcardDeck.knownCards.push(appState.currentFlashcardDeck.currentCard);
        appState.userProfile.flashcardsReviewed++;
        addXP(10, 'Flashcard review');
        nextFlashcard();
    });
    document.getElementById('dont-know-btn')?.addEventListener('click', () => {
        appState.userProfile.flashcardsReviewed++;
        addXP(5, 'Flashcard review');
        nextFlashcard();
    });
    document.getElementById('mark-review-btn')?.addEventListener('click', () => {
        const deck = appState.currentFlashcardDeck;
        const cardIndex = deck.currentCard;
        if (!deck.markedCards.includes(cardIndex)) {
            deck.markedCards.push(cardIndex);
            showToast('Card marked for review', 'info'); // utils.js
        } else {
             deck.markedCards = deck.markedCards.filter(i => i !== cardIndex);
             showToast('Card unmarked', 'info');
        }
        updateFlashcardProgress(); // ui.js
    });
    
    document.getElementById('review-again-btn')?.addEventListener('click', startFlashcards);
    document.getElementById('review-marked-btn')?.addEventListener('click', reviewMarkedFlashcards);
    document.getElementById('flashcards-dashboard-btn')?.addEventListener('click', () => navigateToSection('dashboard')); // ui.js
    
    // --- Profile Settings ---
    document.getElementById('voice-toggle')?.addEventListener('change', (e) => {
        appState.userProfile.settings.voiceEnabled = e.target.checked;
        showToast(`Voice features ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
    });
    document.getElementById('sound-toggle')?.addEventListener('change', (e) => {
        appState.userProfile.settings.soundEnabled = e.target.checked;
        showToast(`Sound effects ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
    });
    document.getElementById('reminder-toggle')?.addEventListener('change', (e) => {
        appState.userProfile.settings.remindersEnabled = e.target.checked;
        showToast(`Reminders ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
    });
    
    // --- Global Keydowns ---
    document.addEventListener('keydown', (e) => {
        // Flashcard controls
        if (document.getElementById('flashcards-studying')?.classList.contains('active')) {
            if (e.code === 'Space') {
                e.preventDefault();
                flashcard.classList.toggle('flipped');
            } else if (e.code === 'ArrowRight') {
                document.getElementById('know-btn').click();
            } else if (e.code === 'ArrowLeft') {
                document.getElementById('dont-know-btn').click();
            }
        }
    });
}

// ====================================
// INITIALIZATION
// ====================================

/**
 * Main function to initialize the application.
 */
function initializeApp() {
    updateStreak();
    updateDashboardStats(); // ui.js
    updateProfileStats(); // ui.js
    
    // Check for time-based badges
    checkStudyTimeBadges();
    
    // Welcome message
    setTimeout(() => {
        if (appState.userProfile.settings.voiceEnabled) {
            speak(`Welcome back, ${appState.userProfile.name}!`); // utils.js
        }
    }, 500);
    
    // Add initial activity
    addRecentActivity('🎉', 'Welcome! Start by uploading study materials or try a sample quiz.', 'Just now');
}

/**
 * Runs when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    addEventListeners();
    
    // Check if user is "logged in" (simulated)
    // In a real app, Firebase's onAuthStateChanged would handle this.
    if (appState.currentUser) {
        initializeApp();
        showPage('app'); // ui.js
    } else {
        showPage('auth'); // ui.js
    }
    
    console.log('%c🎓 Smart Study Assistant Loaded!', 'color: #6366f1; font-size: 20px; font-weight: bold;');
    console.log('%cRemember to replace API keys and Firebase config!', 'color: #f59e0b; font-size: 14px;');
});

