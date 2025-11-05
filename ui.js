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
    // Safety check for userProfile availability
    if (!appState.userProfile) return;

    document.getElementById('welcome-message').textContent = `Welcome back, ${appState.userProfile.name}!`;
    document.getElementById('streak-count').textContent = appState.userProfile.streak;
    document.getElementById('total-study-time').textContent = formatTime(appState.userProfile.studyTime);
    document.getElementById('quizzes-completed').textContent = appState.userProfile.quizzesCompleted;
    document.getElementById('current-level').textContent = appState.userProfile.level;
    document.getElementById('total-xp').textContent = appState.userProfile.xp;

    // Update latest badges (SAMPLE_BADGES is from config.js)
    const latestBadgesDiv = document.getElementById('latest-badges');
    const earnedBadges = (typeof SAMPLE_BADGES !== 'undefined') 
        ? SAMPLE_BADGES.filter(b => appState.userProfile.badges.includes(b.id)) 
        : [];

    if (latestBadgesDiv) {
        if (earnedBadges.length > 0) {
            latestBadgesDiv.innerHTML = earnedBadges.slice(-3).map(badge => `
                <div class="badge-mini" style="text-align: center; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 32px; margin-bottom: 8px;">${badge.icon}</div>
                    <div style="font-size: 13px; font-weight: 600; color: ${badge.color};">${badge.name}</div>
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

    // Remove the placeholder if it exists
    const placeholder = activityList.querySelector('.activity-item:last-child');
    if (placeholder && placeholder.textContent.includes('Get started')) {
        activityList.innerHTML = '';
    }

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
    const progressFill = document.getElementById('quiz-progress-fill');
    if (progressFill) progressFill.style.width = `${progress}%`;
    
    const questionNumberEl = document.getElementById('quiz-question-number');
    if (questionNumberEl) questionNumberEl.textContent = 
        `Question ${quiz.currentQuestion + 1} of ${quiz.questions.length}`;

    // Display question
    const questionTextEl = document.getElementById('question-text');
    if (questionTextEl) questionTextEl.textContent = question.question;

    // Display options
    const optionsContainer = document.getElementById('options-container');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.dataset.index = index;
        optionDiv.textContent = option;
        // The selectOption function is defined globally in ui.js
        optionDiv.addEventListener('click', () => selectOption(optionDiv)); 
        optionsContainer.appendChild(optionDiv);
    });

    // Hide explanation card and enable controls
    const explanationCard = document.getElementById('explanation-card');
    if (explanationCard) explanationCard.classList.add('hidden');
    
    const submitBtn = document.getElementById('submit-answer-btn');
    const skipBtn = document.getElementById('skip-btn');
    if (submitBtn) submitBtn.disabled = false;
    if (skipBtn) skipBtn.disabled = false;
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

    if (!explanationCard) return;

    // Update UI based on correctness
    const icon = document.getElementById('explanation-icon');
    const title = document.getElementById('explanation-title');
    const text = document.getElementById('explanation-text');

    if (icon) icon.textContent = isCorrect ? '✅' : '❌';
    if (title) title.textContent = isCorrect ? 'Correct!' : 'Not quite right';
    explanationCard.style.borderColor = isCorrect ? 'var(--success)' : 'var(--danger)';
    if (text) text.textContent = question.explanation;

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
    if (!timerElement) return;
    
    timerElement.classList.remove('hidden');

    let remaining = seconds;

    const updateTimer = () => {
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerElement.textContent = `⏱️ ${minutes}:${secs.toString().padStart(2, '0')}`;

        if (remaining <= 0) {
            clearInterval(interval);
            onComplete();
            return;
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
    if (!quiz) return;
    
    const correctAnswers = quiz.answers.filter(a => a.correct).length;
    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100) || 0;
    const timeTaken = Math.floor((Date.now() - quiz.startTime) / 1000);

    // Calculate XP earned (basic calculation for display)
    let xpEarned = 50 + (correctAnswers * 10);
    if (percentage === 100) {
        xpEarned += 100;
    }

    // Update results display
    const scorePercentageEl = document.getElementById('score-percentage');
    if (scorePercentageEl) scorePercentageEl.textContent = `${percentage}%`;
    
    const correctAnswersEl = document.getElementById('correct-answers');
    if (correctAnswersEl) correctAnswersEl.textContent = correctAnswers;
    
    const timeTakenEl = document.getElementById('time-taken');
    if (timeTakenEl) timeTakenEl.textContent = formatTime(timeTaken);
    
    const xpEarnedEl = document.getElementById('xp-earned');
    if (xpEarnedEl) xpEarnedEl.textContent = `+${xpEarned}`;

    // Update results icon and text based on performance
    const resultsIcon = document.getElementById('results-icon');
    const resultsTitle = document.getElementById('results-title');
    const scoreText = document.getElementById('score-text');

    if (percentage === 100) {
        if (resultsIcon) resultsIcon.textContent = '🎉';
        if (resultsTitle) resultsTitle.textContent = 'Perfect Score!';
        if (scoreText) scoreText.textContent = 'Outstanding work!';
    } else if (percentage >= 80) {
        if (resultsIcon) resultsIcon.textContent = '🌟';
        if (resultsTitle) resultsTitle.textContent = 'Excellent!';
        if (scoreText) scoreText.textContent = 'Great job!';
    } else if (percentage >= 60) {
        if (resultsIcon) resultsIcon.textContent = '👍';
        if (resultsTitle) resultsTitle.textContent = 'Good Effort!';
        if (scoreText) scoreText.textContent = 'Keep practicing!';
    } else {
        if (resultsIcon) resultsIcon.textContent = '📚';
        if (resultsTitle) resultsTitle.textContent = 'Keep Learning!';
        if (scoreText) scoreText.textContent = 'Review the material and try again.';
    }
    const resultsActions = document.querySelector('#quiz-results .results-actions');
    if (resultsActions && !document.getElementById('share-quiz-btn')) {
         const shareButton = document.createElement('button');
         shareButton.className = 'btn btn-secondary btn-block';
         shareButton.id = 'share-quiz-btn';
         shareButton.innerHTML = '<span>🔗</span> Share Quiz Session';
         resultsActions.appendChild(shareButton);
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
    if (!deck || deck.currentCard >= deck.cards.length) return;
    const card = deck.cards[deck.currentCard];

    // Update counter
    const counterEl = document.getElementById('flashcard-counter');
    if (counterEl) counterEl.textContent = 
        `Card ${deck.currentCard + 1} of ${deck.cards.length}`;

    // Update card content
    const frontEl = document.getElementById('flashcard-front-content');
    const backEl = document.getElementById('flashcard-back-content');
    const categoryEl = document.getElementById('flashcard-category');

    if (frontEl) frontEl.textContent = card.front;
    if (backEl) backEl.textContent = card.back;
    if (categoryEl) categoryEl.textContent = card.category || 'General';

    // Remove flipped state
    document.getElementById('flashcard')?.classList.remove('flipped');

    // Update progress
    updateFlashcardProgress();
}

/**
 * Updates the flashcard progress counters.
 */
function updateFlashcardProgress() {
    const deck = appState.currentFlashcardDeck;
    if (!deck) return;
    
    const knownEl = document.getElementById('known-count');
    const markedEl = document.getElementById('marked-count');
    const remainingEl = document.getElementById('remaining-count');
    
    if (knownEl) knownEl.textContent = deck.knownCards.length;
    if (markedEl) markedEl.textContent = deck.markedCards.length;
    if (remainingEl) remainingEl.textContent = 
        deck.cards.length - deck.currentCard - 1;
}

/**
 * Displays the flashcard completion screen.
 */
function displayFlashcardResults() {
    showFlashcardView('flashcards-complete');

    const deck = appState.currentFlashcardDeck;
    const reviewedEl = document.getElementById('total-reviewed');
    const knownFinalEl = document.getElementById('final-known-count');
    
    if (reviewedEl) reviewedEl.textContent = deck.cards.length;
    if (knownFinalEl) knownFinalEl.textContent = deck.knownCards.length;
}

// ====================================
// PROGRESS SECTION UI
// ====================================

/**
 * Updates the progress section with badges and history.
 */
function updateProgressSection() {
    const badgesGrid = document.getElementById('badges-grid');
    if (!badgesGrid) return;
    
    // Safety check for global constant
    const allBadges = (typeof SAMPLE_BADGES !== 'undefined') ? SAMPLE_BADGES : [];
    
    // Update badges grid
    badgesGrid.innerHTML = allBadges.map(badge => {
        const isUnlocked = appState.userProfile?.badges.includes(badge.id);
        const lockedClass = isUnlocked ? '' : 'locked';
        const xpText = isUnlocked ? 'Unlocked!' : `+${badge.xpReward} XP`;
        return `
            <div class="badge-card ${lockedClass}" style="border: 2px solid ${isUnlocked ? badge.color : 'var(--border)'};">
                <div class="badge-icon" style="color: ${isUnlocked ? badge.color : 'var(--text-gray)'};">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-description">${badge.description}</div>
                <div class="badge-xp" style="background: ${isUnlocked ? badge.color + '22' : 'rgba(255,255,255,0.1)'};">${xpText}</div>
            </div>
        `;
    }).join('');

    // Update quiz history
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
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
 * Now handles display of Cloudinary avatar.
 */
function updateProfileStats() {
    if (!appState.userProfile) return;
    
    const { name, email, avatarUrl, xp, quizzesCompleted, flashcardsReviewed, studyTime, badges } = appState.userProfile;

    document.getElementById('profile-name').textContent = name;
    document.getElementById('profile-email').textContent = email || 'guest@studyhub.com';

    // --- Profile Picture Update ---
    const avatarImg = document.getElementById('profile-avatar-img');
    const avatarPlaceholder = document.getElementById('profile-avatar-placeholder');
    const avatarContainer = document.getElementById('profile-avatar-container');
    
    if (avatarImg && avatarPlaceholder && avatarContainer) {
         if (avatarUrl) {
            // getAvatarUrl is defined in cloudinary.js
            avatarImg.src = getAvatarUrl(avatarUrl, 120); 
            avatarImg.style.display = 'block';
            avatarPlaceholder.style.display = 'none';
            avatarContainer.style.background = 'none'; 
        } else {
            avatarImg.style.display = 'none';
            avatarPlaceholder.style.display = 'block';
            avatarContainer.style.background = 'var(--gradient-1)'; // Fallback BG
        }
    }
    // -----------------------------

    // calculateLevel is defined in utils.js
    const { level, title } = calculateLevel(xp); 
    
    const levelBadgeEl = document.getElementById('profile-level-badge');
    if (levelBadgeEl) levelBadgeEl.textContent = `Level ${level} - ${title}`;

    document.getElementById('profile-xp').textContent = xp;
    document.getElementById('profile-quizzes').textContent = quizzesCompleted;
    document.getElementById('profile-flashcards').textContent = flashcardsReviewed;
    document.getElementById('profile-study-time').textContent = formatTime(studyTime);

    // Update badges in profile (SAMPLE_BADGES is from config.js)
    const profileBadgesGrid = document.getElementById('profile-badges-grid');
    const allBadges = (typeof SAMPLE_BADGES !== 'undefined') ? SAMPLE_BADGES : [];
    const earnedBadges = allBadges.filter(b => badges.includes(b.id));

    if (profileBadgesGrid) {
        if (earnedBadges.length === 0) {
            profileBadgesGrid.innerHTML = '<p style="text-align: center; color: var(--text-gray); padding: 40px;">Complete activities to earn badges!</p>';
        } else {
            profileBadgesGrid.innerHTML = earnedBadges.map(badge => `
                <div class="badge-card" style="border: 2px solid ${badge.color};">
                    <div class="badge-icon" style="color: ${badge.color};">${badge.icon}</div>
                    <div class="badge-name">${badge.name}</div>
                    <div class="badge-description">${badge.description}</div>
                    <div class="badge-xp">Unlocked!</div>
                </div>
            `).join('');
        }
        
        // Update settings toggles
        document.getElementById('voice-toggle').checked = appState.userProfile.settings.voiceEnabled;
        document.getElementById('sound-toggle').checked = appState.userProfile.settings.soundEnabled;
        document.getElementById('reminder-toggle').checked = appState.userProfile.settings.remindersEnabled;
    }
}

// ====================================
// NEW: NOTES & Q&A UI
// ====================================

/**
 * Displays generated notes in the notes section and enables export buttons.
 * @param {string} notes The generated notes content.
 */
function displayGeneratedNotes(notes) {
    const notesContainer = document.getElementById('notes-container');
    if (!notesContainer) return;
    
    // Simple markdown to HTML conversion for basic formatting
    const formattedNotes = notes
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/^(#+)\s*(.*)/gm, (match, hashes, content) => { // Headings
            const level = hashes.length > 3 ? 3 : hashes.length;
            return `<h${level}>${content}</h${level}>`;
        })
        .replace(/\n/g, '<br>'); // Newlines to <br>

    notesContainer.innerHTML = `
        <div class="content-display">
            <div style="font-size: 15px;">${formattedNotes}</div>
        </div>
    `;
    
    // Enable export buttons
    document.getElementById('export-notes-pdf-btn').disabled = false;
    document.getElementById('export-notes-docx-btn').disabled = false;
    document.getElementById('export-notes-epub-btn').disabled = false;
    document.getElementById('export-notes-mp3-btn').disabled = false;
}

// ui.js (REPLACE displayGeneratedProjectFile function)

/**
 * Displays generated project file in the notes section.
 * @param {string} projectFile The generated paper content.
 */
function displayGeneratedProjectFile(projectFile) { // <--- NEW FUNCTION
    const notesContainer = document.getElementById('notes-container');
    if (!notesContainer) return;

    // Use a simple but effective markdown to HTML conversion
    let formattedPaper = projectFile
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
        .replace(/^(#+)\s*(.*)/gm, (match, hashes, content) => {
            // H1 for Title, H2 for Subject, H3 for Sections
            const level = hashes.length > 3 ? 3 : hashes.length;
            return `<h${level}>${content}</h${level}>`;
        })
        .replace(/\n/g, '<br>');

    // Apply custom styling for TEXT placeholders and make them editable
    formattedPaper = formattedPaper.replace(/Placeholder: \[USER INPUT: ([^\]]+)\]/g, (match, content) => {
        // Highlighting user input placeholders with a secondary color background
        return `<div class="user-editable-input" contenteditable="true" style="padding: 10px; margin: 8px 0; background: rgba(var(--color-secondary-rgb, 139, 92, 246), 0.2); color: var(--text-light); border-radius: 8px; font-weight: 600; min-height: 40px; border: 1px dashed var(--secondary); cursor: text;" 
                    title="Click to edit: ${content}">[USER INPUT: ${content}]</div>`;
    });
        
    // Apply custom styling for IMAGE placeholders and enable drop/click functionality
    formattedPaper = formattedPaper.replace(/\[IMAGE UPLOAD ZONE: ([^\]]+)\]/g, (match, content) => {
        // Highlighting image placeholders with a distinct color
        const id = 'img-placeholder-' + Math.random().toString(36).substring(2, 9);
        return `<div id="${id}" class="image-upload-zone" style="text-align: center; padding: 40px 20px; margin: 20px auto; border: 3px dashed var(--warning); border-radius: 12px; max-width: 500px; cursor: pointer;"
                    title="Click or drag image here for: ${content}"
                    onclick="triggerProjectImageUpload(event, '${id}')">
                    <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
                    <p style="font-weight: 600; color: var(--warning); margin: 0;">${content}</p>
                    <p style="font-size: 13px; color: var(--text-gray); margin: 0;">(Click or Drop Image)</p>
                </div>`;
    });

    // The main content-display div is now the primary editable area
    notesContainer.innerHTML = `
        <div id="project-file-content" class="content-display" contenteditable="true" style="padding: 32px; line-height: 1.8; max-width: 900px; margin: 0 auto;">
            <h2 style="margin-bottom: 24px; color: var(--secondary); border-bottom: 2px solid var(--border); padding-bottom: 12px;">📁 Generated Project File Outline (Editable)</h2>
            <div style="font-size: 15px;">${formattedPaper}</div>
        </div>
        <input type="file" id="project-image-input" accept="image/*" style="display: none;">
    `;
    
    // Also need to re-attach drag/drop listeners for the zones (will be done in main.js)

    // Enable export buttons
    document.getElementById('export-notes-pdf-btn').disabled = false;
    document.getElementById('export-notes-docx-btn').disabled = false;
    document.getElementById('export-notes-epub-btn').disabled = false;
    document.getElementById('export-notes-mp3-btn').disabled = false;
}


/**
 * Displays generated summary in a modal.
 * @param {string} summary The generated summary content.
 */
function displayGeneratedSummary(summary) {
    // Simple markdown to HTML conversion for basic formatting in modal
    const formattedSummary = summary
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*)/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>');
        
    const modalContent = `<div style="line-height: 1.8;">${formattedSummary}</div>`;
    showModal('📄 Content Summary', modalContent);
}
/**
 * Displays generated research paper outline in the notes section.
 * @param {string} paper The generated paper content.
 */
function displayGeneratedResearchPaper(paper) {
    const notesContainer = document.getElementById('notes-container');
    if (!notesContainer) return;
    
    // Simple markdown to HTML conversion for basic formatting
    const formattedPaper = paper
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/^(#+)\s*(.*)/gm, (match, hashes, content) => { // Headings
            // H1 for Title, H2 for Abstract/Intro/Outline, H3 for Sub-sections
            const level = hashes.length > 3 ? 3 : hashes.length;
            return `<h${level}>${content}</h${level}>`;
        })
        .replace(/\n/g, '<br>'); // Newlines to <br>

    notesContainer.innerHTML = `
        <div class="content-display">
            <h2 style="margin-bottom: 24px;">📚 Generated Research Paper Outline</h2>
            <div style="font-size: 15px;">${formattedPaper}</div>
        </div>
    `;
    
    // Enable export buttons (The same ones used for notes)
    document.getElementById('export-notes-pdf-btn').disabled = false;
    document.getElementById('export-notes-docx-btn').disabled = false;
    document.getElementById('export-notes-epub-btn').disabled = false;
    document.getElementById('export-notes-mp3-btn').disabled = false;
}

/**
 * Adds a Q&A exchange to the history.
 * @param {string} question The user's question.
 * @param {string} answer The AI's answer.
 */
function addQAToHistory(question, answer) {
    const qaHistory = document.getElementById('qa-history');
    if (!qaHistory) return;

    // Remove empty state if it exists
    const emptyState = qaHistory.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const qaItem = document.createElement('div');
    qaItem.className = 'qa-item';
    qaItem.innerHTML = `
        <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; color: var(--primary); margin-bottom: 4px;">❓ Question:</div>
            <div style="line-height: 1.6;">${question}</div>
        </div>
        <div>
            <div style="font-weight: 600; color: var(--success); margin-bottom: 4px;">✅ Answer:</div>
            <div style="line-height: 1.8; white-space: pre-wrap;">${answer.replace(/\n/g, '<br>')}</div>
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-gray);">
            ${new Date().toLocaleString()}
        </div>
    `;

    // Insert at the beginning
    qaHistory.insertBefore(qaItem, qaHistory.firstChild);
}