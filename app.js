// ====================================
// SMART STUDY ASSISTANT - MAIN APPLICATION
// ====================================

// ====================================
// CONFIGURATION & PLACEHOLDERS
// ====================================

// Firebase Configuration - REPLACE WITH YOUR ACTUAL CREDENTIALS
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBoUtquSv996DJgXwotKOhakl6Yc9zfIrc",
  authDomain: "smart-study-a1721.firebaseapp.com",
  projectId: "smart-study-a1721",
  storageBucket: "smart-study-a1721.firebasestorage.app",
  messagingSenderId: "116901944117",
  appId: "1:116901944117:web:9c9de8cebb6ff5e133ca7c"
};

// Gemini API Configuration - REPLACE WITH YOUR ACTUAL API KEY
const GEMINI_API_KEY = "AIzaSyD5tQg_ls50hZGVX24zGqGN0nDbHM1xsNE";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

// ====================================
// APPLICATION STATE (IN-MEMORY STORAGE)
// Note: Using in-memory storage instead of localStorage due to sandbox restrictions
// ====================================

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

// ====================================
// SAMPLE DATA
// ====================================

const SAMPLE_BADGES = [
    {
        id: "first_steps",
        name: "First Steps",
        description: "Complete your first quiz",
        icon: "🎯",
        xpReward: 100,
        color: "#3b82f6",
        unlocked: false
    },
    {
        id: "week_warrior",
        name: "Week Warrior",
        description: "Maintain a 7-day study streak",
        icon: "🔥",
        xpReward: 500,
        color: "#ef4444",
        unlocked: false
    },
    {
        id: "perfect_score",
        name: "Perfect Score",
        description: "Get 100% on any quiz",
        icon: "⭐",
        xpReward: 300,
        color: "#fbbf24",
        unlocked: false
    },
    {
        id: "study_marathon",
        name: "Study Marathon",
        description: "Study for 2+ hours in one day",
        icon: "💪",
        xpReward: 400,
        color: "#8b5cf6",
        unlocked: false
    },
    {
        id: "knowledge_seeker",
        name: "Knowledge Seeker",
        description: "Complete 50+ quizzes",
        icon: "📚",
        xpReward: 1000,
        color: "#10b981",
        unlocked: false
    },
    {
        id: "flashcard_master",
        name: "Flashcard Master",
        description: "Review 500+ flashcards",
        icon: "🎴",
        xpReward: 800,
        color: "#ec4899",
        unlocked: false
    },
    {
        id: "early_bird",
        name: "Early Bird",
        description: "Study before 8 AM",
        icon: "🌅",
        xpReward: 200,
        color: "#f59e0b",
        unlocked: false
    },
    {
        id: "night_owl",
        name: "Night Owl",
        description: "Study after 10 PM",
        icon: "🦉",
        xpReward: 200,
        color: "#6366f1",
        unlocked: false
    }
];

const SAMPLE_QUIZ = [
    {
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correct: 2,
        explanation: "Paris is the capital and largest city of France, known for its art, fashion, and culture.",
        difficulty: "easy"
    },
    {
        question: "Which programming language is known as 'the language of the web'?",
        options: ["Python", "JavaScript", "Java", "C++"],
        correct: 1,
        explanation: "JavaScript is primarily used for web development and runs in browsers, making it the language of the web.",
        difficulty: "easy"
    },
    {
        question: "What is the chemical symbol for Gold?",
        options: ["Go", "Gd", "Au", "Ag"],
        correct: 2,
        explanation: "Au comes from the Latin word 'aurum' meaning gold. It's a precious metal widely used in jewelry and electronics.",
        difficulty: "medium"
    },
    {
        question: "Who wrote 'Romeo and Juliet'?",
        options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
        correct: 1,
        explanation: "William Shakespeare wrote Romeo and Juliet around 1595. It's one of his most famous tragedies.",
        difficulty: "easy"
    },
    {
        question: "What is the speed of light in vacuum?",
        options: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "100,000 km/s"],
        correct: 0,
        explanation: "The speed of light in vacuum is approximately 299,792 km/s, commonly rounded to 300,000 km/s.",
        difficulty: "medium"
    }
];

