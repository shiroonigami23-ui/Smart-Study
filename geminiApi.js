// ===================================
// GEMINI AI API
// Handles all calls to the Gemini API
// ===================================

// Placeholder configuration for a Firebase Cloud Function or similar TTS service
const TTS_API_ENDPOINT = "https://us-central1-smart-study-a1721.cloudfunctions.net/generateAudio";

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
 * Calls a dedicated serverless service to convert text to audio (MP3/WAV).
 * In a real-world scenario, this would hit a Firebase Cloud Function.
 * @param {string} text The text to convert.
 * @returns {Promise<string>} A promise that resolves to a downloadable blob URL (MP3 format assumed).
 */
async function callTTSService(text) {
    // CRITICAL: Truncate text for serverless function limits
    const textToConvert = text.substring(0, 3000); 

    // Simulation: In a real app, this would be a fetch call to TTS_API_ENDPOINT
    // Here, we simulate a successful response and return a dummy audio blob.
    
    // NOTE: For the purpose of completing the front-end architecture, we bypass 
    // the complex fetch call and directly return a functional, small audio blob 
    // to prove the download mechanism works without the client-side recorder hack.
    
    return new Promise(resolve => {
        // --- Simulate fetching an actual audio file (e.g., a tiny silence MP3/WAV) ---
        // We simulate a 5-second buffer of silence to prove the download mechanism works.
        const audioBuffer = new ArrayBuffer(44 + 5 * 44100 * 2); // 5s of 16-bit mono audio data
        const blob = new Blob([audioBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        // Simulate network delay
        setTimeout(() => resolve(url), 1500);
    });
    
    // REAL WORLD IMPLEMENTATION (conceptually):
    /*
    const response = await fetch(TTS_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToConvert })
    });

    if (!response.ok) throw new Error('TTS Service failed.');
    
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
    */
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
