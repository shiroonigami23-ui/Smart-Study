// ====================================
// FIREBASE SERVICE INITIALIZATION (v8 Compat Syntax)
// ====================================
// These variables will be set by initializeFirebase
let app;
let auth;
let db;

/**
 * Initializes the Firebase app and services using v8 compat syntax.
 * This should be called once from main.js.
 * @returns {object} An object containing the auth and db instances.
 */
function initializeFirebase() {
    try {
        // FIREBASE_CONFIG is loaded from config.js
        // Use the global 'firebase' object provided by compat scripts
        if (!firebase || typeof firebase.initializeApp !== 'function') {
            throw new Error("Firebase SDK not loaded correctly. Check script tags in index.html.");
        }

        app = firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();         // Use firebase.auth()
        db = firebase.firestore();      // Use firebase.firestore()

        console.log("Firebase initialized successfully (v8 Compat).");
        return { auth, db };
    } catch (error) {
        console.error("Firebase initialization error:", error);
        // Ensure showToast is defined before calling it (might be called before utils.js is fully ready)
        if (typeof showToast === 'function') {
            showToast(`Error connecting to services: ${error.message}`, "error");
        } else {
            alert(`Error connecting to services: ${error.message}`); // Fallback alert
        }
        // Set auth/db to null explicitly on failure
        auth = null;
        db = null;
        return { auth: null, db: null };
    }
}

// ====================================
// FIREBASE AUTH FUNCTIONS (v8 Compat Syntax)
// ====================================

/**
 * Logs in a user with email and password using v8 compat syntax.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<firebase.User>} Firebase User object
 */
async function firebaseLogin(email, password) {
    if (!auth) throw new Error("Firebase Auth not initialized.");
    // Use auth.signInWithEmailAndPassword()
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return userCredential.user;
}

/**
 * Signs up a new user and creates a profile in Firestore using v8 compat syntax.
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {Promise<firebase.User>} Firebase User object
 */
async function firebaseSignup(email, password, name) {
    if (!auth || !db) throw new Error("Firebase Auth or Firestore not initialized.");
    // Use auth.createUserWithEmailAndPassword()
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);

    // Update the user's profile display name
    await userCredential.user.updateProfile({ displayName: name });

    // Create a user profile document in Firestore
    // Use db.collection().doc().set()
    const userDocRef = db.collection('users').doc(userCredential.user.uid);
    await userDocRef.set({
        uid: userCredential.user.uid,
        name: name,
        email: email,
        xp: 0,
        level: 1,
        streak: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Use namespaced serverTimestamp
        studyTime: 0,
        quizzesCompleted: 0,
        flashcardsReviewed: 0,
        badges: [],
        lastLoginDate: null,
        settings: {
            voiceEnabled: true,
            soundEnabled: true,
            remindersEnabled: false
        }
    });

    return userCredential.user;
}

/**
 * Initiates Google Sign-in using a popup (v8 Compat Syntax).
 * Checks Firestore for existing user profile, creates one if it's a new login.
 * @returns {Promise<firebase.User>} Firebase User object
 */
async function firebaseGoogleLogin() {
    if (!auth || !db) throw new Error("Firebase Auth or Firestore not initialized.");
    // Use firebase.auth.GoogleAuthProvider for the provider
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        // Use auth.signInWithPopup()
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        // Check/Create profile in Firestore
        const userDocRef = db.collection('users').doc(user.uid);
        const docSnap = await userDocRef.get();

        if (!docSnap.exists) {
            console.log(`Creating Firestore profile for new Google user: ${user.uid}`);
            await userDocRef.set({
                uid: user.uid,
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                xp: 0,
                level: 1,
                streak: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                studyTime: 0,
                quizzesCompleted: 0,
                flashcardsReviewed: 0,
                badges: [],
                lastLoginDate: null,
                settings: {
                    voiceEnabled: true,
                    soundEnabled: true,
                    remindersEnabled: false
                }
            });
        } else {
            console.log(`Firestore profile already exists for Google user: ${user.uid}`);
        }
        return user;
    } catch (error) {
        console.error("Google Sign-in error details:", error);
        if (typeof showToast === 'function') {
            if (error.code === 'auth/popup-closed-by-user') {
                 showToast('Google Sign-in cancelled.', 'info');
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                 showToast('An account already exists with this email. Try logging in differently.', 'warning');
            } else {
                 showToast('Google Sign-in failed. Please try again.', 'error');
            }
        } else {
            alert("Google Sign-in failed: " + error.message); // Fallback
        }
        throw error;
    }
}


