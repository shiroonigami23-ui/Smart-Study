// ====================================
// NAVIGATION & PAGE/VIEW MANAGEMENT
// ====================================

/**
 * Navigates to a specific section within the main app page.
 * @param {string} sectionId The ID of the section to show.
 */
function navigateToSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(`${sectionId}-section`);
    if (section) {
        section.classList.add('active');
    }

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // Close mobile menu
    document.querySelector('.nav-menu')?.classList.remove('active');

    // Specific updates when navigating to a section
    if (sectionId === 'progress') {
        updateProgressSection();
    } else if (sectionId === 'profile') {
        updateProfileStats();
    }
}

/**
 * Shows a top-level page.
 * @param {string} pageId The ID of the page to show.
 */
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const page = document.getElementById(`${pageId}-page`);
    if (page) {
        page.classList.add('active');
    }
}

/**
 * Manages the visibility of views within the Quiz section.
 * @param {string} viewId The view to show.
 */
function showQuizView(viewId) {
    document.querySelectorAll('.quiz-view').forEach(view => view.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
    }
}

/**
 * Manages the visibility of views within the Flashcards section.
 * @param {string} viewId The view to show.
 */
function showFlashcardView(viewId) {
    document.querySelectorAll('.flashcards-view').forEach(view => view.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
    }
}

// ====================================
// DASHBOARD UI
// ====================================

/**
 * Updates all statistics and text on the dashboard.
 */
function updateDashboardStats() {
    document.getElementById('welcome-message').textContent = `Welcome back, ${appState.userProfile.name}!`;
    document.getElementById('streak-count').textContent = appState.userProfile.streak;
    document.getElementById('total-study-time').textContent = formatTime(appState.userProfile.studyTime);
    document.getElementById('quizzes-completed').textContent = appState.userProfile.quizzesCompleted;
    document.getElementById('current-level').textContent = appState.userProfile.level;
    document.getElementById('total-xp').textContent = appState.userProfile.xp;

    // Update latest badges
    const latestBadgesDiv = document.getElementById('latest-badges');
    const earnedBadges = SAMPLE_BADGES.filter(b => appState.userProfile.badges.includes(b.id));

    if (earnedBadges.length > 0) {
        latestBadgesDiv.innerHTML = earnedBadges.slice(-3).map(badge => `
            <div class="badge-mini" style="text-align: center; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px;">
                <div style="font-size: 32px; margin-bottom: 8px;">${badge.icon}</div>
                <div style="font-size: 13px; font-weight: 600;">${badge.name}</div>
            </div>
        `).join('');
    } else {
        latestBadgesDiv.innerHTML = `
            <div class="badge-placeholder">
                <span>🏅</span>
                <p>Complete activities to earn badges!</p>
            </div>
        `;
    }
}

/**
 * Adds an activity item to the recent activity list.
 * @param {string} icon The emoji icon for the activity.
 * @param {string} text The activity description.
 * @param {string} time The time text (e.g., "Just now").
 */