const SAMPLE_FLASHCARDS = [
    {
        front: "Photosynthesis",
        back: "The process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar.",
        category: "Biology"
    },
    {
        front: "Algorithm",
        back: "A step-by-step procedure or formula for solving a problem or completing a task in computer science.",
        category: "Computer Science"
    },
    {
        front: "Mitochondria",
        back: "The powerhouse of the cell - organelles that generate most of the cell's supply of ATP (energy).",
        category: "Biology"
    },
    {
        front: "Newton's First Law",
        back: "An object at rest stays at rest and an object in motion stays in motion with the same speed and direction unless acted upon by an external force.",
        category: "Physics"
    },
    {
        front: "Pythagorean Theorem",
        back: "In a right triangle, the square of the hypotenuse equals the sum of squares of the other two sides: a² + b² = c²",
        category: "Mathematics"
    }
];

const XP_LEVELS = [
    { level: 1, xpRequired: 0, title: "Beginner" },
    { level: 2, xpRequired: 1000, title: "Novice" },
    { level: 3, xpRequired: 2500, title: "Apprentice" },
    { level: 4, xpRequired: 5000, title: "Intermediate" },
    { level: 5, xpRequired: 10000, title: "Advanced" },
    { level: 6, xpRequired: 20000, title: "Expert" },
    { level: 7, xpRequired: 35000, title: "Master" },
    { level: 8, xpRequired: 50000, title: "Legend" }
];

// ====================================
// WEB SPEECH API INITIALIZATION
// ====================================

let speechSynthesis = window.speechSynthesis;
let speechRecognition = null;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'en-US';
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
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
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(text = 'Processing...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    loadingText.textContent = text;
    overlay.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function showModal(title, body, onConfirm = null) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    
    overlay.classList.remove('hidden');
    
    const confirmBtn = document.getElementById('modal-confirm');
    confirmBtn.onclick = () => {
        if (onConfirm) onConfirm();
        hideModal();
    };
}

function hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

function speak(text) {
    if (!appState.userProfile.settings.voiceEnabled) return;
    
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
}

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
        showToast('Voice recognition error', 'error');
    };
    
    speechRecognition.start();
    showToast('Listening...', 'info');
}

function calculateLevel(xp) {
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
}

function checkAndUnlockBadge(badgeId) {
    const badge = SAMPLE_BADGES.find(b => b.id === badgeId);
    if (!badge || badge.unlocked) return false;
    
    badge.unlocked = true;
    appState.userProfile.badges.push(badgeId);
    
    showToast(`🏆 Badge Unlocked: ${badge.name}!`, 'success');
    addXP(badge.xpReward, `Badge: ${badge.name}`);
    
    return true;
}

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
}

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

// ====================================
// FIREBASE INTEGRATION (PLACEHOLDER)
// ====================================

// Initialize Firebase (placeholder - you need to add Firebase SDK)
async function initializeFirebase() {
    // TODO: Add Firebase SDK scripts to HTML
    // <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
    
    // Uncomment when Firebase is configured:
    /*
    firebase.initializeApp(FIREBASE_CONFIG);
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserProfile(user.uid);
        }
    });
    */
}

async function firebaseLogin(email, password) {
    // Placeholder for Firebase authentication
    // Replace with actual Firebase auth
    /*
    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
    */
    
    // Simulated login for demo
    return { uid: 'demo-user', email };
}

async function firebaseSignup(email, password, name) {
    // Placeholder for Firebase signup
    /*
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
        
        // Create user profile in Firestore
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
            name,
            email,
            xp: 0,
            level: 1,
            streak: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return userCredential.user;
    } catch (error) {
        throw error;
    }
    */
    
    return { uid: 'demo-user', email, displayName: name };
}

async function saveToFirestore(collection, docId, data) {
    // Placeholder for Firestore save
    /*
    try {
        await firebase.firestore().collection(collection).doc(docId).set(data, { merge: true });
    } catch (error) {
        console.error('Firestore save error:', error);
    }
    */
}

async function loadFromFirestore(collection, docId) {
    // Placeholder for Firestore load
    /*
    try {
        const doc = await firebase.firestore().collection(collection).doc(docId).get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error('Firestore load error:', error);
        return null;
    }
    */
    return null;
}

// ====================================
// GEMINI AI INTEGRATION (PLACEHOLDER)
// ====================================

