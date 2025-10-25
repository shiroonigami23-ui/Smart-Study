// ====================================
// APPLICATION STATE (IN-MEMORY STORAGE)
// ====================================
// This object holds the entire in-memory state for the application.
// All dynamic data (user profile, current quiz, etc.) is stored here.

const appState = {
    currentUser: null,
    userProfile: {
        name: "Guest",
        email: "",
        xp: 0,
        level: 1,
        streak: 0,
        lastLoginDate: null,
        studyTime: 0,
        quizzesCompleted: 0,
        flashcardsReviewed: 0,
        badges: [],
        settings: {
            voiceEnabled: true,
            soundEnabled: true,
            remindersEnabled: false
        }
    },
    currentQuiz: null,
    currentFlashcardDeck: null,
    studySessions: [],
    uploadedContent: null,
    quizHistory: [],
    flashcardHistory: []
};

