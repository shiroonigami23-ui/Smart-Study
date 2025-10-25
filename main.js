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
        const user = await firebaseLogin(email, password);
        appState.currentUser = user;
        appState.userProfile.email = email;
        appState.userProfile.name = user.displayName || email.split('@')[0];

        // Load user data from Firestore
        await loadUserDataFromFirestore(user.uid);

        hideLoading();
        showToast('Welcome back!', 'success');
        initializeApp();
        showPage('app');
    } catch (error) {
        hideLoading();
        console.error("Login failed:", error);
        showToast('Login failed. Please check your credentials.', 'error');
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
        const user = await firebaseSignup(email, password, name);
        appState.currentUser = user;
        appState.userProfile.email = email;
        appState.userProfile.name = name;

        hideLoading();
        showToast('Account created successfully!', 'success');
        initializeApp();
        showPage('app');
    } catch (error) {
        hideLoading();
        console.error("Signup failed:", error);
        showToast('Signup failed. ' + error.message, 'error');
    }
}

/**
 * Handles Google login.
 */
async function handleGoogleLogin() {
    showLoading('Signing in with Google...');

    try {
        const user = await firebaseGoogleLogin();
        appState.currentUser = user;
        appState.userProfile.email = user.email;
        appState.userProfile.name = user.displayName || user.email.split('@')[0];

        // Load user data from Firestore
        await loadUserDataFromFirestore(user.uid);

        hideLoading();
        showToast('Welcome back!', 'success');
        initializeApp();
        showPage('app');
    } catch (error) {
        hideLoading();
        console.error("Google login failed:", error);
        // Error already handled in api.js
    }
}

/**
 * Handles guest mode login.
 * FIX: This function was not properly transitioning to the app page.
 */
function handleGuestLogin() {
    console.log("handleGuestLogin: Starting guest login...");

    appState.userProfile.name = 'Guest';
    appState.currentUser = null; // No Firebase user for guest

    showToast('Welcome, Guest!', 'info');

    console.log("handleGuestLogin: Initializing app...");
    initializeApp();

    console.log("handleGuestLogin: Showing app page...");
    showPage('app');

    console.log("handleGuestLogin: Finished successfully.");
}

/**
 * Main function to initialize the application after login/guest entry.
 * FIX: Added error handling and ensured all functions are called properly.
 */
function initializeApp() {
    console.log("initializeApp: Starting...");

    try {
        updateStreak();
        updateDashboardStats();
        updateProfileStats();
        checkStudyTimeBadges();

        // Welcome message
        setTimeout(() => {
            if (appState.userProfile.settings.voiceEnabled) {
                speak(`Welcome back, ${appState.userProfile.name}!`);
            }
        }, 500);

        addRecentActivity('🎓', 'Welcome! Start by uploading study materials or try a sample quiz.', 'Just now');

        console.log("initializeApp: Finished successfully.");
    } catch (error) {
        console.error("ERROR during initializeApp:", error);
        showToast("An error occurred initializing the app.", "error");
    }
}

/**
 * Handles user logout.
 */
