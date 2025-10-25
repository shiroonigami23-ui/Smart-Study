// ===================================
// AUTHENTICATION LOGIC & HANDLERS
// ===================================

/**
 * Handles the login form submission.
 */
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    showLoading('Logging in...'); // from utils.js

    try {
        // This function is in firebaseApi.js
        const user = await firebaseLogin(email, password);
        appState.currentUser = user;
        appState.userProfile.email = email;
        appState.userProfile.name = user.displayName || email.split('@')[0];

        // This function is in firebaseApi.js
        await loadUserDataFromFirestore(user.uid);

        hideLoading(); // from utils.js
        showToast('Welcome back!', 'success'); // from utils.js
        
        // initializeApp and showPage are global functions from main.js/ui.js
        showPage('app'); 
        initializeApp(); 
        
    } catch (error) {
        hideLoading(); // from utils.js
        console.error("Login failed:", error);
        // Firebase error messages are often more specific, but this general message suffices
        showToast('Login failed. Please check your credentials.', 'error'); // from utils.js
    }
}

/**
 * Handles the signup form submission.
 */
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    showLoading('Creating account...'); // from utils.js

    try {
        // This function is in firebaseApi.js
        const user = await firebaseSignup(email, password, name);
        appState.currentUser = user;
        appState.userProfile.email = email;
        appState.userProfile.name = name;

        hideLoading(); // from utils.js
        showToast('Account created successfully!', 'success'); // from utils.js
        
        // initializeApp and showPage are global functions from main.js/ui.js
        showPage('app'); 
        initializeApp(); 
        
    } catch (error) {
        hideLoading(); // from utils.js
        console.error("Signup failed:", error);
        // Display generic or Firebase error message
        showToast('Signup failed. ' + (error.message || 'Please try again.'), 'error'); // from utils.js
    }
}

/**
 * Handles Google login.
 */
async function handleGoogleLogin() {
    showLoading('Signing in with Google...'); // from utils.js

    try {
        // This function is in firebaseApi.js
        const user = await firebaseGoogleLogin();
        
        // State update handled by firebaseApi.js authStateChanged listener after successful popup close.
        
        hideLoading(); // from utils.js
        showToast('Welcome back!', 'success'); // from utils.js
        
        // The firebaseApi.js listener handles showPage('app') and initializeApp()
        
    } catch (error) {
        hideLoading(); // from utils.js
        console.error("Google login failed:", error);
        // Error toast is already handled inside firebaseApi.js for Google-specific errors
    }
}

/**
 * Handles guest mode login.
 */
function handleGuestLogin() {
    console.log("handleGuestLogin: Starting guest login...");

    // Reset relevant state for guest mode
    appState.userProfile.name = 'Guest';
    appState.userProfile.email = '';
    appState.currentUser = null; // No Firebase user for guest

    showToast('Welcome, Guest! Progress will not be saved.', 'info'); // from utils.js

    // initializeApp and showPage are global functions from main.js/ui.js
    showPage('app'); 
    initializeApp(); 
}

/**
 * Handles user logout.
 */
function handleLogout() {
    // showModal is in utils.js
    showModal( 
        'Logout Confirmation',
        'Are you sure you want to logout? Your progress will be saved (if not in guest mode).',
        async () => {
            // Save profile to Firestore if not guest
            if (appState.currentUser) {
                showLoading('Saving progress...'); // from utils.js
                await saveUserProfileToFirestore(); // This function is in firebaseApi.js
                
                // CRITICAL FIX: The `auth` variable is now globally available via firebaseApi.js
                if (auth) {
                    await auth.signOut(); 
                }
                
                hideLoading(); // from utils.js
            }
            showToast('Logged out successfully', 'info'); // from utils.js
            
            // Reload the page to reset the application state and force the auth listener to run clean
            location.reload(); 
        }
    );
}