function addRecentActivity(icon, text, time) {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
        <div class="activity-icon">${icon}</div>
        <div>
            <div class="activity-text">${text}</div>
            <div class="activity-time">${time}</div>
        </div>
    `;

    // Insert at the beginning
    activityList.insertBefore(activityItem, activityList.firstChild);

    // Keep only the last 10 activities
    while (activityList.children.length > 10) {
        activityList.removeChild(activityList.lastChild);
    }
}

// ====================================
// QUIZ UI
// ====================================

/**
 * Displays the current question in the quiz.
 */
function displayQuestion() {
    const quiz = appState.currentQuiz;
    const question = quiz.questions[quiz.currentQuestion];

    // Update progress bar
    const progress = ((quiz.currentQuestion + 1) / quiz.questions.length) * 100;
    document.getElementById('quiz-progress-fill').style.width = `${progress}%`;
    document.getElementById('quiz-question-number').textContent = 
        `Question ${quiz.currentQuestion + 1} of ${quiz.questions.length}`;

    // Display question
    document.getElementById('question-text').textContent = question.question;

    // Display options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.dataset.index = index;
        optionDiv.textContent = option;
        optionDiv.addEventListener('click', () => selectOption(optionDiv));
        optionsContainer.appendChild(optionDiv);
    });

    // Hide explanation card
    document.getElementById('explanation-card').classList.add('hidden');
}

/**
 * Selects an option in the quiz.
 * @param {HTMLElement} optionElement The option element that was clicked.
 */
function selectOption(optionElement) {
    // Remove previous selection
    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    // Add selection to clicked option
    optionElement.classList.add('selected');
}

/**
 * Shows the explanation for the current question.
 * @param {boolean} isCorrect Whether the answer was correct.
 */
function showExplanation(isCorrect) {
    const quiz = appState.currentQuiz;
    const question = quiz.questions[quiz.currentQuestion];
    const explanationCard = document.getElementById('explanation-card');

    // Update UI based on correctness
    const icon = document.getElementById('explanation-icon');
    const title = document.getElementById('explanation-title');
    const text = document.getElementById('explanation-text');

    if (isCorrect) {
        icon.textContent = '✅';
        title.textContent = 'Correct!';
        explanationCard.style.borderColor = 'var(--success)';
    } else {
        icon.textContent = '❌';
        title.textContent = 'Not quite right';
        explanationCard.style.borderColor = 'var(--danger)';
    }

    text.textContent = question.explanation;

    // Highlight correct/incorrect options
    const options = document.querySelectorAll('.option');
    options.forEach((opt, index) => {
        if (index === question.correct) {
            opt.classList.add('correct');
        } else if (opt.classList.contains('selected') && index !== question.correct) {
            opt.classList.add('incorrect');
        }
        // Disable further clicks
        opt.style.pointerEvents = 'none';
    });

    explanationCard.classList.remove('hidden');
}

/**
 * Starts the quiz timer UI.
 * @param {number} seconds The total seconds for the timer.
 * @param {function} onComplete Callback when timer expires.
 * @returns {number} The interval ID.
 */
function startQuizTimerUI(seconds, onComplete) {
    const timerElement = document.getElementById('quiz-timer');
    timerElement.classList.remove('hidden');

    let remaining = seconds;

    const updateTimer = () => {
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerElement.textContent = `⏱️ ${minutes}:${secs.toString().padStart(2, '0')}`;

        if (remaining <= 0) {
            clearInterval(interval);
            onComplete();
        }
        remaining--;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return interval;
}

/**
 * Displays the quiz results.
 */
function displayQuizResults() {
    showQuizView('quiz-results');

    const quiz = appState.currentQuiz;
    const correctAnswers = quiz.answers.filter(a => a.correct).length;
    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100) || 0;
    const timeTaken = Math.floor((Date.now() - quiz.startTime) / 1000);

    // Calculate XP earned
    let xpEarned = 50 + (correctAnswers * 10);
    if (percentage === 100) {
        xpEarned += 100;
    }

    // Update results display
    document.getElementById('score-percentage').textContent = `${percentage}%`;
    document.getElementById('correct-answers').textContent = correctAnswers;
    document.getElementById('time-taken').textContent = formatTime(timeTaken);
    document.getElementById('xp-earned').textContent = `+${xpEarned}`;

    // Update results icon and text based on performance
    const resultsIcon = document.getElementById('results-icon');
    const resultsTitle = document.getElementById('results-title');
    const scoreText = document.getElementById('score-text');

    if (percentage === 100) {
        resultsIcon.textContent = '🎉';
        resultsTitle.textContent = 'Perfect Score!';
        scoreText.textContent = 'Outstanding work!';
    } else if (percentage >= 80) {
        resultsIcon.textContent = '🌟';
        resultsTitle.textContent = 'Excellent!';
        scoreText.textContent = 'Great job!';
    } else if (percentage >= 60) {
        resultsIcon.textContent = '👍';
        resultsTitle.textContent = 'Good Effort!';
        scoreText.textContent = 'Keep practicing!';
    } else {
        resultsIcon.textContent = '📚';
        resultsTitle.textContent = 'Keep Learning!';
        scoreText.textContent = 'Review the material and try again.';
    }
}

// ====================================
// FLASHCARDS UI
// ====================================

/**
 * Displays the current flashcard.
 */
function displayFlashcard() {
    const deck = appState.currentFlashcardDeck;
    const card = deck.cards[deck.currentCard];

    // Update counter
    document.getElementById('flashcard-counter').textContent = 
        `Card ${deck.currentCard + 1} of ${deck.cards.length}`;

    // Update card content
    document.getElementById('flashcard-front-content').textContent = card.front;
    document.getElementById('flashcard-back-content').textContent = card.back;
    document.getElementById('flashcard-category').textContent = card.category || 'General';

    // Remove flipped state
    document.getElementById('flashcard').classList.remove('flipped');

    // Update progress
    updateFlashcardProgress();
}

/**
 * Updates the flashcard progress counters.
 */
function updateFlashcardProgress() {
    const deck = appState.currentFlashcardDeck;
    document.getElementById('known-count').textContent = deck.knownCards.length;
    document.getElementById('marked-count').textContent = deck.markedCards.length;
    document.getElementById('remaining-count').textContent = 
        deck.cards.length - deck.currentCard - 1;
}

/**
 * Displays the flashcard completion screen.
 */
function displayFlashcardResults() {
    showFlashcardView('flashcards-complete');

    const deck = appState.currentFlashcardDeck;
    document.getElementById('total-reviewed').textContent = deck.cards.length;
    document.getElementById('final-known-count').textContent = deck.knownCards.length;
}

// ====================================
// PROGRESS SECTION UI
// ====================================

/**
 * Updates the progress section with badges and history.
 */
function updateProgressSection() {
    // Update badges grid
    const badgesGrid = document.getElementById('badges-grid');
    badgesGrid.innerHTML = SAMPLE_BADGES.map(badge => {
        const isUnlocked = appState.userProfile.badges.includes(badge.id);
        return `
            <div class="badge-card ${isUnlocked ? '' : 'locked'}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-description">${badge.description}</div>
                <div class="badge-xp">${isUnlocked ? 'Unlocked!' : `+${badge.xpReward} XP`}</div>
            </div>
        `;
    }).join('');

    // Update quiz history
    const historyList = document.getElementById('history-list');
    if (appState.quizHistory.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: var(--text-gray); padding: 40px;">No study sessions yet. Start a quiz to see your history!</p>';
        return;
    }

    historyList.innerHTML = appState.quizHistory.slice(-10).reverse().map(session => `
        <div class="history-item">
            <div class="history-info">
                <h4>${session.subject} Quiz</h4>
                <p>${new Date(session.date).toLocaleDateString()} • ${formatTime(session.timeTaken)}</p>
            </div>
            <div class="history-score">${session.percentage}%</div>
        </div>
    `).join('');
}

// ====================================
// PROFILE SECTION UI
// ====================================

/**
 * Updates the profile section with user stats and badges.
 */
function updateProfileStats() {
    document.getElementById('profile-name').textContent = appState.userProfile.name;
    document.getElementById('profile-email').textContent = appState.userProfile.email || 'guest@studyhub.com';

    const { level, title } = calculateLevel(appState.userProfile.xp);
    document.getElementById('profile-level-badge').textContent = `Level ${level} - ${title}`;

    document.getElementById('profile-xp').textContent = appState.userProfile.xp;
    document.getElementById('profile-quizzes').textContent = appState.userProfile.quizzesCompleted;
    document.getElementById('profile-flashcards').textContent = appState.userProfile.flashcardsReviewed;
    document.getElementById('profile-study-time').textContent = formatTime(appState.userProfile.studyTime);

    // Update badges in profile
    const profileBadgesGrid = document.getElementById('profile-badges-grid');
    const earnedBadges = SAMPLE_BADGES.filter(b => appState.userProfile.badges.includes(b.id));

    if (earnedBadges.length === 0) {
        profileBadgesGrid.innerHTML = '<p style="text-align: center; color: var(--text-gray); padding: 40px;">Complete activities to earn badges!</p>';
    } else {
        profileBadgesGrid.innerHTML = earnedBadges.map(badge => `
            <div class="badge-card">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-description">${badge.description}</div>
                <div class="badge-xp">Unlocked!</div>
            </div>
        `).join('');
    }
}

// ====================================
// NEW: NOTES & Q&A UI
// ====================================

/**
 * Displays generated notes in the notes section.
 * @param {string} notes The generated notes content.
 */
function displayGeneratedNotes(notes) {
    const notesContainer = document.getElementById('notes-container');
    notesContainer.innerHTML = `
        <div class="content-display" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; line-height: 1.8; max-width: 900px; margin: 0 auto;">
            <div style="white-space: pre-wrap; font-size: 15px;">${notes.replace(/\n/g, '<br>')}</div>
        </div>
    `;
}

/**
 * Displays generated summary in a modal.
 * @param {string} summary The generated summary content.
 */
function displayGeneratedSummary(summary) {
    const formattedSummary = `<div style="line-height: 1.8; white-space: pre-wrap;">${summary.replace(/\n/g, '<br>')}</div>`;
    showModal('📄 Content Summary', formattedSummary);
}

/**
 * Adds a Q&A exchange to the history.
 * @param {string} question The user's question.
 * @param {string} answer The AI's answer.
 */
function addQAToHistory(question, answer) {
    const qaHistory = document.getElementById('qa-history');

    // Remove empty state if it exists
    const emptyState = qaHistory.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const qaItem = document.createElement('div');
    qaItem.className = 'qa-item';
    qaItem.style.cssText = 'background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 16px;';
    qaItem.innerHTML = `
        <div style="margin-bottom: 16px;">
            <div style="font-weight: 600; color: var(--primary); margin-bottom: 8px;">❓ Question:</div>
            <div style="color: var(--text-light); line-height: 1.6;">${question}</div>
        </div>
        <div>
            <div style="font-weight: 600; color: var(--success); margin-bottom: 8px;">✅ Answer:</div>
            <div style="color: var(--text-light); line-height: 1.8; white-space: pre-wrap;">${answer.replace(/\n/g, '<br>')}</div>
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-gray);">
            ${new Date().toLocaleString()}
        </div>
    `;

    // Insert at the beginning
    qaHistory.insertBefore(qaItem, qaHistory.firstChild);
}