async function callGeminiAPI(prompt) {
    // Check if API key is configured
    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
        console.warn('Gemini API key not configured. Using sample data.');
        return null;
    }
    
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API error:', error);
        showToast('AI service temporarily unavailable. Using sample data.', 'warning');
        return null;
    }
}

async function generateQuizFromContent(content, difficulty, questionCount) {
    const prompt = `Generate ${questionCount} multiple choice questions based on the following content.
Difficulty: ${difficulty}
Content: ${content}

Format each question EXACTLY as follows (one per line):
Q: [question text]
A) [option]
B) [option]
C) [option]
D) [option]
Correct: [A/B/C/D]
Explanation: [detailed explanation]

Generate ${questionCount} questions now:`;
    
    const response = await callGeminiAPI(prompt);
    
    if (!response) {
        // Return sample quiz if API fails
        return SAMPLE_QUIZ.slice(0, questionCount);
    }
    
    // Parse the response into quiz format
    try {
        const questions = parseQuizResponse(response);
        return questions.slice(0, questionCount);
    } catch (error) {
        console.error('Error parsing quiz:', error);
        return SAMPLE_QUIZ.slice(0, questionCount);
    }
}

function parseQuizResponse(response) {
    const questions = [];
    const lines = response.split('\n').filter(line => line.trim());
    
    let currentQuestion = {};
    let options = [];
    
    for (let line of lines) {
        line = line.trim();
        
        if (line.startsWith('Q:')) {
            if (currentQuestion.question) {
                currentQuestion.options = options;
                questions.push(currentQuestion);
            }
            currentQuestion = { question: line.substring(2).trim() };
            options = [];
        } else if (line.match(/^[A-D]\)/)) {
            options.push(line.substring(2).trim());
        } else if (line.startsWith('Correct:')) {
            const answer = line.substring(8).trim();
            const correctIndex = answer.charCodeAt(0) - 65;
            currentQuestion.correct = correctIndex;
        } else if (line.startsWith('Explanation:')) {
            currentQuestion.explanation = line.substring(12).trim();
        }
    }
    
    if (currentQuestion.question) {
        currentQuestion.options = options;
        questions.push(currentQuestion);
    }
    
    return questions;
}

async function generateFlashcardsFromContent(content, cardCount) {
    const prompt = `Create ${cardCount} flashcards from the following content.
Content: ${content}

Format: Front: [key concept] | Back: [definition/explanation] | Category: [subject]

Generate ${cardCount} flashcards now:`;
    
    const response = await callGeminiAPI(prompt);
    
    if (!response) {
        return SAMPLE_FLASHCARDS.slice(0, cardCount);
    }
    
    try {
        const flashcards = parseFlashcardsResponse(response);
        return flashcards.slice(0, cardCount);
    } catch (error) {
        console.error('Error parsing flashcards:', error);
        return SAMPLE_FLASHCARDS.slice(0, cardCount);
    }
}

function parseFlashcardsResponse(response) {
    const flashcards = [];
    const lines = response.split('\n').filter(line => line.trim());
    
    for (let line of lines) {
        const parts = line.split('|');
        if (parts.length >= 2) {
            const front = parts[0].replace('Front:', '').trim();
            const back = parts[1].replace('Back:', '').trim();
            const category = parts[2] ? parts[2].replace('Category:', '').trim() : 'General';
            
            flashcards.push({ front, back, category });
        }
    }
    
    return flashcards;
}

async function getHintForQuestion(question, userAnswer) {
    const prompt = `The student is stuck on this question: ${question}
Their current answer is: ${userAnswer}
Provide a helpful hint without giving away the answer completely. Be encouraging and friendly!`;
    
    const response = await callGeminiAPI(prompt);
    return response || "Think about the key concepts involved. You've got this!";
}

// ====================================
// NAVIGATION
// ====================================

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
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    document.getElementById(`${pageId}-page`).classList.add('active');
}

// ====================================
// AUTHENTICATION
// ====================================

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showLoading('Logging in...');
    
    try {
        const user = await firebaseLogin(email, password);
        appState.currentUser = user;
        appState.userProfile.email = email;
        appState.userProfile.name = email.split('@')[0];
        
        hideLoading();
        showToast('Welcome back!', 'success');
        initializeApp();
        showPage('app');
    } catch (error) {
        hideLoading();
        showToast('Login failed. Please try again.', 'error');
    }
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
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
        showToast('Signup failed. Please try again.', 'error');
    }
});

