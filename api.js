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
        auth = firebase.auth(); // Use firebase.auth()
        db = firebase.firestore(); // Use firebase.firestore()

        console.log("Firebase initialized successfully (v8 Compat).");

        // Set up auth state listener
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("User logged in:", user.uid);
                appState.currentUser = user;
                appState.userProfile.email = user.email;
                appState.userProfile.name = user.displayName || user.email.split('@')[0];

                // Load user data from Firestore
                await loadUserDataFromFirestore(user.uid);

                // Only initialize app if we're on the app page
                if (document.getElementById('app-page').classList.contains('active')) {
                    initializeApp();
                }
            } else {
                console.log("No user logged in");
            }
        });

        return { auth, db };
    } catch (error) {
        console.error("Firebase initialization error:", error);
        // Ensure showToast is defined before calling it
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
 * @returns {Promise} Firebase User object
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
 * @returns {Promise} Firebase User object
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        studyTime: 0,
        quizzesCompleted: 0,
        flashcardsReviewed: 0,
        notesGenerated: 0,
        questionsAsked: 0,
        filesUploaded: [],
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
 * @returns {Promise} Firebase User object
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
                notesGenerated: 0,
                questionsAsked: 0,
                filesUploaded: [],
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
        console.log("Data saved to Firestore successfully");
    } catch (error) {
        console.error('Firestore save error:', error);
        if (typeof showToast === 'function') showToast("Error saving progress.", "error");
    }
}

/**
 * Loads a document from Firestore using v8 compat syntax.
 * @param {string} collectionPath The name of the collection.
 * @param {string} docId The ID of the document.
 * @returns {Promise} The document data or null if not found.
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

/**
 * Loads user data from Firestore and updates appState.
 * @param {string} userId The user's UID.
 */
async function loadUserDataFromFirestore(userId) {
    const userData = await loadFromFirestore('users', userId);
    if (userData) {
        // Merge Firestore data with appState
        appState.userProfile.xp = userData.xp || 0;
        appState.userProfile.level = userData.level || 1;
        appState.userProfile.streak = userData.streak || 0;
        appState.userProfile.studyTime = userData.studyTime || 0;
        appState.userProfile.quizzesCompleted = userData.quizzesCompleted || 0;
        appState.userProfile.flashcardsReviewed = userData.flashcardsReviewed || 0;
        appState.userProfile.notesGenerated = userData.notesGenerated || 0;
        appState.userProfile.questionsAsked = userData.questionsAsked || 0;
        appState.userProfile.badges = userData.badges || [];
        appState.userProfile.lastLoginDate = userData.lastLoginDate || null;
        appState.userProfile.settings = userData.settings || {
            voiceEnabled: true,
            soundEnabled: true,
            remindersEnabled: false
        };
        appState.userProfile.filesUploaded = userData.filesUploaded || [];
        console.log("User data loaded from Firestore");
    }
}

/**
 * Saves current user profile to Firestore.
 */
async function saveUserProfileToFirestore() {
    if (!appState.currentUser || !db) {
        console.log("Cannot save to Firestore: No user or DB not initialized");
        return;
    }

    const profileData = {
        name: appState.userProfile.name,
        email: appState.userProfile.email,
        xp: appState.userProfile.xp,
        level: appState.userProfile.level,
        streak: appState.userProfile.streak,
        studyTime: appState.userProfile.studyTime,
        quizzesCompleted: appState.userProfile.quizzesCompleted,
        flashcardsReviewed: appState.userProfile.flashcardsReviewed,
        notesGenerated: appState.userProfile.notesGenerated,
        questionsAsked: appState.userProfile.questionsAsked,
        filesUploaded: appState.userProfile.filesUploaded,
        badges: appState.userProfile.badges,
        lastLoginDate: appState.userProfile.lastLoginDate,
        settings: appState.userProfile.settings,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    await saveToFirestore('users', appState.currentUser.uid, profileData);
}

// ====================================
// FILE PROCESSING FUNCTIONS
// ====================================

/**
 * Reads and extracts text from various file types.
 * @param {File} file The file object to process.
 * @returns {Promise<string>} The extracted text content.
 */
async function processFile(file) {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
        // PDF files
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            return await extractTextFromPDF(file);
        }
        // Images (PNG, JPG, JPEG)
        else if (fileType.startsWith('image/')) {
            return await extractTextFromImage(file);
        }
        // Text files
        else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
            return await extractTextFromTXT(file);
        }
        // Word documents (DOCX)
        else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
            return await extractTextFromDOCX(file);
        }
        // EPUB files
        else if (fileType === 'application/epub+zip' || fileName.endsWith('.epub')) {
            return await extractTextFromEPUB(file);
        }
        else {
            throw new Error('Unsupported file type');
        }
    } catch (error) {
        console.error('File processing error:', error);
        throw error;
    }
}