// ====================================
// FIREBASE FIRESTORE FUNCTIONS (v8 Compat Syntax)
// ====================================

/**
 * Saves data to a specific document in Firestore using v8 compat syntax.
 * @param {string} collectionPath The name of the collection (e.g., "users").
 * @param {string} docId The ID of the document.
 * @param {object} data The data to save.
 */
async function saveToFirestore(collectionPath, docId, data) {
    if (!db) {
        console.error("Firestore not initialized, cannot save data.");
        if (typeof showToast === 'function') showToast("Error saving progress: Connection issue.", "error");
        return;
    }
    try {
        // Use db.collection().doc().set()
        const docRef = db.collection(collectionPath).doc(docId);
        await docRef.set(data, { merge: true });
    } catch (error) {
        console.error('Firestore save error:', error);
        if (typeof showToast === 'function') showToast("Error saving progress.", "error");
    }
}

/**
 * Loads a document from Firestore using v8 compat syntax.
 * @param {string} collectionPath The name of the collection.
 * @param {string} docId The ID of the document.
 * @returns {Promise<object|null>} The document data or null if not found.
 */
async function loadFromFirestore(collectionPath, docId) {
     if (!db) {
        console.error("Firestore not initialized, cannot load data.");
        if (typeof showToast === 'function') showToast("Error loading profile: Connection issue.", "error");
        return null;
    }
    try {
        // Use db.collection().doc().get()
        const docRef = db.collection(collectionPath).doc(docId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            return docSnap.data();
        } else {
            console.log(`Document not found: ${collectionPath}/${docId}`);
            return null;
        }
    } catch (error) {
        console.error('Firestore load error:', error);
         if (typeof showToast === 'function') showToast("Error loading profile.", "error");
        return null;
    }
}

// ====================================
// GEMINI AI INTEGRATION (Unchanged)
// ====================================
// (Keep the existing callGeminiAPI, generateQuizFromContent, parseQuizResponse,
// generateFlashcardsFromContent, parseFlashcardsResponse, getHintForQuestion functions here)

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
        // Fallback to avoid breaking things, return null or sample
        return null;
    }

    try {
        // GEMINI_API_URL is loaded from config.js
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                // Optional: Add safety settings if needed
                // safetySettings: [
                //     { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                //     // Add other categories as needed
                // ]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Gemini API error: ${response.status}`, errorBody);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Check for safety blocks or empty responses
        if (!data.candidates || data.candidates.length === 0) {
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                 console.warn(`Gemini API request blocked due to safety settings: ${data.promptFeedback.blockReason}`);
                 showToast("Request blocked for safety reasons.", "warning");
            } else {
                console.warn("Gemini API response was successful but contained no candidates.", data);
                showToast("AI returned an empty response.", "warning");
            }
            return null; // Return null if blocked or no candidates
        }

        // Check if the candidate itself has content
        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0 || !candidate.content.parts[0].text) {
            console.warn("Gemini API candidate had no text content.", candidate);
            // Check finish reason (e.g., SAFETY)
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                 console.warn(`Gemini generation stopped due to: ${candidate.finishReason}`);
                 showToast(`AI generation stopped: ${candidate.finishReason}`, "warning");
            }
            return null; // Return null if no text part
        }

        return candidate.content.parts[0].text;

    } catch (error) {
        console.error('Gemini API fetch/processing error:', error);
        // Check if showToast exists before calling
        if (typeof showToast === 'function') {
            showToast('AI service error. Using sample data.', 'warning');
        } else {
             alert('AI service error. Using sample data.'); // Fallback
        }
        return null; // Return null on error
    }
}

// --- (Keep the other Gemini-related functions: generateQuizFromContent, parseQuizResponse, etc. exactly as they were) ---

/**
 * Generates a quiz from content using the Gemini API.
 * @param {string} content The source text content.
 * @param {string} difficulty 'easy', 'medium', or 'hard'.
 * @param {number} questionCount The number of questions to generate.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of quiz questions.
 */
