// ===================================
// FIREBASE API (v8 Compat Syntax)
// Handles Auth and Firestore
// ===================================

// CRITICAL FIX: These variables must be globally exposed to the application 
// for modules like auth.js and main.js to perform sign-out and saving.
let app;
let auth;
let db;

/**
 * Helper to get Firestore's server timestamp object safely.
 * @returns {object} Firestore FieldValue.serverTimestamp()
 */
function getServerTimestamp() {
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
        return firebase.firestore.FieldValue.serverTimestamp();
    }
    // Fallback or safety warning
    console.error("Firebase FireStore FieldValue not available for server timestamp.");
    return new Date(); 
}

/**
 * Initializes the Firebase app and services.
 * @returns {object} An object containing the auth and db instances.
 */
function initializeFirebase() {
    try {
        if (!firebase || typeof firebase.initializeApp !== 'function') {
            throw new Error("Firebase SDK not loaded correctly. Check script tags in index.html.");
        }
        
        // Ensure initialization only happens once
        if (app) {
            console.log("Firebase already initialized.");
            return { app, auth, db };
        }

        // FIREBASE_CONFIG is from config.js
        app = firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();

        console.log("Firebase initialized successfully (v8 Compat).");

        let isInitialLoad = true; 
        
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("User logged in or restored:", user.uid);
                appState.currentUser = user;
                appState.userProfile.email = user.email;
                appState.userProfile.name = user.displayName || user.email.split('@')[0];

                await loadUserDataFromFirestore(user.uid);

                if (isInitialLoad || !document.getElementById('app-page')?.classList.contains('active')) {
                    showPage('app'); // from ui.js
                    initializeApp(); // from main.js
                }
                isInitialLoad = false;
            } else if (appState.currentUser !== null || isInitialLoad) {
                console.log("User signed out or no active user found.");
                appState.currentUser = null;
                appState.userProfile.name = 'Guest';
                 if (!isInitialLoad) {
                    showPage('auth'); // from ui.js
                 }
                 isInitialLoad = false;
            } else {
                isInitialLoad = false;
            }
        });

        return { app, auth, db };
    } catch (error) {
        console.error("Firebase initialization error:", error);
        if (typeof showToast === 'function') {
            showToast(`Error connecting to services: ${error.message}`, "error");
        } else {
            alert(`Error connecting to services: ${error.message}`);
        }
        auth = null;
        db = null;
        return { auth: null, db: null };
    }
}

// ===================================
// FIREBASE AUTH FUNCTIONS
// ===================================

/**
 * Logs in a user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise} Firebase User object
 */
async function firebaseLogin(email, password) {
    if (!auth) throw new Error("Firebase Auth not initialized.");
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return userCredential.user;
}

/**
 * Creates a new user profile object.
 * @param {string} uid
 * @param {string} name
 * @param {string} email
 * @returns {object} A new user profile object.
 */
function createNewUserProfile(uid, name, email) {
    return {
        uid: uid,
        name: name,
        email: email,
        avatarUrl: "",
        xp: 0,
        level: 1,
        streak: 0,
        // CRITICAL FIX: Use getServerTimestamp() helper
        createdAt: getServerTimestamp(), 
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
    };
}

/**
 * Signs up a new user and creates a profile in Firestore.
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {Promise} Firebase User object
 */
async function firebaseSignup(email, password, name) {
    if (!auth || !db) throw new Error("Firebase Auth or Firestore not initialized.");
    
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: name });

    const userDocRef = db.collection('users').doc(userCredential.user.uid);
    const newUserProfile = createNewUserProfile(userCredential.user.uid, name, email);
    
    await userDocRef.set(newUserProfile);
    
    return userCredential.user;
}

/**
 * Initiates Google Sign-in and creates a Firestore profile if new.
 * @returns {Promise} Firebase User object
 */
async function firebaseGoogleLogin() {
    if (!auth || !db) throw new Error("Firebase Auth or Firestore not initialized.");

    const provider = new firebase.auth.GoogleAuthProvider();

    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;

        const userDocRef = db.collection('users').doc(user.uid);
        const docSnap = await userDocRef.get();

        if (!docSnap.exists) {
            console.log(`Creating Firestore profile for new Google user: ${user.uid}`);
            const newUserProfile = createNewUserProfile(user.uid, user.displayName, user.email);
            await userDocRef.set(newUserProfile);
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
        }
        throw error;
    }
}

// ===================================
// FIREBASE FIRESTORE FUNCTIONS
// ===================================

/**
 * Saves data to a specific document in Firestore.
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
        const docRef = db.collection(collectionPath).doc(docId);
        await docRef.set(data, { merge: true }); 
        console.log("Data saved to Firestore successfully");
    } catch (error) {
        console.error('Firestore save error:', error);
        if (typeof showToast === 'function') showToast("Error saving progress.", "error");
    }
}

/**
 * Loads a document from Firestore.
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
        appState.userProfile.name = userData.name || "User";
        appState.userProfile.email = userData.email || "";
        appState.userProfile.avatarUrl = userData.avatarUrl || ""; 
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
        appState.userProfile.settings = {
            ...appState.userProfile.settings, 
            ...userData.settings
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
        avatarUrl: appState.userProfile.avatarUrl,
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
        // CRITICAL FIX: Use getServerTimestamp() helper
        lastUpdated: getServerTimestamp()
    };

    await saveToFirestore('users', appState.currentUser.uid, profileData);
}

/**
 * Saves a quiz session for sharing and returns a unique ID.
 * The session includes questions and the option to submit answers.
 * @param {object} quizSession The quiz object to save (questions, subject, difficulty).
 * @returns {Promise<string>} The unique ID (document ID) for the shared quiz.
 */
async function saveSharableQuiz(quizSession) {
    if (!db) throw new Error("Firestore not initialized.");

    try {
        const sharableData = {
            subject: quizSession.subject,
            difficulty: quizSession.difficulty,
            questions: quizSession.questions,
            createdAt: getServerTimestamp(),
            // Ensure no user-specific answers are saved, only the quiz template
        };

        const docRef = await db.collection('sharedQuizzes').add(sharableData);
        console.log("Sharable quiz saved with ID:", docRef.id);
        return docRef.id;

    } catch (error) {
        console.error('Error saving sharable quiz:', error);
        throw new Error('Failed to create sharable quiz link.');
    }
}
