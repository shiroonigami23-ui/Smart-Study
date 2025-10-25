// ====================================
// NAVIGATION & PAGE/VIEW MANAGEMENT
// ====================================

/**
 * Navigates to a specific section within the main app page.
 * @param {string} sectionId The ID of the section to show (e.g., "dashboard", "quiz").
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
        updateProgressCharts();
    } else if (sectionId === 'profile') {
        updateProfileStats();
    }
}

/**
 * Shows a top-level page (e.g., "auth-page" or "app-page").
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
 * @param {string} viewId The view to show (e.g., "quiz-start", "quiz-taking").
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
 * @param {string} viewId The view to show (e.g., "flashcards-start", "flashcards-studying").
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
            <div class="badge-card" style="border-color: ${badge.color}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
            </div>
        `).join('');
    } else {
        latestBadgesDiv.innerHTML = `
            <div class="badge-placeholder">
                <span>🏆</span>
                <p>Complete activities to earn badges!</p>
            </div>
        `;
    }
}

/**
 * Adds an item to the "Recent Activity" list on the dashboard.
 * @param {string} icon The emoji icon for the activity.
 * @param {string} text The description of the activity.
 * @param {string} time The time string (e.g., "Just now").
 */
function addRecentActivity(icon, text, time) {
    const activityList = document.getElementById('recent-activity-list');
    if (!activityList) return;

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
        <span class="activity-icon">${icon}</span>
        <div class="activity-content">
            <p class="activity-text">${text}</p>
            <p class="activity-time">${time}</p>
        </div>
    `;
    
    // Insert at the top
    if (activityList.firstChild) {
        activityList.insertBefore(activityItem, activityList.firstChild);
    } else {
        activityList.appendChild(activityItem);
    }
    
    // Keep list to a max of 5
    while (activityList.children.length > 5) {
        activityList.removeChild(activityList.lastChild);
    }
}

// ====================================
// QUIZ UI
// ====================================

/**
 * Starts the quiz timer UI.
 * @param {number} duration The quiz duration in seconds.
 * @param {function} onTimerEnd Callback function when the timer reaches zero.
 * @returns {number} The interval timer ID.
 */
function startQuizTimerUI(duration, onTimerEnd) {
    let timeLeft = duration;
    const timerElement = document.getElementById('quiz-timer');
    timerElement.classList.remove('hidden');
    
    const updateTimer = () => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(quizTimer);
            onTimerEnd();
        }
    };

    updateTimer(); // Call once immediately
    const quizTimer = setInterval(updateTimer, 1000);
    return quizTimer;
}

/**
 * Displays the current quiz question and options.
 */
function displayQuestion() {
    const quiz = appState.currentQuiz;
    if (!quiz) return;
    
    const question = quiz.questions[quiz.currentQuestion];
    
    document.getElementById('question-text').textContent = question.question;
    document.getElementById('question-counter').textContent = 
        `Question ${quiz.currentQuestion + 1} of ${quiz.questions.length}`;
    
    const progress = ((quiz.currentQuestion + 1) / quiz.questions.length) * 100;
    document.getElementById('quiz-progress-fill').style.width = `${progress}%`;
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = question.options.map((option, index) => `
        <button class="option" data-index="${index}">
            ${String.fromCharCode(65 + index)}) ${option}
        </button>
    `).join('');
    
    // Add event listeners to new options
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', () => selectOption(option));
    });
    
    document.getElementById('submit-answer-btn').disabled = true;
    document.getElementById('explanation-card').classList.add('hidden');
    
    // Re-enable option buttons
    optionsContainer.style.pointerEvents = 'auto';
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
        opt.style.pointerEvents = 'auto';
    });
}

/**
 * Handles the UI change when an option is selected.
 * @param {HTMLElement} optionElement The selected option button element.
 */
function selectOption(optionElement) {
    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    optionElement.classList.add('selected');
    document.getElementById('submit-answer-btn').disabled = false;
}

/**
 * Shows the explanation card after submitting an answer.
 * @param {boolean} isCorrect Whether the user's answer was correct.
 */
function showExplanation(isCorrect) {
    const quiz = appState.currentQuiz;
    const question = quiz.questions[quiz.currentQuestion];
    const selectedOption = document.querySelector('.option.selected');
    const userAnswerIndex = selectedOption ? parseInt(selectedOption.dataset.index) : -1;
    
    // Disable all options
    document.getElementById('options-container').style.pointerEvents = 'none';
    
    // Visual feedback
    document.querySelectorAll('.option').forEach((opt, index) => {
        if (index === question.correct) {
            opt.classList.add('correct');
        } else if (index === userAnswerIndex && !isCorrect) {
            opt.classList.add('incorrect');
        }
    });
    
    // Show explanation card
    const explanationCard = document.getElementById('explanation-card');
    const resultIcon = document.getElementById('result-icon');
    const resultText = document.getElementById('result-text');
    const explanationText = document.getElementById('explanation-text');
    
    if (isCorrect) {
        resultIcon.textContent = '✅';
        resultText.textContent = 'Correct!';
        resultText.style.color = 'var(--success)';
    } else {
        resultIcon.textContent = '❌';
        resultText.textContent = 'Incorrect';
        resultText.style.color = 'var(--danger)';
    }
    
    explanationText.textContent = question.explanation;
    explanationCard.classList.remove('hidden');
}

/**
 * Displays the final quiz results screen.
 */
function displayQuizResults() {
    const quiz = appState.currentQuiz;
    const correctAnswers = quiz.answers.filter(a => a.correct).length;
    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    const timeTaken = Math.floor((Date.now() - quiz.startTime) / 1000);
    
    let xpEarned = 50 + (correctAnswers * 10);
    if (percentage === 100) {
        xpEarned += 100;
    }
    
    // Show results view
    showQuizView('quiz-results');
    
    const resultsIcon = document.getElementById('results-icon');
    const resultsTitle = document.getElementById('results-title');
    
    if (percentage >= 80) {
        resultsIcon.textContent = '🎉';
        resultsTitle.textContent = 'Excellent Work!';
        createConfetti();
    } else if (percentage >= 60) {
        resultsIcon.textContent = '😊';
        resultsTitle.textContent = 'Good Job!';
    } else {
        resultsIcon.textContent = '💪';
        resultsTitle.textContent = 'Keep Practicing!';
    }
    
    document.getElementById('score-percentage').textContent = `${percentage}%`;
    document.getElementById('score-text').textContent = `${correctAnswers} out of ${totalQuestions} correct`;
    document.getElementById('time-taken').textContent = formatTime(timeTaken);
    document.getElementById('xp-earned').textContent = `+${xpEarned} XP`;
    document.getElementById('accuracy').textContent = `${percentage}%`;
    
    // Add to recent activity
    addRecentActivity('📝', `Completed ${quiz.subject} quiz with ${percentage}%!`, 'Just now');
}

/**
 * Creates a confetti animation on the results screen.
 */
function createConfetti() {
    const confettiContainer = document.getElementById('results-confetti');
    if (!confettiContainer) return;
    
    confettiContainer.innerHTML = '';
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][Math.floor(Math.random() * 5)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.animation = `fall ${2 + Math.random() * 2}s linear forwards`;
        confettiContainer.appendChild(confetti);
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
    if (!deck || deck.cards.length === 0) return;

    const card = deck.cards[deck.currentCard];
    
    document.getElementById('card-counter').textContent = 
        `Card ${deck.currentCard + 1} of ${deck.cards.length}`;
    
    document.getElementById('flashcard-front-content').textContent = card.front;
    document.getElementById('flashcard-back-content').textContent = card.back;
    document.getElementById('flashcard-category').textContent = card.category;
    
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.remove('flipped');
    
    updateFlashcardProgress();
}

/**
 * Updates the progress indicators (reviewed, remaining, marked) during flashcard study.
 */
function updateFlashcardProgress() {
    const deck = appState.currentFlashcardDeck;
    if (!deck) return;
    
    document.getElementById('cards-reviewed').textContent = deck.currentCard;
    document.getElementById('cards-remaining').textContent = deck.cards.length - deck.currentCard;
    document.getElementById('cards-marked').textContent = deck.markedCards.length;
}

/**
 * Displays the flashcard review completion screen.
 */
function displayFlashcardResults() {
    const deck = appState.currentFlashcardDeck;
    if (!deck) return;
    
    const xpEarned = deck.cards.length * 10;
    
    showFlashcardView('flashcards-complete');
    
    document.getElementById('total-reviewed').textContent = deck.cards.length;
    document.getElementById('flashcard-xp-earned').textContent = `+${xpEarned} XP`;
    
    // Add to recent activity
    addRecentActivity('🎴', `Reviewed ${deck.cards.length} ${deck.subject} flashcards.`, 'Just now');
}

// ====================================
// PROGRESS & CHARTS UI
// ====================================

/**
 * Updates all charts and lists on the Progress page.
 */
function updateProgressCharts() {
    createStudyTimeChart();
    createPerformanceChart();
    createStreakCalendar();
    displayAllBadges();
    displayStudyHistory();
}

/**
 * Creates or updates the Weekly Study Time chart.
 */
function createStudyTimeChart() {
    const ctx = document.getElementById('study-time-chart');
    if (!ctx) return;
    
    // Mock data for demo
    const data = [45, 60, 30, 75, 90, 40, 55]; 
    
    if (window.studyTimeChart) {
        window.studyTimeChart.data.datasets[0].data = data;
        window.studyTimeChart.update();
    } else {
        window.studyTimeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Study Time (minutes)',
                    data: data,
                    backgroundColor: '#6366f1',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

/**
 * Creates or updates the Performance by Subject chart.
 */
function createPerformanceChart() {
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;
    
    // Mock data for demo
    const labels = ['Mathematics', 'Physics', 'Biology', 'Computer Science'];
    const data = [30, 25, 20, 25];
    
    if (window.performanceChart) {
        window.performanceChart.data.labels = labels;
        window.performanceChart.data.datasets[0].data = data;
        window.performanceChart.update();
    } else {
        window.performanceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', padding: 15 }
                    }
                }
            }
        });
    }
}

/**
 * Creates the 35-day streak calendar grid.
 */
function createStreakCalendar() {
    const calendar = document.getElementById('streak-calendar');
    if (!calendar) return;
    
    calendar.innerHTML = '';
    const today = new Date();
    const days = 35; // 5 weeks
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = date.getDate();
        
        // Mock data: 70% chance of being active
        if (Math.random() > 0.3) {
            dayDiv.classList.add('active');
        }
        
        if (i === 0) { // Today
            dayDiv.classList.add('today');
            if (appState.userProfile.streak > 0) {
                 dayDiv.classList.add('active');
            }
        }
        
        dayDiv.title = date.toDateString();
        calendar.appendChild(dayDiv);
    }
}

/**
 * Displays all available badges and their locked/unlocked status.
 */
function displayAllBadges() {
    const badgesGrid = document.getElementById('all-badges');
    if (!badgesGrid) return;
    
    badgesGrid.innerHTML = SAMPLE_BADGES.map(badge => {
        const unlocked = appState.userProfile.badges.includes(badge.id);
        return `
        <div class="badge-card ${unlocked ? '' : 'locked'}" style="border-color: ${badge.color}">
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-description">${badge.description}</div>
            <div class="badge-xp">+${badge.xpReward} XP</div>
        </div>
    `}).join('');
}

/**
 * Displays the user's recent study history (from quiz history).
 */
function displayStudyHistory() {
    const historyList = document.getElementById('study-history');
    if (!historyList) return;
    
    if (appState.quizHistory.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: var(--text-gray);">No study sessions yet. Start a quiz to see your history!</p>';
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
// PROFILE UI
// ====================================

/**
 * Updates all stats and info on the Profile page.
 */
function updateProfileStats() {
    const profile = appState.userProfile;
    
    document.getElementById('profile-avatar-text').textContent = profile.name.charAt(0).toUpperCase();
    document.getElementById('profile-level-badge').textContent = profile.level;
    document.getElementById('profile-name').textContent = profile.name;
    
    const { title } = calculateLevel(profile.xp);
    document.getElementById('profile-title').textContent = title;
    
    const currentLevelData = XP_LEVELS.find(l => l.level === profile.level) || XP_LEVELS[0];
    const nextLevelData = XP_LEVELS.find(l => l.level === profile.level + 1);
    
    if (nextLevelData) {
        const xpInCurrentLevel = profile.xp - currentLevelData.xpRequired;
        const xpNeededForNextLevel = nextLevelData.xpRequired - currentLevelData.xpRequired;
        const progress = Math.max(0, Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
        
        document.getElementById('profile-xp-fill').style.width = `${progress}%`;
        document.getElementById('profile-xp-text').textContent = 
            `${profile.xp} / ${nextLevelData.xpRequired} XP`;
    } else {
        // Max level
        document.getElementById('profile-xp-fill').style.width = '100%';
        document.getElementById('profile-xp-text').textContent = `${profile.xp} XP (Max Level)`;
    }
    
    document.getElementById('profile-study-time').textContent = formatTime(profile.studyTime);
    document.getElementById('profile-quizzes').textContent = profile.quizzesCompleted;
    document.getElementById('profile-flashcards').textContent = profile.flashcardsReviewed;
    document.getElementById('profile-badges').textContent = profile.badges.length;
    
    // Update settings toggles
    document.getElementById('voice-toggle').checked = profile.settings.voiceEnabled;
    document.getElementById('sound-toggle').checked = profile.settings.soundEnabled;
    document.getElementById('reminder-toggle').checked = profile.settings.remindersEnabled;
    
    // Display earned badges
    const profileBadgesGrid = document.getElementById('profile-badges-display');
    const earnedBadges = SAMPLE_BADGES.filter(b => profile.badges.includes(b.id));
    
    if (earnedBadges.length === 0) {
        profileBadgesGrid.innerHTML = '<p style="text-align: center; color: var(--text-gray); grid-column: 1/-1;">Complete activities to earn badges!</p>';
    } else {
        profileBadgesGrid.innerHTML = earnedBadges.map(badge => `
            <div class="badge-card" style="border-color: ${badge.color}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
            </div>
        `).join('');
    }
}