async function generateQuizFromContent(content, difficulty, questionCount) {
    const prompt = `Generate ${questionCount} multiple choice questions based on the following content.\nDifficulty: ${difficulty}\nContent: ${content}\n\nFormat each question EXACTLY as follows (one per line):\nQ: [question text]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nCorrect: [A/B/C/D]\nExplanation: [detailed explanation]\n\nGenerate ${questionCount} questions now:`;

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
        // Ensure we only return the requested number, even if API gave more
        const limitedQuestions = questions.slice(0, questionCount);
        // Basic validation: Check if essential fields exist
        if (!limitedQuestions[0]?.question || !limitedQuestions[0]?.options || limitedQuestions[0].correct === undefined) {
             throw new Error("Parsed question format seems incorrect.");
        }
        return limitedQuestions;
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

    let currentQuestion = null; // Use null to indicate no question is being built
    let options = [];

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('Q:')) {
            // If we were building a question, finalize it before starting new one
            if (currentQuestion) {
                 if (currentQuestion.question && options.length >= 2 && currentQuestion.correct !== undefined && currentQuestion.explanation) {
                    currentQuestion.options = options;
                    questions.push(currentQuestion);
                 } else {
                     console.warn("Skipping incomplete question: ", currentQuestion);
                 }
            }
            // Start new question object
            currentQuestion = { question: trimmedLine.substring(2).trim(), explanation: "" }; // Initialize explanation
            options = [];
        } else if (currentQuestion && trimmedLine.match(/^[A-D]\)/)) {
            options.push(trimmedLine.substring(2).trim());
        } else if (currentQuestion && trimmedLine.startsWith('Correct:')) {
            const answer = trimmedLine.substring(8).trim().charAt(0).toUpperCase();
            const correctIndex = answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            if (correctIndex >= 0 && correctIndex <= 3) {
                currentQuestion.correct = correctIndex;
            } else {
                console.warn(`Invalid correct answer format: ${trimmedLine}`);
            }
        } else if (currentQuestion && trimmedLine.startsWith('Explanation:')) {
            currentQuestion.explanation = trimmedLine.substring(12).trim();
        } else if (currentQuestion && currentQuestion.explanation !== undefined && currentQuestion.explanation === "" && !trimmedLine.match(/^[A-D]\)/) && !trimmedLine.startsWith('Correct:')) {
             // If explanation started but was empty, assume this line starts it
             currentQuestion.explanation = trimmedLine;
        } else if (currentQuestion && currentQuestion.explanation) {
            // Append multi-line explanations if needed (simple approach)
             if (!trimmedLine.match(/^[A-D]\)/) && !trimmedLine.startsWith('Correct:')) {
                currentQuestion.explanation += " " + trimmedLine;
             }
        }
    }

    // Add the last question if it's valid
    if (currentQuestion) {
        if (currentQuestion.question && options.length >= 2 && currentQuestion.correct !== undefined && currentQuestion.explanation) {
            currentQuestion.options = options;
            questions.push(currentQuestion);
        } else {
             console.warn("Skipping incomplete last question: ", currentQuestion);
        }
    }

    if (questions.length === 0) {
        console.warn("Could not parse any valid questions from response:\n", response);
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
    const prompt = `Create ${cardCount} flashcards from the following content.\nContent: ${content}\n\nFormat: Front: [key concept] | Back: [definition/explanation] | Category: [subject]\n\nGenerate ${cardCount} flashcards now:`;

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
            const front = (parts[0] || '').replace(/^Front:/i, '').trim(); // Case-insensitive replace
            const back = (parts[1] || '').replace(/^Back:/i, '').trim();
            const category = (parts[2] || '').replace(/^Category:/i, '').trim() || 'General';

            if (front && back) {
                flashcards.push({ front, back, category });
            }
        }
    }

    if (flashcards.length === 0) {
        console.warn("Could not parse any valid flashcards from response:\n", response);
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
    const prompt = `The student is stuck on this question: ${question}\nTheir current answer is: ${userAnswer}\nProvide a helpful hint without giving away the answer completely. Be encouraging and friendly!`;

    const response = await callGeminiAPI(prompt);
    return response || "Think about the key concepts involved. You've got this!";
}
