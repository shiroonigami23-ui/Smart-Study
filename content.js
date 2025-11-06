// ===================================
// UPLOAD & CONTENT GENERATION
// ===================================

// file: content.js (Complete Replacement of handleFileUpload)

/**
 * Handles the file upload (drag/drop or browse).
 * CRITICAL CHANGE: Only extracts text and stores it. AI cleanup and editing start when the user clicks 'Convert/Edit'.
 * @param {File} file The file object.
 */
async function handleFileUpload(file) {
    const supportedTypes = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.docx', '.epub'];
    const fileName = file.name.toLowerCase();
    const isSupported = supportedTypes.some(type => fileName.endsWith(type) || file.type.startsWith('image/'));

    if (!isSupported) {
        showToast('Unsupported file type. Please upload PDF, Image, TXT, DOCX, or EPUB files.', 'error');
        return;
    }

    // Show file preview (functions in ui.js)
    const filePreview = document.getElementById('file-preview');
    const fileNameEl = document.getElementById('file-name');
    const fileSizeEl = document.getElementById('file-size');

    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatFileSize(file.size); // from utils.js
    filePreview.classList.remove('hidden');

    showLoading('Processing file...'); // from utils.js

    try {
        // 1. Process File to get raw text (in fileApi.js)
        const rawExtractedText = await processFile(file); 

        // 2. Store the raw extracted version (no AI cleanup yet)
        appState.uploadedContent = rawExtractedText;
        appState.uploadedContentType = file.type;
        appState.isUploadedContentEditable = false; // Flag is set to true only upon manual conversion
        
        // --- File Type Badge Logic ---
        let fileExt = fileName.split('.').pop().toLowerCase();
        
        if (file.type.startsWith('image/')) {
            fileExt = 'image';
        } else if (fileExt === 'document') {
            fileExt = 'docx';
        }

        if (!appState.userProfile.filesUploaded.includes(fileExt)) {
            appState.userProfile.filesUploaded.push(fileExt);
            
            if (appState.userProfile.filesUploaded.length >= 3) {
                checkAndUnlockBadge('file_master'); // from gamification.js
            }
        }
        // -------------------------------------------------

        hideLoading(); // from utils.js
        showToast('File processed successfully! Ready for generation or conversion.', 'success'); // from utils.js
        addRecentActivity('📁', `Uploaded ${file.name} (Raw Text Extracted)`, 'Just now'); // from ui.js
        addXP(20, 'Uploaded study file'); // from gamification.js

        // Save to Firestore (function in firebaseApi.js)
        if (appState.currentUser) {
            saveUserProfileToFirestore();
        }
    } catch (error) {
        hideLoading(); // from utils.js
        console.error('File processing error:', error);
        showToast('Error processing file: ' + error.message, 'error'); // from utils.js
    }
}

// file: content.js (Add new function)

/**
 * Initiates AI cleanup and navigation to the Notes section for editing/conversion.
 */
async function startEditableConversion() {
    if (!appState.uploadedContent) {
        showToast('Please upload a file first.', 'warning');
        return;
    }

    showLoading('AI is cleaning and structuring content for editing...');

    try {
        // 1. Run the AI Cleanup on the RAW uploaded content (in geminiApi.js)
        // We use the raw text content here, not the content from the editor.
        const cleanedText = await cleanAndReformatContent(appState.uploadedContent);
        
        // 2. Set state for editing
        appState.isUploadedContentEditable = true; // Set flag
        appState.generatedNotes = cleanedText; // Use this as the source for display

        // 3. Display the cleaned, editable content (in ui.js)
        displayEditableUpload(cleanedText, appState.uploadedFileName || 'Uploaded_Document.pdf'); 
        
        // 4. Navigate to the Notes view (which now serves as the editor)
        navigateToSection('notes'); 

        hideLoading();
        showToast('Content is now clean, structured, and ready for editing!', 'success');
        addXP(30, 'Prepared content for editing');

    } catch (error) {
        hideLoading();
        console.error('AI Cleanup error:', error);
        showToast('AI cleanup failed. Check console for details.', 'error');
    }
}



/**
 * Initiates AI cleanup and navigation to the Notes section for editing/conversion.
 */