document.getElementById('guest-mode-btn').addEventListener('click', () => {
    appState.userProfile.name = 'Guest';
    showToast('Welcome, Guest!', 'info');
    initializeApp();
    showPage('app');
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
    showModal(
        'Logout Confirmation',
        'Are you sure you want to logout? Your progress will be saved.',
        () => {
            showToast('Logged out successfully', 'info');
            location.reload();
        }
    );
});

// Auth tabs
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tabName}-form`).classList.add('active');
    });
});

// ====================================
// DASHBOARD
// ====================================

function updateDashboardStats() {
    document.getElementById('streak-count').textContent = appState.userProfile.streak;
    document.getElementById('total-study-time').textContent = formatTime(appState.userProfile.studyTime);
    document.getElementById('quizzes-completed').textContent = appState.userProfile.quizzesCompleted;
    document.getElementById('current-level').textContent = appState.userProfile.level;
    document.getElementById('total-xp').textContent = appState.userProfile.xp;
    
    const { level, title } = calculateLevel(appState.userProfile.xp);
    document.getElementById('welcome-message').textContent = `Welcome back, ${appState.userProfile.name}!`;
    
    // Update latest badges
    const latestBadgesDiv = document.getElementById('latest-badges');
    const earnedBadges = SAMPLE_BADGES.filter(b => b.unlocked);
    
    if (earnedBadges.length > 0) {
        latestBadgesDiv.innerHTML = earnedBadges.slice(-3).map(badge => `
            <div class="badge-card" style="border-color: ${badge.color}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
            </div>
        `).join('');
    }
}

// Action cards
document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', () => {
        const action = card.dataset.action;
        navigateToSection(action);
    });
});

// ====================================
// UPLOAD SECTION
// ====================================

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const contentText = document.getElementById('content-text');

browseBtn.addEventListener('click', () => fileInput.click());

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
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileUpload(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

async function handleFileUpload(file) {
    if (file.type !== 'application/pdf') {
        showToast('Please upload a PDF file', 'error');
        return;
    }
    
    showLoading('Processing PDF...');
    
    // Simulate PDF processing
    // In production, you'd use PDF.js library
    setTimeout(() => {
        const sampleText = "This is extracted content from the PDF. In a real application, you would use PDF.js library to extract text from the uploaded PDF file.";
        appState.uploadedContent = sampleText;
        contentText.value = sampleText;
        hideLoading();
        showToast('PDF processed successfully!', 'success');
    }, 1500);
}

document.getElementById('generate-quiz-btn').addEventListener('click', async () => {
    await generateContent('quiz');
});

document.getElementById('generate-flashcards-btn').addEventListener('click', async () => {
    await generateContent('flashcards');
});

document.getElementById('generate-both-btn').addEventListener('click', async () => {
    await generateContent('both');
});

async function generateContent(type) {
    const content = contentText.value.trim() || appState.uploadedContent;
    
    if (!content) {
        showToast('Please upload a file or paste some content first', 'warning');
        return;
    }
    
    const subject = document.getElementById('subject-select').value;
    const difficulty = document.getElementById('difficulty-select').value;
    const questionCount = parseInt(document.getElementById('question-count').value);
    
    if (!subject) {
        showToast('Please select a subject', 'warning');
        return;
    }
    
    showLoading('AI is generating your study materials...');
    
    try {
        if (type === 'quiz' || type === 'both') {
            const quiz = await generateQuizFromContent(content, difficulty, questionCount);
            appState.currentQuiz = {
                questions: quiz,
                currentQuestion: 0,
                answers: [],
                startTime: Date.now(),
                subject
            };
        }
        
        if (type === 'flashcards' || type === 'both') {
            const flashcards = await generateFlashcardsFromContent(content, questionCount * 2);
            appState.currentFlashcardDeck = {
                cards: flashcards,
                currentCard: 0,
                knownCards: [],
                markedCards: [],
                subject
            };
        }
        
        hideLoading();
        
        if (type === 'quiz') {
            showToast('Quiz generated successfully!', 'success');
            navigateToSection('quiz');
        } else if (type === 'flashcards') {
            showToast('Flashcards generated successfully!', 'success');
            navigateToSection('flashcards');
        } else {
            showToast('Quiz and Flashcards generated successfully!', 'success');
            navigateToSection('quiz');
        }
    } catch (error) {
        hideLoading();
        showToast('Error generating content. Please try again.', 'error');
    }
}

// ====================================
// QUIZ SECTION
// ====================================

let quizTimer = null;

document.getElementById('start-quiz-btn').addEventListener('click', () => {
    if (!appState.currentQuiz) {
        showToast('Please generate a quiz first from the Upload section', 'warning');
        return;
    }
    startQuiz();
});

document.getElementById('use-sample-quiz-btn').addEventListener('click', () => {
    appState.currentQuiz = {
        questions: SAMPLE_QUIZ,
        currentQuestion: 0,
        answers: [],
        startTime: Date.now(),
        subject: 'Sample'
    };
    startQuiz();
});

function startQuiz() {
    showQuizView('quiz-taking');
    appState.currentQuiz.currentQuestion = 0;
    appState.currentQuiz.answers = [];
    appState.currentQuiz.startTime = Date.now();
    
    if (document.getElementById('enable-timer').checked) {
        startQuizTimer();
    }
    
    displayQuestion();
    checkStudyTimeBadges();
}

function startQuizTimer() {
    let timeLeft = 300; // 5 minutes
    const timerElement = document.getElementById('quiz-timer');
    timerElement.classList.remove('hidden');
    
    quizTimer = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(quizTimer);
            finishQuiz();
        }
    }, 1000);
}

function displayQuestion() {
    const quiz = appState.currentQuiz;
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
    
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', () => selectOption(option));
    });
    
    document.getElementById('submit-answer-btn').disabled = true;
    document.getElementById('explanation-card').classList.add('hidden');
}

function selectOption(optionElement) {
    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    optionElement.classList.add('selected');
    document.getElementById('submit-answer-btn').disabled = false;
}

document.getElementById('speak-question-btn').addEventListener('click', () => {
    const questionText = document.getElementById('question-text').textContent;
    speak(questionText);
});

document.getElementById('voice-answer-btn').addEventListener('click', () => {
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

document.getElementById('hint-btn').addEventListener('click', async () => {
    const quiz = appState.currentQuiz;
    const question = quiz.questions[quiz.currentQuestion];
    const selected = document.querySelector('.option.selected');
    const userAnswer = selected ? selected.textContent : '';
    
    showLoading('Getting hint from AI...');
    const hint = await getHintForQuestion(question.question, userAnswer);
    hideLoading();
    
    showModal('Hint', hint);
    speak(hint);
});

document.getElementById('submit-answer-btn').addEventListener('click', () => {
    submitAnswer();
});

document.getElementById('skip-btn').addEventListener('click', () => {
    appState.currentQuiz.answers.push({ correct: false, skipped: true });
    nextQuestion();
});

function submitAnswer() {
    const quiz = appState.currentQuiz;
    const question = quiz.questions[quiz.currentQuestion];
    const selected = document.querySelector('.option.selected');
    
    if (!selected) return;
    
    const userAnswerIndex = parseInt(selected.dataset.index);
    const isCorrect = userAnswerIndex === question.correct;
    
    quiz.answers.push({
        questionIndex: quiz.currentQuestion,
        userAnswer: userAnswerIndex,
        correct: isCorrect,
        skipped: false
    });
    
    // Visual feedback
    document.querySelectorAll('.option').forEach((opt, index) => {
        opt.style.pointerEvents = 'none';
        if (index === question.correct) {
            opt.classList.add('correct');
        } else if (index === userAnswerIndex && !isCorrect) {
            opt.classList.add('incorrect');
        }
    });
    
    // Show explanation
    const explanationCard = document.getElementById('explanation-card');
    const resultIcon = document.getElementById('result-icon');
    const resultText = document.getElementById('result-text');
    const explanationText = document.getElementById('explanation-text');
    
    if (isCorrect) {
        resultIcon.textContent = '✅';
        resultText.textContent = 'Correct!';
        resultText.style.color = '#10b981';
        speak('Correct! Great job!');
    } else {
        resultIcon.textContent = '❌';
        resultText.textContent = 'Incorrect';
        resultText.style.color = '#ef4444';
        speak('Not quite right. Let me explain.');
    }
    
    explanationText.textContent = question.explanation;
    explanationCard.classList.remove('hidden');
    
    if (appState.userProfile.settings.voiceEnabled) {
        setTimeout(() => speak(question.explanation), 1000);
    }
}

function nextQuestion() {
    const quiz = appState.currentQuiz;
    quiz.currentQuestion++;
    
    if (quiz.currentQuestion >= quiz.questions.length) {
        finishQuiz();
    } else {
        displayQuestion();
    }
}

document.getElementById('next-question-btn').addEventListener('click', nextQuestion);

function finishQuiz() {
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    
    const quiz = appState.currentQuiz;
    const correctAnswers = quiz.answers.filter(a => a.correct).length;
    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
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
        percentage,
        timeTaken,
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
    
    // Show results
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
    
    speak(`Quiz complete! You scored ${percentage} percent.`);
}

function createConfetti() {
    const confettiContainer = document.getElementById('results-confetti');
    confettiContainer.innerHTML = '';
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][Math.floor(Math.random() * 5)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.animation = `fall ${2 + Math.random() * 2}s linear`;
        confettiContainer.appendChild(confetti);
    }
}

function showQuizView(viewId) {
    document.querySelectorAll('.quiz-view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

document.getElementById('retake-quiz-btn').addEventListener('click', () => {
    showQuizView('quiz-start');
});

document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
    navigateToSection('dashboard');
});

// ====================================
// FLASHCARDS SECTION
// ====================================

document.getElementById('start-flashcards-btn').addEventListener('click', () => {
    if (!appState.currentFlashcardDeck) {
        showToast('Please generate flashcards first from the Upload section', 'warning');
        return;
    }
    startFlashcards();
});

document.getElementById('use-sample-flashcards-btn').addEventListener('click', () => {
    appState.currentFlashcardDeck = {
        cards: SAMPLE_FLASHCARDS,
        currentCard: 0,
        knownCards: [],
        markedCards: [],
        subject: 'Sample'
    };
    startFlashcards();
});

function startFlashcards() {
    showFlashcardView('flashcards-studying');
    appState.currentFlashcardDeck.currentCard = 0;
    appState.currentFlashcardDeck.knownCards = [];
    appState.currentFlashcardDeck.markedCards = [];
    displayFlashcard();
    checkStudyTimeBadges();
}

function displayFlashcard() {
    const deck = appState.currentFlashcardDeck;
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

function updateFlashcardProgress() {
    const deck = appState.currentFlashcardDeck;
    document.getElementById('cards-reviewed').textContent = deck.currentCard;
    document.getElementById('cards-remaining').textContent = deck.cards.length - deck.currentCard;
    document.getElementById('cards-marked').textContent = deck.markedCards.length;
}

const flashcard = document.getElementById('flashcard');
flashcard.addEventListener('click', () => {
    flashcard.classList.toggle('flipped');
});

document.addEventListener('keydown', (e) => {
    if (!document.getElementById('flashcards-studying').classList.contains('active')) return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        flashcard.classList.toggle('flipped');
    } else if (e.code === 'ArrowRight') {
        document.getElementById('know-btn').click();
    } else if (e.code === 'ArrowLeft') {
        document.getElementById('dont-know-btn').click();
    }
});

document.getElementById('speak-card-btn').addEventListener('click', () => {
    const isFlipped = flashcard.classList.contains('flipped');
    const text = isFlipped 
        ? document.getElementById('flashcard-back-content').textContent
        : document.getElementById('flashcard-front-content').textContent;
    speak(text);
});

document.getElementById('shuffle-cards-btn').addEventListener('click', () => {
    const deck = appState.currentFlashcardDeck;
    for (let i = deck.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
    }
    displayFlashcard();
    showToast('Flashcards shuffled', 'info');
});

document.getElementById('know-btn').addEventListener('click', () => {
    const deck = appState.currentFlashcardDeck;
    deck.knownCards.push(deck.currentCard);
    appState.userProfile.flashcardsReviewed++;
    addXP(10, 'Flashcard review');
    nextFlashcard();
});

document.getElementById('dont-know-btn').addEventListener('click', () => {
    const deck = appState.currentFlashcardDeck;
    appState.userProfile.flashcardsReviewed++;
    addXP(5, 'Flashcard review');
    nextFlashcard();
});

document.getElementById('mark-review-btn').addEventListener('click', () => {
    const deck = appState.currentFlashcardDeck;
    if (!deck.markedCards.includes(deck.currentCard)) {
        deck.markedCards.push(deck.currentCard);
        showToast('Card marked for review', 'info');
    }
    updateFlashcardProgress();
});

function nextFlashcard() {
    const deck = appState.currentFlashcardDeck;
    deck.currentCard++;
    
    if (deck.currentCard >= deck.cards.length) {
        finishFlashcards();
    } else {
        displayFlashcard();
    }
}

function finishFlashcards() {
    const deck = appState.currentFlashcardDeck;
    const xpEarned = deck.cards.length * 10;
    
    appState.userProfile.studyTime += 300; // Estimate 5 minutes
    
    if (appState.userProfile.flashcardsReviewed >= 500) {
        checkAndUnlockBadge('flashcard_master');
    }
    
    showFlashcardView('flashcards-complete');
    
    document.getElementById('total-reviewed').textContent = deck.cards.length;
    document.getElementById('flashcard-xp-earned').textContent = `+${xpEarned} XP`;
    
    speak('Flashcard review complete! Great work!');
}

function showFlashcardView(viewId) {
    document.querySelectorAll('.flashcards-view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

document.getElementById('review-again-btn').addEventListener('click', () => {
    startFlashcards();
});

document.getElementById('review-marked-btn').addEventListener('click', () => {
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
        subject: deck.subject
    };
    
    appState.currentFlashcardDeck = markedDeck;
    startFlashcards();
});

document.getElementById('flashcards-dashboard-btn').addEventListener('click', () => {
    navigateToSection('dashboard');
});

// ====================================
// PROGRESS SECTION
// ====================================

function updateProgressCharts() {
    createStudyTimeChart();
    createPerformanceChart();
    createStreakCalendar();
    displayAllBadges();
    displayStudyHistory();
}

function createStudyTimeChart() {
    const ctx = document.getElementById('study-time-chart');
    if (!ctx) return;
    
    // Destroy existing chart if any
    if (window.studyTimeChart) {
        window.studyTimeChart.destroy();
    }
    
    window.studyTimeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Study Time (minutes)',
                data: [45, 60, 30, 75, 90, 40, 55],
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

function createPerformanceChart() {
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;
    
    if (window.performanceChart) {
        window.performanceChart.destroy();
    }
    
    window.performanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Mathematics', 'Physics', 'Biology', 'Computer Science'],
            datasets: [{
                data: [30, 25, 20, 25],
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

function createStreakCalendar() {
    const calendar = document.getElementById('streak-calendar');
    if (!calendar) return;
    
    calendar.innerHTML = '';
    
    const today = new Date();
    const days = 35;
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = date.getDate();
        
        if (Math.random() > 0.3) {
            dayDiv.classList.add('active');
        }
        
        if (i === 0) {
            dayDiv.classList.add('today');
        }
        
        dayDiv.title = date.toDateString();
        calendar.appendChild(dayDiv);
    }
}

function displayAllBadges() {
    const badgesGrid = document.getElementById('all-badges');
    if (!badgesGrid) return;
    
    badgesGrid.innerHTML = SAMPLE_BADGES.map(badge => `
        <div class="badge-card ${badge.unlocked ? '' : 'locked'}" style="border-color: ${badge.color}">
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-description">${badge.description}</div>
            <div class="badge-xp">+${badge.xpReward} XP</div>
        </div>
    `).join('');
}

function displayStudyHistory() {
    const historyList = document.getElementById('study-history');
    if (!historyList) return;
    
    if (appState.quizHistory.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #94a3b8;">No study sessions yet. Start a quiz to see your history!</p>';
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
// PROFILE SECTION
// ====================================

function updateProfileStats() {
    const profile = appState.userProfile;
    
    document.getElementById('profile-avatar-text').textContent = profile.name.charAt(0).toUpperCase();
    document.getElementById('profile-level-badge').textContent = profile.level;
    document.getElementById('profile-name').textContent = profile.name;
    
    const { title } = calculateLevel(profile.xp);
    document.getElementById('profile-title').textContent = title;
    
    const currentLevelData = XP_LEVELS.find(l => l.level === profile.level);
    const nextLevelData = XP_LEVELS.find(l => l.level === profile.level + 1);
    
    if (nextLevelData) {
        const xpInCurrentLevel = profile.xp - currentLevelData.xpRequired;
        const xpNeededForNextLevel = nextLevelData.xpRequired - currentLevelData.xpRequired;
        const progress = (xpInCurrentLevel / xpNeededForNextLevel) * 100;
        
        document.getElementById('profile-xp-fill').style.width = `${progress}%`;
        document.getElementById('profile-xp-text').textContent = 
            `${profile.xp} / ${nextLevelData.xpRequired} XP`;
    } else {
        document.getElementById('profile-xp-fill').style.width = '100%';
        document.getElementById('profile-xp-text').textContent = `${profile.xp} XP (Max Level)`;
    }
    
    document.getElementById('profile-study-time').textContent = formatTime(profile.studyTime);
    document.getElementById('profile-quizzes').textContent = profile.quizzesCompleted;
    document.getElementById('profile-flashcards').textContent = profile.flashcardsReviewed;
    document.getElementById('profile-badges').textContent = profile.badges.length;
    
    const profileBadgesGrid = document.getElementById('profile-badges-display');
    const earnedBadges = SAMPLE_BADGES.filter(b => b.unlocked);
    
    if (earnedBadges.length === 0) {
        profileBadgesGrid.innerHTML = '<p style="text-align: center; color: #94a3b8; grid-column: 1/-1;">Complete activities to earn badges!</p>';
    } else {
        profileBadgesGrid.innerHTML = earnedBadges.map(badge => `
            <div class="badge-card" style="border-color: ${badge.color}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
            </div>
        `).join('');
    }
}

// Settings toggles
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

// ====================================
// BADGE CHECKING
// ====================================

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
// NAVIGATION HANDLERS
// ====================================

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        navigateToSection(section);
        
        if (section === 'progress') {
            updateProgressCharts();
        } else if (section === 'profile') {
            updateProfileStats();
        }
    });
});

// Mobile menu toggle
document.querySelector('.mobile-menu-toggle')?.addEventListener('click', () => {
    document.querySelector('.nav-menu')?.classList.toggle('active');
});

// Modal close handlers
document.getElementById('modal-close')?.addEventListener('click', hideModal);
document.getElementById('modal-cancel')?.addEventListener('click', hideModal);
document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
        hideModal();
    }
});

// ====================================
// INITIALIZATION
// ====================================

function initializeApp() {
    updateStreak();
    updateDashboardStats();
    updateProfileStats();
    
    // Check for time-based badges
    checkStudyTimeBadges();
    
    // Welcome message
    const greeting = `Hey there! Welcome to your Smart Study Assistant. I'm here to help you learn smarter, not harder. Let's achieve great things together!`;
    
    setTimeout(() => {
        if (appState.userProfile.settings.voiceEnabled) {
            speak(`Welcome back, ${appState.userProfile.name}!`);
        }
    }, 500);
    
    // Add initial activity
    const activityList = document.getElementById('recent-activity-list');
    activityList.innerHTML = `
        <div class="activity-item">
            <span class="activity-icon">🎉</span>
            <div class="activity-content">
                <p class="activity-text">Welcome! Start by uploading study materials or try a sample quiz.</p>
                <p class="activity-time">Just now</p>
            </div>
        </div>
    `;
}

// Initialize Firebase (if configured)
initializeFirebase();

// ====================================
// CSS ANIMATIONS (Add to CSS)
// ====================================

const style = document.createElement('style');
style.textContent = `
@keyframes fall {
    to {
        transform: translateY(100vh) rotate(360deg);
        opacity: 0;
    }
}

@keyframes slideOut {
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}
`;
document.head.appendChild(style);

console.log('%c🎓 Smart Study Assistant Loaded!', 'color: #6366f1; font-size: 20px; font-weight: bold;');
console.log('%cRemember to replace API keys and Firebase config!', 'color: #f59e0b; font-size: 14px;');