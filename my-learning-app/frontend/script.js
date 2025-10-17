document.addEventListener('DOMContentLoaded', () => {
    // Get references to all the HTML elements we need
    const topicInput = document.getElementById('topic-input');
    const notesBtn = document.getElementById('notes-btn');
    const factsBtn = document.getElementById('facts-btn');
    const quizBtn = document.getElementById('quiz-btn');
    const outputContainer = document.getElementById('output-container');

    /**
     * The main function to fetch content from our backend server.
     * @param {string} type - The type of content to generate ('notes', 'facts', 'quiz').
     */
    async function generateContent(type) {
        const topic = topicInput.value;
        if (!topic) {
            alert("Please enter a topic first!");
            return;
        }

        outputContainer.innerHTML = '<p>🧠 Generating content... Please wait.</p>'; // Show a loading message

        try {
            // Send a request to our local backend server
            const response = await fetch('http://localhost:3000/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic: topic, type: type }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Handle different content types
            if (type === 'quiz') {
                // Try to parse the content as JSON for the quiz
                try {
                    const quizData = JSON.parse(data.content);
                    renderQuiz(quizData);
                } catch (e) {
                    outputContainer.innerText = "Failed to parse the quiz data. The API might have returned an invalid format.\n\n" + data.content;
                }
            } else {
                // For notes and facts, just display the text
                outputContainer.innerText = data.content;
            }

        } catch (error) {
            console.error('Error:', error);
            outputContainer.innerHTML = `<p style="color: red;">Failed to generate content. Is the backend server running in Termux?</p>`;
        }
    }

    // --- Quiz Logic ---
    let currentQuestionIndex = 0;
    let score = 0;
    let quizData = [];

    function renderQuiz(data) {
        quizData = data;
        currentQuestionIndex = 0;
        score = 0;
        showQuestion();
    }

    function showQuestion() {
        if (currentQuestionIndex >= quizData.length) {
            outputContainer.innerHTML = `<h2>Quiz Complete!</h2><p>Your final score is: ${score} out of ${quizData.length}</p>`;
            return;
        }

        const questionObj = quizData[currentQuestionIndex];
        let optionsHTML = '';
        questionObj.options.forEach(option => {
            // We need to escape single quotes in the option text to prevent HTML errors
            const escapedOption = option.replace(/'/g, "\\'");
            optionsHTML += `<button class="option-btn" onclick="checkAnswer('${escapedOption}')">${option}</button>`;
        });

        outputContainer.innerHTML = `
            <div class="quiz-question">
                <h3>Question ${currentQuestionIndex + 1}/${quizData.length}</h3>
                <p>${questionObj.question}</p>
            </div>
            <div class="quiz-options">${optionsHTML}</div>
        `;
    }

    // Make checkAnswer globally accessible for the onclick attribute
    window.checkAnswer = function(selectedOption) {
        const correctAnswser = quizData[currentQuestionIndex].answer;
        if (selectedOption === correctAnswser) {
            score++;
        }
        currentQuestionIndex++;
        showQuestion();
    }

    // Attach the generateContent function to each button's click event
    notesBtn.addEventListener('click', () => generateContent('notes'));
    factsBtn.addEventListener('click', () => generateContent('facts'));
    quizBtn.addEventListener('click', () => generateContent('quiz'));
});
