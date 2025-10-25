// ===================================
// FLASHCARDS LOGIC
// ===================================

/**
 * Starts a flashcard review session.
 * @param {boolean} useCurrentDeck If true, uses the existing deck, otherwise resets state.
 */
function startFlashcards(useCurrentDeck = true) {
    if (!appState.currentFlashcardDeck) {
        showToast('Please generate flashcards first from the Upload section', 'warning');
        return;
    }

    showFlashcardView('flashcards-studying'); // in ui.js
    
    // Only reset counters if we are starting a fresh session, not just restarting
    if (!useCurrentDeck) {
        appState.currentFlashcardDeck.currentCard = 0;
        appState.currentFlashcardDeck.knownCards = [];
        appState.currentFlashcardDeck.markedCards = [];
    }
    
    displayFlashcard(); // in ui.js
    checkStudyTimeBadges(); // in gamification.js
}

/**
 * Uses sample flashcards and starts the session.
 */
function useSampleFlashcards() {
    appState.currentFlashcardDeck = {
        cards: SAMPLE_FLASHCARDS, // From config.js
        currentCard: 0,
        knownCards: [],
        markedCards: [],
        subject: 'Sample Deck'
    };
    showToast('Loaded sample flashcards!', 'info');
    startFlashcards(false);
}

/**
 * Toggles the flip state of the card.
 */
function flipFlashcard() {
    document.getElementById('flashcard')?.classList.toggle('flipped');
}

/**
 * Reads the front content of the current card.
 */
function speakCard() {
    const deck = appState.currentFlashcardDeck;
    if (!deck || deck.currentCard >= deck.cards.length) return;
    const text = deck.cards[deck.currentCard].front;
    speak(text); // in utils.js
}

/**
 * Shuffles the remaining cards in the deck.
 */
function shuffleCards() {
    const deck = appState.currentFlashcardDeck;
    const currentCard = deck.cards[deck.currentCard]; // Keep current card on top
    const remainingCards = deck.cards.slice(deck.currentCard + 1);

    // Simple Fisher-Yates shuffle
    for (let i = remainingCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingCards[i], remainingCards[j]] = [remainingCards[j], remainingCards[i]];
    }

    // Reassemble the deck with shuffled remaining cards
    deck.cards = [
        ...deck.cards.slice(0, deck.currentCard), 
        currentCard, 
        ...remainingCards
    ];
    showToast('Cards shuffled!', 'info');
}

/**
 * Marks the current card as known and moves next.
 */
function markAsKnown() {
    const deck = appState.currentFlashcardDeck;
    const cardIndex = deck.currentCard;

    // Fix: Only add to knownCards if it's not already marked known
    if (!deck.knownCards.includes(cardIndex)) {
        deck.knownCards.push(cardIndex);
        appState.userProfile.flashcardsReviewed++; // Increment correct counter
        addXP(5, 'Reviewed flashcard'); // in gamification.js
    }

    // Remove from marked list if it was there
    deck.markedCards = deck.markedCards.filter(index => index !== cardIndex);

    nextFlashcard();
    
    // Save to Firestore
    if (appState.currentUser) {
        saveUserProfileToFirestore(); // in firebaseApi.js
    }
}

/**
 * Marks the current card as unknown (or just moves next) and increments review count.
 */
function markAsUnknown() {
    const deck = appState.currentFlashcardDeck;
    
    // Even if marked unknown, it counts as reviewed for total stats
    appState.userProfile.flashcardsReviewed++; // Increment correct counter
    
    // If it's a known card that the user now says they don't know, remove from known list
    deck.knownCards = deck.knownCards.filter(index => index !== deck.currentCard);

    // If it's not marked, add it to the marked list for later review
    if (!deck.markedCards.includes(deck.currentCard)) {
        deck.markedCards.push(deck.currentCard);
    }

    nextFlashcard();

    // Save to Firestore
    if (appState.currentUser) {
        saveUserProfileToFirestore(); // in firebaseApi.js
    }
}

/**
 * Toggles the star/marked for review state.
 */
function toggleMarkReview() {
    const deck = appState.currentFlashcardDeck;
    const cardIndex = deck.currentCard;
    const indexInMarked = deck.markedCards.indexOf(cardIndex);

    if (indexInMarked > -1) {
        // Remove mark
        deck.markedCards.splice(indexInMarked, 1);
        showToast('Removed from review list', 'info');
    } else {
        // Add mark
        deck.markedCards.push(cardIndex);
        showToast('Marked for review', 'info');
    }

    // Update UI progress
    updateFlashcardProgress(); // in ui.js

    // Save to Firestore
    if (appState.currentUser) {
        saveUserProfileToFirestore(); // in firebaseApi.js
    }
}

/**
 * Moves to the next flashcard or finishes the session.
 */
function nextFlashcard() {
    const deck = appState.currentFlashcardDeck;
    deck.currentCard++;

    if (deck.currentCard >= deck.cards.length) {
        finishFlashcards();
    } else {
        displayFlashcard(); // in ui.js
    }
}

/**
 * Finishes the flashcard session and updates stats.
 */
function finishFlashcards() {
    const deck = appState.currentFlashcardDeck;
    const xpEarned = deck.cards.length * 10;
    
    // Estimate 5 seconds per card for study time
    const timeTaken = deck.cards.length * 5; 

    appState.userProfile.studyTime += timeTaken;
    
    // Note: The total flashcardsReviewed is now incremented in markAsKnown/markAsUnknown clicks.

    if (appState.userProfile.flashcardsReviewed >= 500) {
        checkAndUnlockBadge('flashcard_master'); // in gamification.js
    }

    addXP(xpEarned, 'Flashcard review'); // in gamification.js
    displayFlashcardResults(); // in ui.js
    speak('Flashcard review complete! Great work!'); // in utils.js
    addRecentActivity('🎴', `Reviewed ${deck.cards.length} flashcards`, 'Just now'); // in ui.js

    // Save to Firestore
    if (appState.currentUser) {
        saveUserProfileToFirestore(); // in firebaseApi.js
    }
}

/**
 * Reviews only marked flashcards.
 */
function reviewMarkedFlashcards() {
    const deck = appState.currentFlashcardDeck;

    if (deck.markedCards.length === 0) {
        showToast('No cards marked for review', 'info');
        return;
    }
    
    // CRITICAL FIX: The new deck must contain the actual card objects, not just indices.
    const markedCards = deck.markedCards.map(index => deck.cards[index]);

    const markedDeck = {
        cards: markedCards,
        currentCard: 0,
        knownCards: [],
        markedCards: [], // Clear marked list for the new sub-deck
        subject: `${deck.subject} (Marked)`
    };

    appState.currentFlashcardDeck = markedDeck;
    // We pass true here to start with the new deck without resetting global deck
    startFlashcards(true); 
}