async function startEditableConversion() {
    if (!appState.uploadedContent) {
        showToast('Please upload a file first.', 'warning');
        return;
    }

    showLoading('AI is cleaning and structuring content for editing...');

    try {
        // 1. Run the AI Cleanup on the RAW uploaded content (in geminiApi.js)
        // We use the raw text content here, not the content from the editor.
        const cleanedText = await cleanAndReformatContent(appState.uploadedContent);
        
        // 2. Set state for editing
        appState.isUploadedContentEditable = true; // Set flag
        appState.generatedNotes = cleanedText; // Use this as the source for display

        // 3. Display the cleaned, editable content (in ui.js)
        displayEditableUpload(cleanedText, appState.uploadedFileName || 'Uploaded_Document.pdf'); 
        
        // 4. Navigate to the Notes view (which now serves as the editor)
        navigateToSection('notes'); 

        hideLoading();
        showToast('Content is now clean, structured, and ready for editing!', 'success');
        addXP(30, 'Prepared content for editing');

    } catch (error) {
        hideLoading();
        console.error('AI Cleanup error:', error);
        showToast('AI cleanup failed. Check console for details.', 'error');
    }
}


/**
 * Generates content (quiz, flashcards, notes, summary, paper, project file) based on type.
 * @param {string} type 'quiz', 'flashcards', 'notes', 'summary', 'research_paper', or 'project_file'.
 */
async function generateContent(type) {
    const content = document.getElementById('content-text').value.trim() || appState.uploadedContent;

    if (!content) {
        showToast('Please upload a file or paste some content first', 'warning');
        return;
    }

    // --- CRITICAL FIX: CLEAR EDITABLE FLAG ---
    // Any new AI generation clears the previous editable upload state.
    appState.isUploadedContentEditable = false; 
    // ------------------------------------------

    const subject = document.getElementById('subject-select').value;
    const difficulty = document.getElementById('difficulty-select').value;
    const questionCount = parseInt(document.getElementById('question-count').value, 10) || 5;

    if (type === 'quiz' && (!subject || subject === '')) {
        showToast('Please select a subject for the quiz', 'warning');
        return;
    }
    
    showLoading(`AI is generating your ${type}...`); // from utils.js

    try {
        // All generation functions are in geminiApi.js
        if (type === 'quiz') {
            const quiz = await generateQuizFromContent(content, difficulty, questionCount);
            appState.currentQuiz = {
                questions: quiz,
                currentQuestion: 0,
                answers: [],
                startTime: 0,
                subject: subject || 'General',
                difficulty: difficulty || 'medium'
            };
            hideLoading(); 
            showToast('Quiz generated successfully! Go to Quiz section to start.', 'success'); 
            addRecentActivity('🎯', `Generated ${questionCount}-question quiz`, 'Just now'); 
            navigateToSection('quiz'); 
        } else if (type === 'flashcards') {
            const cardCount = questionCount * 2;
            const flashcards = await generateFlashcardsFromContent(content, cardCount);
            appState.currentFlashcardDeck = {
                cards: flashcards,
                currentCard: 0,
                knownCards: [],
                markedCards: [],
                subject: subject || 'General'
            };
            hideLoading(); 
            showToast(`Flashcards generated successfully! Go to Flashcards section to review ${flashcards.length} cards.`, 'success'); 
            addRecentActivity('🎴', `Generated ${flashcards.length} flashcards`, 'Just now'); 
            navigateToSection('flashcards'); 
        } else if (type === 'notes') {
            const notes = await generateNotesFromContent(content);
            appState.generatedNotes = notes; // Store for export
            appState.userProfile.notesGenerated++;
            checkAndUnlockBadge('first_notes'); // from gamification.js
            hideLoading(); 
            showToast('Notes generated successfully!', 'success'); 
            addRecentActivity('📝', 'Generated study notes', 'Just now'); 
            displayGeneratedNotes(notes); // from ui.js
            navigateToSection('notes'); 
            addXP(50, 'Generated notes'); // from gamification.js
             } else if (type === 'summary') {
            const summary = await generateSummaryFromContent(content);
            appState.generatedSummary = summary; // Store for export
            hideLoading(); 
            showToast('Summary generated successfully! Showing summary.', 'success'); 
            addRecentActivity('📄', 'Generated content summary', 'Just now'); 
            displayGeneratedSummary(summary); // from ui.js (uses modal)
            addXP(30, 'Generated summary'); // from gamification.js
        } else if (type === 'research_paper') { 
            const paper = await generateResearchPaperOutline(content, subject || 'General');
            if (!paper) {
                hideLoading();
                showToast('AI failed to generate a response. Please adjust content and try again.', 'error');
                return;
            }
            appState.generatedResearchPaper = paper; // Store for display/export
            appState.generatedProjectFile = null; // Clear project file state
            hideLoading(); 
            showToast('Research paper outline generated successfully!', 'success'); 
            addRecentActivity('📚', 'Generated research paper outline', 'Just now'); 
            displayGeneratedResearchPaper(paper); // from ui.js
            navigateToSection('notes'); 
            addXP(75, 'Generated research paper outline'); 
        } else if (type === 'project_file') { 
            const projectName = document.getElementById('project-name-input').value.trim() || 'Untitled Project';
            const projectFile = await generateProjectFile(content, subject || 'General', projectName); // New function call
            if (!projectFile) {
                hideLoading();
                showToast('AI failed to generate a response. Please check content and try again.', 'error');
                return;
            }
            appState.generatedResearchPaper = null; // Clear research paper state
            appState.generatedProjectFile = projectFile; // Store the new content
            hideLoading();
            showToast('Project File Outline generated successfully!', 'success');
            addRecentActivity('📁', `Generated project file: ${projectName}`, 'Just now'); 
            displayGeneratedProjectFile(projectFile); // from ui.js
            navigateToSection('notes'); // Display in the Notes section
            addXP(75, 'Generated project file'); 
            attachProjectImageDropListeners();
        }

        // Save to Firestore (function in firebaseApi.js)
        if (appState.currentUser) {
            saveUserProfileToFirestore();
        }
    } catch (error) {
           hideLoading(); 
        console.error("Content generation error:", error);
        showToast('Error generating content. Please try again.', 'error'); 
    }
}


