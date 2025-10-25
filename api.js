// ====================================
// FIREBASE IMPORTS
// ====================================
// These functions will be available globally once you add the
// Firebase SDK scripts to your index.html
const { initializeApp } = firebase.app;
const { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile,
    onAuthStateChanged,
    GoogleAuthProvider, 
    signInWithPopup    
} = firebase.auth;
const { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    serverTimestamp
} = firebase.firestore;


// ====================================
// FIREBASE SERVICE INITIALIZATION
// ====================================
// These variables will be set by initializeFirebase
let app;
let auth;
let db;

/**
 * Initializes the Firebase app and services.
 * This should be called once from main.js.
 * @returns {object} An object containing the auth and db instances.
 */
function initializeFirebase() {
    try {
        // FIREBASE_CONFIG is loaded from config.js
        app = initializeApp(FIREBASE_CONFIG);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase initialized successfully.");
        return { auth, db };
    } catch (error) {
        console.error("Firebase initialization error:", error);
        showToast("Error connecting to services.", "error");
        return { auth: null, db: null };
    }
}

/**
 * Logs in a user with email and password.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} Firebase User object
 */
async function firebaseLogin(email, password) {
    // This is now a real Firebase function
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
}

/**
 * Signs up a new user and creates a profile in Firestore.
 * @param {string} email 
 * @param {string} password 
 * @param {string} name 
 * @returns {Promise<object>} Firebase User object
 */
async function firebaseSignup(email, password, name) {
    // This is now a real Firebase function
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user's profile display name
    await updateProfile(userCredential.user, { displayName: name });
    
    // Create a user profile document in Firestore
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userDocRef, {
        uid: userCredential.user.uid,
        name: name,
        email: email,
        xp: 0,
        level: 1,
        streak: 0,
        createdAt: serverTimestamp()
        // Add any other default profile data here
    });
    
    return userCredential.user;
}

/**
 * Saves data to a specific document in Firestore.
 * @param {string} collectionPath The name of the collection (e.g., "users").
 * @param {string} docId The ID of the document.
 * @param {object} data The data to save.
 */
async function saveToFirestore(collectionPath, docId, data) {
    try {
        const docRef = doc(db, collectionPath, docId);
        // Using { merge: true } prevents overwriting fields you don't include
        await setDoc(docRef, data, { merge: true });
    } catch (error) {
        console.error('Firestore save error:', error);
        showToast("Error saving progress.", "error");
    }
}

/**
 * Loads a document from Firestore.
 * @param {string} collectionPath The name of the collection.
 * @param {string} docId The ID of the document.
 * @returns {Promise<object|null>} The document data or null if not found.
 */
async function loadFromFirestore(collectionPath, docId) {
    try {
        const docRef = doc(db, collectionPath, docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        console.error('Firestore load error:', error);
        showToast("Error loading profile.", "error");
        return null;
    }
}

// ====================================
// GEMINI AI INTEGRATION
// ====================================
// (This section is unchanged, as it relies on GEMINI_API_KEY)

/**
 * Calls the Gemini API with a given prompt.
 * @param {string} prompt The prompt to send to the API.
 * @returns {Promise<string|null>} The text response from the API, or null on failure.
 */
async function callGeminiAPI(prompt) {
    // Check if API key is configured
    // GEMINI_API_KEY is loaded from config.js
    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE" || !GEMINI_API_KEY) {
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
            const errorBody = await response.text();
            console.error(`API error: ${response.status}`, errorBody);
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.warn("API response was successful but contained no candidates.", data);
            return null;
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        showToast('AI service temporarily unavailable. Using sample data.', 'warning');
        return null;
    }
}

/**
 * Generates a quiz from content using the Gemini API.
 * @param {string} content The source text content.
 * @param {string} difficulty 'easy', 'medium', or 'hard'.
 * @param {number} questionCount The number of questions to generate.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of quiz questions.
 */
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
        showToast("Using sample quiz data.", "info");
        return SAMPLE_QUIZ.slice(0, questionCount);
    }
    
    // Parse the response into quiz format
    try {
        const questions = parseQuizResponse(response);
        if (questions.length === 0) throw new Error("No questions parsed.");
        return questions.slice(0, questionCount);
    } catch (error) {
        console.error('Error parsing quiz:', error);
        showToast("AI response was unreadable. Using sample quiz.", "warning");
        return SAMPLE_QUIZ.slice(0, questionCount);
    }
}

/**
 * Parses the raw text response from the Gemini API into a quiz object array.
 * @param {string} response The raw text response.
 * @returns {Array<object>} An array of question objects.
 */
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
            const answer = line.substring(8).trim().charAt(0).toUpperCase();
            const correctIndex = answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            currentQuestion.correct = correctIndex;
        } else if (line.startsWith('Explanation:')) {
            currentQuestion.explanation = line.substring(12).trim();
        }
    }
    
    if (currentQuestion.question && options.length > 0) {
        currentQuestion.options = options;
        questions.push(currentQuestion);
    }
    
    return questions;
}

/**
 * Generates flashcards from content using the Gemini API.
 * @param {string} content The source text content.
 * @param {number} cardCount The number of flashcards to generate.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of flashcard objects.
 */
async function generateFlashcardsFromContent(content, cardCount) {
    const prompt = `Create ${cardCount} flashcards from the following content.
Content: ${content}

Format: Front: [key concept] | Back: [definition/explanation] | Category: [subject]

Generate ${cardCount} flashcards now:`;
    
    const response = await callGeminiAPI(prompt);
    
    if (!response) {
        showToast("Using sample flashcard data.", "info");
        return SAMPLE_FLASHCARDS.slice(0, cardCount);
    }
    
    try {
        const flashcards = parseFlashcardsResponse(response);
        if (flashcards.length === 0) throw new Error("No flashcards parsed.");
        return flashcards.slice(0, cardCount);
    } catch (error) {
        console.error('Error parsing flashcards:', error);
        showToast("AI response was unreadable. Using sample flashcards.", "warning");
        return SAMPLE_FLASHCARDS.slice(0, cardCount);
    }
}

/**
 * Parses the raw text response from the Gemini API into a flashcard object array.
 * @param {string} response The raw text response.
 * @returns {Array<object>} An array of flashcard objects.
 */
function parseFlashcardsResponse(response) {
    const flashcards = [];
    const lines = response.split('\n').filter(line => line.trim());
    
    for (let line of lines) {
        const parts = line.split('|');
        if (parts.length >= 2) {
            const front = (parts[0] || '').replace('Front:', '').trim();
            const back = (parts[1] || '').replace('Back:', '').trim();
            const category = (parts[2] || '').replace('Category:', '').trim() || 'General';
            
            if (front && back) {
                flashcards.push({ front, back, category });
            }
        }
    }
    
    return flashcards;
}

/**
 * Gets a hint for a specific quiz question.
 * @param {string} question The question text.
 * @param {string} userAnswer The user's currently selected answer (if any).
 * @returns {Promise<string>} A promise that resolves to a hint string.
 */
async function getHintForQuestion(question, userAnswer) {
    const prompt = `The student is stuck on this question: ${question}
Their current answer is: ${userAnswer}
Provide a helpful hint without giving away the answer completely. Be encouraging and friendly!`;
    
    const response = await callGeminiAPI(prompt);
    return response || "Think about the key concepts involved. You've got this!";
}
