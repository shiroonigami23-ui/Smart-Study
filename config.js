// ====================================
// CONFIGURATION & PLACEHOLDERS
// ====================================

// Firebase Configuration - Using your provided credentials
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBoUtquSv996DJgXwotKOhakl6Yc9zfIrc",
    authDomain: "smart-study-a1721.firebaseapp.com",
    projectId: "smart-study-a1721",
    storageBucket: "smart-study-a1721.firebasestorage.app",
    messagingSenderId: "116901944117",
    appId: "1:116901944117:web:9c9de8cebb6ff5e133ca7c"
};

// Gemini API Configuration - Using your provided key
const GEMINI_API_KEY = "AIzaSyDpeXSmDxHQB6pLVlpx6wfYyM8fVkhPUPY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
    cloudName: 'dbqr0rgq1',
    uploadPreset: 'study_assistant'
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
    },
    // NEW BADGES
    {
        id: "first_notes",
        name: "Note Taker",
        description: "Generate your first study notes",
        icon: "📝",
        xpReward: 150,
        color: "#10b981",
        unlocked: false
    },
    {
        id: "curious_mind",
        name: "Curious Mind",
        description: "Ask 10 questions in Q&A",
        icon: "❓",
        xpReward: 250,
        color: "#f59e0b",
        unlocked: false
    },
    {
        id: "file_master",
        name: "File Master",
        description: "Upload files of 3 different types",
        icon: "📁",
        xpReward: 200,
        color: "#8b5cf6",
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