/**
 * Extracts text from a PDF file using PDF.js.
 * @param {File} file The PDF file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText.trim();
    } catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
}

/**
 * Extracts text from an image using Gemini's vision capabilities.
 * @param {File} file The image file.
 * @returns {Promise<string>} The extracted/described text.
 */
async function extractTextFromImage(file) {
    try {
        // Convert image to base64
        const base64Image = await fileToBase64(file);
        const base64Data = base64Image.split(',')[1];

        const prompt = "Extract all text from this image. If there's no text, describe the image content in detail, focusing on any educational or informational content. If there are questions, provide detailed answers with explanations, examples, and visualizations where appropriate (describe charts, graphs, diagrams, tables).";

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: file.type,
                                data: base64Data
                            }
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from Gemini API');
        }

        const textContent = data.candidates[0].content.parts[0].text;
        return textContent;
    } catch (error) {
        console.error('Image extraction error:', error);
        throw new Error('Failed to process image');
    }
}

/**
 * Converts a file to base64 string.
 * @param {File} file The file to convert.
 * @returns {Promise<string>} The base64 string.
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Extracts text from a plain text file.
 * @param {File} file The text file.
 * @returns {Promise<string>} The file content.
 */
async function extractTextFromTXT(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

/**
 * Extracts text from a DOCX file using Mammoth.js.
 * @param {File} file The DOCX file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractTextFromDOCX(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        console.error('DOCX extraction error:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

/**
 * Extracts text from an EPUB file using JSZip.
 * @param {File} file The EPUB file.
 * @returns {Promise<string>} The extracted text.
 */
async function extractTextFromEPUB(file) {
    try {
        const zip = await JSZip.loadAsync(file);
        let fullText = '';

        // Find and read all HTML/XHTML files in the EPUB
        const filePromises = [];
        zip.forEach((relativePath, zipEntry) => {
            if (relativePath.endsWith('.html') || relativePath.endsWith('.xhtml')) {
                filePromises.push(
                    zipEntry.async('string').then(content => {
                        // Strip HTML tags and extract text
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = content;
                        return tempDiv.textContent || tempDiv.innerText || '';
                    })
                );
            }
        });

        const texts = await Promise.all(filePromises);
        fullText = texts.join('\n\n');

        return fullText.trim();
    } catch (error) {
        console.error('EPUB extraction error:', error);
        throw new Error('Failed to extract text from EPUB');
    }
}

// ====================================
// GEMINI AI INTEGRATION
// ====================================

/**
 * Calls the Gemini API with a given prompt.
 * @param {string} prompt The prompt to send to the API.
 * @returns {Promise<string>} The text response from the API, or null on failure.
 */
async function callGeminiAPI(prompt) {
    // Check if API key is configured
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
                contents: [{ parts: [{ text: prompt }] }]
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
                console.warn(`Gemini API request blocked: ${data.promptFeedback.blockReason}`);
                showToast("Request blocked for safety reasons.", "warning");
            } else {
                console.warn("Gemini API returned no candidates.", data);
                showToast("AI returned an empty response.", "warning");
            }
            return null;
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0 || !candidate.content.parts[0].text) {
            console.warn("Gemini API candidate had no text content.", candidate);
            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                console.warn(`Gemini generation stopped: ${candidate.finishReason}`);
                showToast(`AI generation stopped: ${candidate.finishReason}`, "warning");
            }
            return null;
        }

        return candidate.content.parts[0].text;
    } catch (error) {
        console.error('Gemini API fetch/processing error:', error);
        if (typeof showToast === 'function') {
            showToast('AI service error. Using sample data.', 'warning');
        } else {
            alert('AI service error. Using sample data.');
        }
        return null;
    }
}

/**
 * Generates a quiz from content using the Gemini API.
 * @param {string} content The source text content.
 * @param {string} difficulty 'easy', 'medium', or 'hard'.
 * @param {number} questionCount The number of questions to generate.
 * @returns {Promise<Array>} A promise that resolves to an array of quiz questions.
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
 * @returns {Array} An array of question objects.
 */
