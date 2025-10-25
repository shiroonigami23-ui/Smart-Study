// ===================================
// GAMIFICATION LOGIC
// ===================================

/**
 * Adds XP to the user's profile and checks for level ups.
 * @param {number} amount The amount of XP to add.
 * @param {string} reason A description for the activity log (optional).
 */
function addXP(amount, reason = '') {
    // Safety check for guest mode or init
    if (!appState.userProfile) return; 
    
    const oldLevel = appState.userProfile.level;
    appState.userProfile.xp += amount;

    // calculateLevel is in utils.js
    const { level, title } = calculateLevel(appState.userProfile.xp); 
    appState.userProfile.level = level;

    if (level > oldLevel) {
        // showToast and speak are in utils.js
        showToast(`🎉 Level Up! You're now level ${level} - ${title}!`, 'success'); 
        if (appState.userProfile.settings.voiceEnabled) {
            speak(`Congratulations! You've reached level ${level}!`); 
        }
    }

    // Update UI (functions in ui.js)
    updateDashboardStats(); 
    updateProfileStats(); 

    // Save to Firestore if user is logged in (function in firebaseApi.js)
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
    if (!appState.userProfile) return false; // Safety check
    
    // Find the badge configuration in the global constant
    // SAMPLE_BADGES is from config.js
    const badge = SAMPLE_BADGES.find(b => b.id === badgeId);
    
    // Check if badge configuration exists or if already unlocked
    if (!badge || appState.userProfile.badges.includes(badgeId)) {
        return false;
    }

    // Unlock the badge
    // NOTE: In a real app, you wouldn't modify SAMPLE_BADGES (config), 
    // but the array of badges in the profile state.
    appState.userProfile.badges.push(badgeId);

    showToast(`🏆 Badge Unlocked: ${badge.name}!`, 'success'); // from utils.js
    addXP(badge.xpReward, `Badge: ${badge.name}`);

    // Update UI to show the new badge
    updateDashboardStats(); 
    updateProfileStats();
    
    // Save to Firestore (function in firebaseApi.js)
    if (appState.currentUser) {
        saveUserProfileToFirestore(); 
    }

    return true;
}

/**
 * Updates the user's study streak.
 */
function updateStreak() {
    if (!appState.userProfile) return; // Safety check
    
    const today = new Date().toDateString();
    const lastLogin = appState.userProfile.lastLoginDate;

    if (!lastLogin) {
        // First login/start, streak starts at 1
        appState.userProfile.streak = 1;
    } else if (lastLogin !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toDateString();

        if (lastLogin === yesterdayString) {
            // Logged in yesterday, streak continues
            appState.userProfile.streak++;
        } else {
            // Break in study, streak resets
            appState.userProfile.streak = 1;
        }
    }
    // If lastLogin === today, streak does not change

    appState.userProfile.lastLoginDate = today;

    if (appState.userProfile.streak >= 7) {
        checkAndUnlockBadge('week_warrior');
    }

    // Save to Firestore (function in firebaseApi.js)
    if (appState.currentUser) {
        saveUserProfileToFirestore(); 
    }
}

/**
 * Checks for time-based badges.
 */
function checkStudyTimeBadges() {
    if (!appState.userProfile) return; // Safety check
    
    const hour = new Date().getHours();

    if (hour < 8) {
        checkAndUnlockBadge('early_bird');
    } else if (hour >= 22) {
        checkAndUnlockBadge('night_owl');
    }

    // Check for 2 hours (7200 seconds)
    if (appState.userProfile.studyTime >= 7200) {
        checkAndUnlockBadge('study_marathon');
    }
}
