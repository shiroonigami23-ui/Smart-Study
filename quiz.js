// ===================================
// QUIZ LOGIC
// ===================================

// Global variable for the quiz timer, declared here as per original structure
let quizTimer = null;

/**
 * Uses sample quiz data from config.js and starts the session.
 */
function useSampleQuiz() {
    // SAMPLE_QUIZ is from config.js
    const sampleQuiz = SAMPLE_QUIZ.map(q => ({
        ...q,
        // Add difficulty for consistency, as per the config structure
        difficulty: q.difficulty || 'medium' 
    }));

    appState.currentQuiz = {
        questions: sampleQuiz,
        currentQuestion: 0,
        answers: [],
        startTime: Date.now(),
        subject: 'Sample Quiz'
    };
    showToast('Loaded sample quiz! Starting now.', 'info'); // in utils.js
    startQuiz(); 
}

/**
 * Starts the quiz.
 */
function startQuiz() {
    if (!appState.currentQuiz || appState.currentQuiz.questions.length === 0) {
        showToast('Please generate or load a quiz first from the Upload section', 'warning'); // in utils.js
        return;
    }

    showQuizView('quiz-taking'); // in ui.js
    appState.currentQuiz.currentQuestion = 0;
    appState.currentQuiz.answers = [];
    appState.currentQuiz.startTime = Date.now();

    const enableTimer = document.getElementById('enable-timer')?.checked;

    if (enableTimer) {
        if (quizTimer) clearInterval(quizTimer);
        // startQuizTimerUI is in ui.js, 300 seconds = 5 minutes
        quizTimer = startQuizTimerUI(300, finishQuiz); 
    } else {
        document.getElementById('quiz-timer')?.classList.add('hidden');
    }

    displayQuestion(); // in ui.js
    checkStudyTimeBadges(); // in gamification.js
}

/**
 * Submits the selected answer for the current question.
 */
function submitAnswer() {
    const quiz = appState.currentQuiz;
    if (!quiz || document.getElementById('explanation-card')?.classList.contains('active')) return;

    const question = quiz.questions[quiz.currentQuestion];
    const selected = document.querySelector('.option.selected');

    if (!selected) {
        showToast('Please select an answer before submitting', 'warning'); // in utils.js
        // Optional: Add a shake animation to the question card
        document.querySelector('.question-card')?.animate([{ transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }], { duration: 200, iterations: 1 });
        return;
    }

    const userAnswerIndex = parseInt(selected.dataset.index, 10);
    const isCorrect = userAnswerIndex === question.correct;

    // Check if question has already been answered (to prevent double submission)
    if (quiz.answers.some(a => a.questionIndex === quiz.currentQuestion)) return;

    quiz.answers.push({
        questionIndex: quiz.currentQuestion,
        userAnswer: userAnswerIndex,
        correct: isCorrect,
        skipped: false
    });

    showExplanation(isCorrect); // in ui.js
    
    // Provide audio feedback
    if (appState.userProfile.settings.voiceEnabled) {
        const feedback = isCorrect ? 'Correct! Well done.' : 'Incorrect. Check the explanation.';
        speak(feedback); // in utils.js
    }

    // Disable submit/skip buttons after submission
    document.getElementById('submit-answer-btn').disabled = true;
    document.getElementById('skip-btn').disabled = true;
}

/**
 * Skips the current question.
 */
function skipQuestion() {
    const quiz = appState.currentQuiz;
    if (!quiz || document.getElementById('explanation-card')?.classList.contains('active')) return;
    
    // Check if question has already been answered
    if (quiz.answers.some(a => a.questionIndex === quiz.currentQuestion)) return;

    appState.currentQuiz.answers.push({ 
        questionIndex: quiz.currentQuestion,
        correct: false, 
        skipped: true 
    });
    showToast('Question skipped.', 'info'); // in utils.js
    nextQuestion();
}

/**
 * Moves to the next question or finishes the quiz.
 */
function nextQuestion() {
    const quiz = appState.currentQuiz;
    
    // Re-enable control buttons
    document.getElementById('submit-answer-btn').disabled = false;
    document.getElementById('skip-btn').disabled = false;
    
    // Cancel any ongoing speech
    if (window.speechSynthesis) window.speechSynthesis.cancel(); 

    quiz.currentQuestion++;

    if (quiz.currentQuestion >= quiz.questions.length) {
        finishQuiz();
    } else {
        displayQuestion(); // in ui.js
    }
}

/**
 * Finishes the quiz, calculates score, and updates stats.
 */
function finishQuiz() {
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }

    const quiz = appState.currentQuiz;
    if (!quiz) return;

    const correctAnswers = quiz.answers.filter(a => a.correct).length;
    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100) || 0;
    const timeTaken = Math.floor((Date.now() - quiz.startTime) / 1000);

    // Calculate XP
    let xpEarned = 50 + (correctAnswers * 10);
    if (percentage === 100) {
        xpEarned += 100;
        checkAndUnlockBadge('perfect_score'); // in gamification.js
    }

    // Update stats
    appState.userProfile.quizzesCompleted++;
    appState.userProfile.studyTime += timeTaken;
    
    // Save to history
    appState.quizHistory.push({
        subject: quiz.subject,
        score: correctAnswers,
        total: totalQuestions,
        percentage: percentage,
        timeTaken: timeTaken,
        date: new Date().toISOString()
    });

    // Check badges
    if (appState.userProfile.quizzesCompleted === 1) {
        checkAndUnlockBadge('first_steps'); // in gamification.js
    }
    if (appState.userProfile.quizzesCompleted >= 50) {
        checkAndUnlockBadge('knowledge_seeker'); // in gamification.js
    }

    addXP(xpEarned, 'Quiz completion'); // in gamification.js
    displayQuizResults(); // in ui.js
    
    if (appState.userProfile.settings.voiceEnabled) {
        speak(`Quiz complete! You scored ${percentage} percent.`); // in utils.js
    }
    
    addRecentActivity('🎯', `Completed ${quiz.subject} quiz - ${percentage}%`, 'Just now'); // in ui.js

    // Save to Firestore
    if (appState.currentUser) {
        saveUserProfileToFirestore(); // in firebaseApi.js
    }
}