function parseQuizResponse(response) {
    const questions = [];
    const lines = response.split('\n').filter(line => line.trim());
    let currentQuestion = null;
    let options = [];

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('Q:')) {
            // Save previous question if exists
            if (currentQuestion && currentQuestion.question && options.length >= 2 && 
                currentQuestion.correct !== undefined && currentQuestion.explanation) {
                currentQuestion.options = options;
                questions.push(currentQuestion);
            }
            // Start new question
            currentQuestion = { question: trimmedLine.substring(2).trim(), explanation: "" };
            options = [];
        } else if (currentQuestion && trimmedLine.match(/^[A-D]\)/)) {
            options.push(trimmedLine.substring(2).trim());
        } else if (currentQuestion && trimmedLine.startsWith('Correct:')) {
            const answer = trimmedLine.substring(8).trim().charAt(0).toUpperCase();
            const correctIndex = answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            if (correctIndex >= 0 && correctIndex <= 3) {
                currentQuestion.correct = correctIndex;
            }
        } else if (currentQuestion && trimmedLine.startsWith('Explanation:')) {
            currentQuestion.explanation = trimmedLine.substring(12).trim();
        } else if (currentQuestion && currentQuestion.explanation && !trimmedLine.match(/^[A-D]\)/) && !trimmedLine.startsWith('Correct:') && !trimmedLine.startsWith('Q:')) {
            // Append multi-line explanations
            currentQuestion.explanation += " " + trimmedLine;
        }
    }

    // Add the last question if valid
    if (currentQuestion && currentQuestion.question && options.length >= 2 && 
        currentQuestion.correct !== undefined && currentQuestion.explanation) {
        currentQuestion.options = options;
        questions.push(currentQuestion);
    }

    return questions;
}

/**
 * Generates flashcards from content using the Gemini API.
 * @param {string} content The source text content.
 * @param {number} cardCount The number of flashcards to generate.
 * @returns {Promise<Array>} A promise that resolves to an array of flashcard objects.
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
 * Parses the raw text response into a flashcard object array.
 * @param {string} response The raw text response.
 * @returns {Array} An array of flashcard objects.
 */
function parseFlashcardsResponse(response) {
    const flashcards = [];
    const lines = response.split('\n').filter(line => line.trim());

    for (let line of lines) {
        const parts = line.split('|');
        if (parts.length >= 2) {
            const front = (parts[0] || '').replace(/^Front:/i, '').trim();
            const back = (parts[1] || '').replace(/^Back:/i, '').trim();
            const category = (parts[2] || '').replace(/^Category:/i, '').trim() || 'General';
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
 * @param {string} userAnswer The user's currently selected answer.
 * @returns {Promise<string>} A hint string.
 */
async function getHintForQuestion(question, userAnswer) {
    const prompt = `The student is stuck on this question: ${question}
Their current answer is: ${userAnswer}
Provide a helpful hint without giving away the answer completely. Be encouraging and friendly!`;

    const response = await callGeminiAPI(prompt);
    return response || "Think about the key concepts involved. You've got this!";
}

/**
 * Generates comprehensive study notes from content.
 * @param {string} content The source content.
 * @returns {Promise<string>} The generated notes.
 */
async function generateNotesFromContent(content) {
    const prompt = `Create comprehensive, well-structured study notes from the following content. Include:
- Key concepts and definitions
- Important facts and figures  
- Visual representations (describe charts, graphs, tables, diagrams where helpful)
- Examples and explanations
- Summary points

Content: ${content}

Generate detailed study notes now:`;

    const response = await callGeminiAPI(prompt);
    if (!response) {
        return "Sample Notes:\n\n**Key Concepts:**\n- This is where AI-generated notes would appear\n- Notes are created from your uploaded content\n- They include summaries, key points, and explanations";
    }
    return response;
}

/**
 * Generates a concise summary from content.
 * @param {string} content The source content.
 * @returns {Promise<string>} The generated summary.
 */
async function generateSummaryFromContent(content) {
    const prompt = `Create a concise but comprehensive summary of the following content. Include the main points, key takeaways, and important details. Use clear formatting with bullet points and sections where appropriate.

Content: ${content}

Generate the summary now:`;

    const response = await callGeminiAPI(prompt);
    if (!response) {
        return "Sample Summary:\n\n- This is where the AI-generated summary would appear\n- It provides a concise overview of the content\n- Key points and takeaways are highlighted";
    }
    return response;
}

/**
 * Answers a question based on the uploaded content.
 * @param {string} question The user's question.
 * @param {string} content The uploaded content to reference.
 * @returns {Promise<string>} The answer.
 */
async function answerQuestionFromContent(question, content) {
    const prompt = `Based on the following content, answer this question in detail with explanations, examples, and visual descriptions (charts, graphs, diagrams, tables) where appropriate:

Question: ${question}

Content: ${content}

Provide a comprehensive answer now:`;

    const response = await callGeminiAPI(prompt);
    if (!response) {
        return "I'm sorry, I couldn't generate an answer. Please make sure you have uploaded content and try again.";
    }
    return response;
}