// ===================================
// FILE CONVERSION LOGIC (NEW SECTION)
// ===================================

/**
 * Handles the file conversion process (e.g., PDF to DOCX, TXT to EPUB).
 * @param {string} format The desired output format ('docx', 'epub', 'txt').
 */
async function handleFileConversion(format) {
    const content = appState.uploadedContent;
    const fileName = document.getElementById('file-name')?.textContent || 'Converted_File';

    if (!content) {
        showToast('Please upload a file first to convert its content.', 'warning');
        return;
    }
    
    showLoading(`Converting content to ${format.toUpperCase()}...`);

    try {
        if (format === 'docx') {
            // Use the now-robust (but still limited) DOCX export.
            await exportContentToDOCX(content, `${fileName}_converted`); // in fileApi.js
        } else if (format === 'epub') {
            // This would call a function that wraps the text content in basic EPUB structure.
            // Placeholder: Call a hypothetical function that prepares EPUB structure.
            await exportContentToEPUB(content, `${fileName}_converted`); // in fileApi.js
        } else if (format === 'txt') {
             // Simple TXT export
            await exportContentToTXT(content, `${fileName}_converted`);
        } else if (format === 'png' || format === 'jpeg') { //
            await exportContentToImage(content, `${fileName}_converted`, format);
        } else {
            throw new Error('Unsupported conversion format.');
        }

        hideLoading();
        showToast(`Content successfully converted and downloaded as ${format.toUpperCase()}.`, 'success');
        addXP(25, `Converted content to ${format.toUpperCase()}`);

    } catch (error) {
        hideLoading();
        console.error(`Conversion error to ${format}:`, error);
        showToast(`Conversion failed: ${error.message}.`, 'error');
    }
}


// ===================================
// Q&A FUNCTIONALITY
// ===================================

/**
 * Handles asking a question about the uploaded content.
 */
async function handleAskQuestion() {
    const question = document.getElementById('qa-question').value.trim();

    if (!question) {
        showToast('Please enter a question', 'warning');
        return;
    }

    const content = appState.uploadedContent || document.getElementById('content-text').value.trim();
    if (!content) {
        showToast('Please upload or paste content first', 'warning');
        return;
    }

    showLoading('Getting answer from AI...'); // from utils.js

    try {
        // answerQuestionFromContent is in geminiApi.js
        const answer = await answerQuestionFromContent(question, content);
        appState.qaHistory.push({ question, answer, timestamp: new Date().toISOString() });
        appState.userProfile.questionsAsked++;

        // checkAndUnlockBadge is in gamification.js
        if (appState.userProfile.questionsAsked >= 10) {
            checkAndUnlockBadge('curious_mind');
        }

        hideLoading(); // from utils.js
        addQAToHistory(question, answer); // from ui.js
        document.getElementById('qa-question').value = ''; // Clear input
        addXP(20, 'Asked a question'); // from gamification.js
        addRecentActivity('❓', 'Asked a question', 'Just now'); // from ui.js

        // Save to Firestore (function in firebaseApi.js)
        if (appState.currentUser) {
            saveUserProfileToFirestore();
        }
    } catch (error) {
        hideLoading(); // from utils.js
        console.error('Q&A error:', error);
        showToast('Error getting answer. Please try again.', 'error'); // from utils.js
    }
}