// ===================================
// QUIZ VOICE/HINT LOGIC
// ===================================

/**
 * Reads the current question text aloud.
 */
function speakQuestion() {
    const quiz = appState.currentQuiz;
    if (!quiz || quiz.currentQuestion >= quiz.questions.length) return;
    
    const questionText = quiz.questions[quiz.currentQuestion].question;
    const optionsText = quiz.questions[quiz.currentQuestion].options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`).join('. ');
    
    speak(`${questionText}. The options are: ${optionsText}`); // in utils.js
}

/**
 * Initiates voice recognition for answering the current question.
 */
function voiceAnswer() {
    const question = appState.currentQuiz?.questions[appState.currentQuiz.currentQuestion];
    if (!question) return;

    // startVoiceRecognition is in utils.js
    startVoiceRecognition((transcript) => {
        const options = question.options;
        const lowerTranscript = transcript.toLowerCase();
        
        let bestMatchIndex = -1;

        // 1. Check for A, B, C, D
        const matchLetter = lowerTranscript.match(/^(a|b|c|d)\.?$/);
        if (matchLetter) {
            bestMatchIndex = matchLetter[1].toUpperCase().charCodeAt(0) - 65;
        }

        // 2. Simple text match
        if (bestMatchIndex === -1) {
             bestMatchIndex = options.findIndex(option => 
                lowerTranscript.includes(option.toLowerCase())
            );
        }

        // 3. Select the best match UI
        if (bestMatchIndex !== -1 && bestMatchIndex < options.length) {
            const optionsElements = document.querySelectorAll('.option');
            if (optionsElements[bestMatchIndex]) {
                // Manually trigger the selection and then submission
                selectOption(optionsElements[bestMatchIndex]); // in ui.js
                showToast(`Answer recognized as option ${String.fromCharCode(65 + bestMatchIndex)}`, 'success'); // in utils.js
                submitAnswer(); 
                return;
            }
        }
        
        showToast(`Could not recognize a valid answer from "${transcript}". Please try again.`, 'error'); // in utils.js
    });
}

/**
 * Fetches and displays a hint for the current question.
 */
async function handleHint() {
    const quiz = appState.currentQuiz;
    if (!quiz || quiz.currentQuestion >= quiz.questions.length) return;
    
    const question = quiz.questions[quiz.currentQuestion].question;
    const selected = document.querySelector('.option.selected');
    const userAnswerText = selected ? selected.textContent : 'No answer selected.';

    showLoading('Fetching AI hint...'); // in utils.js
    
    try {
        // getHintForQuestion is in geminiApi.js
        const hint = await getHintForQuestion(question, userAnswerText); 
        
        hideLoading(); // in utils.js
        showToast(hint, 'info'); // in utils.js
        
        if (appState.userProfile.settings.voiceEnabled) {
            speak(hint); // in utils.js
        }
    } catch (error) {
        hideLoading(); // in utils.js
        console.error('Hint error:', error);
        showToast('Sorry, the AI could not generate a hint right now.', 'error'); // in utils.js
    }
}

/**
 * Handles global keyboard shortcuts during quiz taking.
 * @param {KeyboardEvent} e 
 */
function handleGlobalKeydown(e) {
    // Only run if we are in the quiz-taking view
    if (document.getElementById('quiz-taking')?.classList.contains('active')) {
        const key = e.key.toLowerCase();
        
        if (key === 'enter') {
            e.preventDefault();
            const nextBtn = document.getElementById('next-question-btn');
            const submitBtn = document.getElementById('submit-answer-btn');

            if (nextBtn && !nextBtn.disabled && !nextBtn.classList.contains('hidden')) {
                nextQuestion();
            } else if (submitBtn && !submitBtn.disabled) {
                submitAnswer();
            }
        } else if (['a', 'b', 'c', 'd'].includes(key)) {
            e.preventDefault();
            if (document.getElementById('submit-answer-btn')?.disabled) return;
            
            const index = key.charCodeAt(0) - 97; // a=0, b=1, c=2, d=3
            const optionElements = document.querySelectorAll('.options-container .option');
            
            if (optionElements[index]) {
                selectOption(optionElements[index]); // in ui.js
            }
        } else if (key === ' ' && !document.getElementById('next-question-btn')?.disabled) {
            // Spacebar can skip or move next
            e.preventDefault();
            const nextBtn = document.getElementById('next-question-btn');
            if (nextBtn && !nextBtn.classList.contains('hidden')) {
                nextQuestion();
            } else {
                skipQuestion();
            }
        }
    }
}