function handleLogout() {
    showModal(
        'Logout Confirmation',
        'Are you sure you want to logout? Your progress will be saved (if not in guest mode).',
        async () => {
            // Save profile to Firestore if not guest
            if (appState.currentUser) {
                await saveUserProfileToFirestore();
                await auth.signOut();
            }
            showToast('Logged out successfully', 'info');
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
    appState.userProfile.xp += amount;

    const { level, title } = calculateLevel(appState.userProfile.xp);
    appState.userProfile.level = level;

    if (level > oldLevel) {
        showToast(`🎉 Level Up! You're now level ${level} - ${title}!`, 'success');
        if (appState.userProfile.settings.soundEnabled) {
            speak(`Congratulations! You've reached level ${level}!`);
        }
    }

    updateDashboardStats();
    updateProfileStats();

    // Save to Firestore if user is logged in
    if (appState.currentUser) {
        saveUserProfileToFirestore();
    }
}

/**
 * Checks if a badge condition is met and unlocks it if new.
 * @param {string} badgeId The ID of the badge to check.
 * @returns {boolean} True if the badge was newly unlocked.
 */
function checkAndUnlockBadge(badgeId) {
    const badge = SAMPLE_BADGES.find(b => b.id === badgeId);
    if (!badge || appState.userProfile.badges.includes(badgeId)) {
        return false;
    }

    badge.unlocked = true;
    appState.userProfile.badges.push(badgeId);

    showToast(`🏆 Badge Unlocked: ${badge.name}!`, 'success');
    addXP(badge.xpReward, `Badge: ${badge.name}`);

    // Save to Firestore
    if (appState.currentUser) {
        saveUserProfileToFirestore();
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

    appState.userProfile.lastLoginDate = today;

    if (appState.userProfile.streak >= 7) {
        checkAndUnlockBadge('week_warrior');
    }

    // Save to Firestore
    if (appState.currentUser) {
        saveUserProfileToFirestore();
    }
}

/**
 * Checks for time-based badges.
 */
function checkStudyTimeBadges() {
    const hour = new Date().getHours();

    if (hour < 8) {
        checkAndUnlockBadge('early_bird');
    } else if (hour >= 22) {
        checkAndUnlockBadge('night_owl');
    }

    if (appState.userProfile.studyTime >= 7200) {
        checkAndUnlockBadge('study_marathon');
    }
}

// ====================================
// UPLOAD & CONTENT GENERATION
// ====================================

/**
 * Handles the file upload (drag/drop or browse).
 * FIX: Now supports multiple file types with proper processing.
 * @param {File} file The file object.
 */
async function handleFileUpload(file) {
    const supportedTypes = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.docx', '.epub'];
    const fileName = file.name.toLowerCase();
    const isSupported = supportedTypes.some(type => fileName.endsWith(type));

    if (!isSupported) {
        showToast('Unsupported file type. Please upload PDF, Image, TXT, DOCX, or EPUB files.', 'error');
        return;
    }

    // Show file preview
    const filePreview = document.getElementById('file-preview');
    const fileNameEl = document.getElementById('file-name');
    const fileSizeEl = document.getElementById('file-size');

    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatFileSize(file.size);
    filePreview.classList.remove('hidden');

    showLoading('Processing file...');

    try {
        const extractedText = await processFile(file);
        appState.uploadedContent = extractedText;
        appState.uploadedContentType = file.type;
        document.getElementById('content-text').value = extractedText;

        // Track file type for badge
        const fileExt = fileName.split('.').pop();
        if (!appState.userProfile.filesUploaded.includes(fileExt)) {
            appState.userProfile.filesUploaded.push(fileExt);
            if (appState.userProfile.filesUploaded.length >= 3) {
                checkAndUnlockBadge('file_master');
            }
        }

        hideLoading();
        showToast('File processed successfully!', 'success');
        addRecentActivity('📁', `Uploaded ${file.name}`, 'Just now');

        // Save to Firestore
        if (appState.currentUser) {
            saveUserProfileToFirestore();
        }
    } catch (error) {
        hideLoading();
        console.error('File processing error:', error);
        showToast('Error processing file: ' + error.message, 'error');
    }
}

/**
 * Generates content (quiz, flashcards, notes, summary) based on type.
 * @param {string} type 'quiz', 'flashcards', 'notes', or 'summary'.
 */
async function generateContent(type) {
    const content = document.getElementById('content-text').value.trim() || appState.uploadedContent;

    if (!content) {
        showToast('Please upload a file or paste some content first', 'warning');
        return;
    }

    const subject = document.getElementById('subject-select').value;
    const difficulty = document.getElementById('difficulty-select').value;
    const questionCount = parseInt(document.getElementById('question-count').value, 10) || 5;

    if (!subject && type !== 'notes' && type !== 'summary') {
        showToast('Please select a subject', 'warning');
        return;
    }

    showLoading(`AI is generating your ${type}...`);

    try {
        if (type === 'quiz') {
            const quiz = await generateQuizFromContent(content, difficulty, questionCount);
            appState.currentQuiz = {
                questions: quiz,
                currentQuestion: 0,
                answers: [],
                startTime: 0,
                subject: subject || 'General'
            };
            hideLoading();
            showToast('Quiz generated successfully!', 'success');
            addRecentActivity('🎯', `Generated ${questionCount}-question quiz`, 'Just now');
            navigateToSection('quiz');
        } else if (type === 'flashcards') {
            const flashcards = await generateFlashcardsFromContent(content, questionCount * 2);
            appState.currentFlashcardDeck = {
                cards: flashcards,
                currentCard: 0,
                knownCards: [],
                markedCards: [],
                subject: subject || 'General'
            };
            hideLoading();
            showToast('Flashcards generated successfully!', 'success');
            addRecentActivity('🎴', `Generated ${flashcards.length} flashcards`, 'Just now');
            navigateToSection('flashcards');
        } else if (type === 'notes') {
            const notes = await generateNotesFromContent(content);
            appState.generatedNotes = notes;
            appState.userProfile.notesGenerated++;
            checkAndUnlockBadge('first_notes');
            hideLoading();
            showToast('Notes generated successfully!', 'success');
            addRecentActivity('📝', 'Generated study notes', 'Just now');
            displayGeneratedNotes(notes);
            navigateToSection('notes');
            addXP(50, 'Generated notes');
        } else if (type === 'summary') {
            const summary = await generateSummaryFromContent(content);
            appState.generatedSummary = summary;
            hideLoading();
            showToast('Summary generated successfully!', 'success');
            addRecentActivity('📄', 'Generated content summary', 'Just now');
            displayGeneratedSummary(summary);
            addXP(30, 'Generated summary');
        }

        // Save to Firestore
        if (appState.currentUser) {
            saveUserProfileToFirestore();
        }
    } catch (error) {
        hideLoading();
        console.error("Content generation error:", error);
        showToast('Error generating content. Please try again.', 'error');
    }
}

// ====================================
// QUIZ LOGIC
// ====================================

/**
 * Starts the quiz.
 */
function startQuiz() {
    if (!appState.currentQuiz) {
        showToast('Please generate a quiz first from the Upload section', 'warning');
        return;
    }

    showQuizView('quiz-taking');
    appState.currentQuiz.currentQuestion = 0;
    appState.currentQuiz.answers = [];
    appState.currentQuiz.startTime = Date.now();

    if (document.getElementById('enable-timer').checked) {
        if (quizTimer) clearInterval(quizTimer);
        quizTimer = startQuizTimerUI(300, finishQuiz);
    } else {
        document.getElementById('quiz-timer').classList.add('hidden');
    }

    displayQuestion();
    checkStudyTimeBadges();
}

/**
 * Submits the selected answer for the current question.
 */
function submitAnswer() {
    const quiz = appState.currentQuiz;
    const question = quiz.questions[quiz.currentQuestion];
    const selected = document.querySelector('.option.selected');

    if (!selected) {
        showToast('Please select an answer', 'warning');
        return;
    }

    const userAnswerIndex = parseInt(selected.dataset.index, 10);
    const isCorrect = userAnswerIndex === question.correct;

    quiz.answers.push({
        questionIndex: quiz.currentQuestion,
        userAnswer: userAnswerIndex,
        correct: isCorrect,
        skipped: false
    });

    showExplanation(isCorrect);

    if (isCorrect) {
        speak('Correct! Great job!');
    } else {
        speak('Not quite right. Here is the explanation.');
    }

    if (appState.userProfile.settings.voiceEnabled) {
        setTimeout(() => speak(question.explanation), 1500);
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
        displayQuestion();
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
    if (!quiz) return;

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
    displayQuizResults();
    speak(`Quiz complete! You scored ${percentage} percent.`);
    addRecentActivity('🎯', `Completed ${quiz.subject} quiz - ${percentage}%`, 'Just now');

    // Save to Firestore
    if (appState.currentUser) {
        saveUserProfileToFirestore();
    }
}

// ====================================
// FLASHCARDS LOGIC
// ====================================

/**
 * Starts a flashcard review session.
 */
function startFlashcards() {
    if (!appState.currentFlashcardDeck) {
        showToast('Please generate flashcards first from the Upload section', 'warning');
        return;
    }

    showFlashcardView('flashcards-studying');
    appState.currentFlashcardDeck.currentCard = 0;
    appState.currentFlashcardDeck.knownCards = [];
    appState.currentFlashcardDeck.markedCards = [];
    displayFlashcard();
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
        displayFlashcard();
    }
}

/**
 * Finishes the flashcard session and updates stats.
 */
function finishFlashcards() {
    const deck = appState.currentFlashcardDeck;
    const xpEarned = deck.cards.length * 10;
    const timeTaken = deck.cards.length * 5;

    appState.userProfile.studyTime += timeTaken;
    appState.userProfile.flashcardsReviewed += deck.cards.length;

    if (appState.userProfile.flashcardsReviewed >= 500) {
        checkAndUnlockBadge('flashcard_master');
    }

    addXP(xpEarned, 'Flashcard review');
    displayFlashcardResults();
    speak('Flashcard review complete! Great work!');
    addRecentActivity('🎴', `Reviewed ${deck.cards.length} flashcards`, 'Just now');

    // Save to Firestore
    if (appState.currentUser) {
        saveUserProfileToFirestore();
    }
}

/**
 * Reviews only marked flashcards.
 */
function reviewMarkedFlashcards() {
    const deck = appState.currentFlashcardDeck;

    if (deck.markedCards.length === 0) {
        showToast('No cards marked for review', 'info');
        return;
    }

    const markedDeck = {
        cards: deck.markedCards.map(index => deck.cards[index]),
        currentCard: 0,
        knownCards: [],
        markedCards: [],
        subject: `${deck.subject} (Marked)`
    };

    appState.currentFlashcardDeck = markedDeck;
    startFlashcards();
}

// ====================================
// Q&A FUNCTIONALITY (NEW)
// ====================================

/**
 * Handles asking a question about the uploaded content.
 */
async function handleAskQuestion() {
    const question = document.getElementById('qa-question').value.trim();

    if (!question) {
        showToast('Please enter a question', 'warning');
        return;
    }

    const content = appState.uploadedContent;
    if (!content) {
        showToast('Please upload content first', 'warning');
        return;
    }

    showLoading('Getting answer from AI...');

    try {
        const answer = await answerQuestionFromContent(question, content);
        appState.qaHistory.push({ question, answer, timestamp: new Date().toISOString() });
        appState.userProfile.questionsAsked++;

        if (appState.userProfile.questionsAsked >= 10) {
            checkAndUnlockBadge('curious_mind');
        }

        hideLoading();
        addQAToHistory(question, answer);
        document.getElementById('qa-question').value = '';
        addXP(20, 'Asked a question');
        addRecentActivity('❓', 'Asked a question', 'Just now');

        // Save to Firestore
        if (appState.currentUser) {
            saveUserProfileToFirestore();
        }
    } catch (error) {
        hideLoading();
        console.error('Q&A error:', error);
        showToast('Error getting answer. Please try again.', 'error');
    }
}


// ====================================
// EVENT LISTENERS
// ====================================

function addEventListeners() {
    // --- Auth ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const signupForm = document.getElementById('signup-form');
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    const guestBtn = document.getElementById('guest-mode-btn');
    if (guestBtn) {
        // FIX: Remove any existing listeners and add a fresh one
        const newGuestBtn = guestBtn.cloneNode(true);
        guestBtn.parentNode.replaceChild(newGuestBtn, guestBtn);
        newGuestBtn.addEventListener('click', handleGuestLogin);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleLogin);

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

    // --- Navigation ---
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => navigateToSection(item.dataset.section));
    });

    document.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', () => navigateToSection(card.dataset.action));
    });

    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            document.querySelector('.nav-menu')?.classList.toggle('active');
        });
    }

    // --- Modals ---
    const modalClose = document.getElementById('modal-close');
    if (modalClose) modalClose.addEventListener('click', hideModal);

    const modalCancel = document.getElementById('modal-cancel');
    if (modalCancel) modalCancel.addEventListener('click', hideModal);

    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') hideModal();
        });
    }

    // --- Upload ---
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
        uploadArea.addEventListener('click', () => fileInput.click());

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
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }

    // Generate buttons
    const genQuizBtn = document.getElementById('generate-quiz-btn');
    if (genQuizBtn) genQuizBtn.addEventListener('click', () => generateContent('quiz'));

    const genFlashcardsBtn = document.getElementById('generate-flashcards-btn');
    if (genFlashcardsBtn) genFlashcardsBtn.addEventListener('click', () => generateContent('flashcards'));

    const genNotesBtn = document.getElementById('generate-notes-btn');
    if (genNotesBtn) genNotesBtn.addEventListener('click', () => generateContent('notes'));

    const genSummaryBtn = document.getElementById('generate-summary-btn');
    if (genSummaryBtn) genSummaryBtn.addEventListener('click', () => generateContent('summary'));

    // --- Quiz ---
    const startQuizBtn = document.getElementById('start-quiz-btn');
    if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);

    const useSampleQuizBtn = document.getElementById('use-sample-quiz-btn');
    if (useSampleQuizBtn) {
        useSampleQuizBtn.addEventListener('click', () => {
            appState.currentQuiz = {
                questions: SAMPLE_QUIZ,
                currentQuestion: 0,
                answers: [],
                startTime: 0,
                subject: 'Sample'
            };
            startQuiz();
        });
    }

    const speakQuestionBtn = document.getElementById('speak-question-btn');
    if (speakQuestionBtn) {
        speakQuestionBtn.addEventListener('click', () => {
            const text = document.getElementById('question-text').textContent;
            speak(text);
        });
    }

    const voiceAnswerBtn = document.getElementById('voice-answer-btn');
    if (voiceAnswerBtn) {
        voiceAnswerBtn.addEventListener('click', () => {
            startVoiceRecognition((transcript) => {
                const answerLetter = transcript.toUpperCase().trim().charAt(0);
                if (['A', 'B', 'C', 'D'].includes(answerLetter)) {
                    const index = answerLetter.charCodeAt(0) - 65;
                    const option = document.querySelector(`.option[data-index="${index}"]`);
                    if (option) {
                        selectOption(option);
                        showToast(`Selected option ${answerLetter}`, 'info');
                    }
                } else {
                    showToast('Please say A, B, C, or D', 'warning');
                }
            });
        });
    }

    const hintBtn = document.getElementById('hint-btn');
    if (hintBtn) {
        hintBtn.addEventListener('click', async () => {
            const quiz = appState.currentQuiz;
            const question = quiz.questions[quiz.currentQuestion];
            const selected = document.querySelector('.option.selected');
            const userAnswer = selected ? selected.textContent : 'No answer yet';

            showLoading('Getting hint from AI...');
            const hint = await getHintForQuestion(question.question, userAnswer);
            hideLoading();
            showModal('💡 Hint', hint);
            speak(hint);
        });
    }

    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    if (submitAnswerBtn) submitAnswerBtn.addEventListener('click', submitAnswer);

    const skipBtn = document.getElementById('skip-btn');
    if (skipBtn) skipBtn.addEventListener('click', skipQuestion);

    const nextQuestionBtn = document.getElementById('next-question-btn');
    if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', nextQuestion);

    const retakeQuizBtn = document.getElementById('retake-quiz-btn');
    if (retakeQuizBtn) retakeQuizBtn.addEventListener('click', () => showQuizView('quiz-start'));

    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', () => navigateToSection('dashboard'));

    // --- Flashcards ---
    const startFlashcardsBtn = document.getElementById('start-flashcards-btn');
    if (startFlashcardsBtn) startFlashcardsBtn.addEventListener('click', startFlashcards);

    const useSampleFlashcardsBtn = document.getElementById('use-sample-flashcards-btn');
    if (useSampleFlashcardsBtn) {
        useSampleFlashcardsBtn.addEventListener('click', () => {
            appState.currentFlashcardDeck = {
                cards: SAMPLE_FLASHCARDS,
                currentCard: 0,
                knownCards: [],
                markedCards: [],
                subject: 'Sample'
            };
            startFlashcards();
        });
    }

    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.addEventListener('click', () => {
            flashcard.classList.toggle('flipped');
        });
    }

    const speakCardBtn = document.getElementById('speak-card-btn');
    if (speakCardBtn) {
        speakCardBtn.addEventListener('click', () => {
            const isFlipped = flashcard.classList.contains('flipped');
            const text = document.getElementById(isFlipped ? 'flashcard-back-content' : 'flashcard-front-content').textContent;
            speak(text);
        });
    }

    const shuffleCardsBtn = document.getElementById('shuffle-cards-btn');
    if (shuffleCardsBtn) {
        shuffleCardsBtn.addEventListener('click', () => {
            const deck = appState.currentFlashcardDeck;
            for (let i = deck.cards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
            }
            displayFlashcard();
            showToast('Flashcards shuffled', 'info');
        });
    }

    const knowBtn = document.getElementById('know-btn');
    if (knowBtn) {
        knowBtn.addEventListener('click', () => {
            appState.currentFlashcardDeck.knownCards.push(appState.currentFlashcardDeck.currentCard);
            appState.userProfile.flashcardsReviewed++;
            addXP(10, 'Flashcard review');
            nextFlashcard();
        });
    }

    const dontKnowBtn = document.getElementById('dont-know-btn');
    if (dontKnowBtn) {
        dontKnowBtn.addEventListener('click', () => {
            appState.userProfile.flashcardsReviewed++;
            addXP(5, 'Flashcard review');
            nextFlashcard();
        });
    }

    const markReviewBtn = document.getElementById('mark-review-btn');
    if (markReviewBtn) {
        markReviewBtn.addEventListener('click', () => {
            const deck = appState.currentFlashcardDeck;
            const cardIndex = deck.currentCard;
            if (!deck.markedCards.includes(cardIndex)) {
                deck.markedCards.push(cardIndex);
                showToast('Card marked for review', 'info');
            } else {
                deck.markedCards = deck.markedCards.filter(i => i !== cardIndex);
                showToast('Card unmarked', 'info');
            }
            updateFlashcardProgress();
        });
    }

    const reviewAgainBtn = document.getElementById('review-again-btn');
    if (reviewAgainBtn) reviewAgainBtn.addEventListener('click', startFlashcards);

    const reviewMarkedBtn = document.getElementById('review-marked-btn');
    if (reviewMarkedBtn) reviewMarkedBtn.addEventListener('click', reviewMarkedFlashcards);

    const flashcardsDashboardBtn = document.getElementById('flashcards-dashboard-btn');
    if (flashcardsDashboardBtn) flashcardsDashboardBtn.addEventListener('click', () => navigateToSection('dashboard'));

    // --- Q&A (NEW) ---
    const askQuestionBtn = document.getElementById('ask-question-btn');
    if (askQuestionBtn) askQuestionBtn.addEventListener('click', handleAskQuestion);

    // --- Profile Settings ---
    const voiceToggle = document.getElementById('voice-toggle');
    if (voiceToggle) {
        voiceToggle.addEventListener('change', (e) => {
            appState.userProfile.settings.voiceEnabled = e.target.checked;
            showToast(`Voice features ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            if (appState.currentUser) saveUserProfileToFirestore();
        });
    }

    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
        soundToggle.addEventListener('change', (e) => {
            appState.userProfile.settings.soundEnabled = e.target.checked;
            showToast(`Sound effects ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            if (appState.currentUser) saveUserProfileToFirestore();
        });
    }

    const reminderToggle = document.getElementById('reminder-toggle');
    if (reminderToggle) {
        reminderToggle.addEventListener('change', (e) => {
            appState.userProfile.settings.remindersEnabled = e.target.checked;
            showToast(`Reminders ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            if (appState.currentUser) saveUserProfileToFirestore();
        });
    }

    // --- Global Keydowns ---
    document.addEventListener('keydown', (e) => {
        // Flashcard controls
        const flashcardsStudying = document.getElementById('flashcards-studying');
        if (flashcardsStudying && flashcardsStudying.classList.contains('active')) {
            if (e.code === 'Space') {
                e.preventDefault();
                flashcard.classList.toggle('flipped');
            } else if (e.code === 'ArrowRight') {
                knowBtn.click();
            } else if (e.code === 'ArrowLeft') {
                dontKnowBtn.click();
            }
        }
    });
}

// ====================================
// INITIALIZATION
// ====================================

/**
 * Runs when the DOM is fully loaded.
 * FIX: Firebase initialization happens first, THEN event listeners are added.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing Firebase...");

    // --- STEP 1: Initialize Firebase ---
    const firebaseServices = initializeFirebase();

    // Check if initialization succeeded
    if (!firebaseServices || !firebaseServices.auth || !firebaseServices.db) {
        showToast("Critical Error: Could not connect to Firebase. Please refresh.", "error");
        console.error("Firebase failed to initialize.");
        // Still add event listeners for guest mode
        addEventListeners();
        return;
    }

    console.log("Firebase initialized successfully.");

    // --- STEP 2: Add Event Listeners ---
    console.log("Adding event listeners...");
    addEventListeners();
    console.log("Event listeners added.");

    // --- STEP 3: Show initial page ---
    // Auth state listener in api.js will handle showing the app page if user is logged in
    showPage('auth');

    console.log('%c🎓 Smart Study Assistant Loaded!', 'color: #6366f1; font-size: 20px; font-weight: bold;');
    console.log('%cFirebase initialization sequence complete.', 'color: #10b981; font-size: 14px;');
});
