// In script.js, replace the existing generateContent function with this logic

const topicInput = document.getElementById('topic-input');
const notesBtn = document.getElementById('notes-btn');
const factsBtn = document.getElementById('facts-btn');
const quizBtn = document.getElementById('quiz-btn');
const outputContainer = document.getElementById('output-container');

// ... (keep the event listeners at the bottom)

async function generateContent(type) {
    const topic = topicInput.value;
    if (!topic) {
        alert("Please enter a topic!");
        return;
    }

    outputContainer.innerHTML = '<p>Generating...</p>'; // Loading indicator

    try {
        const response = await fetch('http://localhost:3000/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic, type: type }),
        });

        const data = await response.json();

        // New logic to handle different content types
        if (type === 'quiz') {
            const quizData = JSON.parse(data.content);
            renderQuiz(quizData);
        } else {
            // For now, notes and facts can be simple text
            outputContainer.innerText = data.content;
        }

    } catch (error) {
        console.error('Error:', error);
        outputContainer.innerHTML = '<p>Failed to generate content. The API might have returned an invalid format. Please try again.</p>';
    }
}

let currentQuestionIndex = 0;
let score = 0;
let quizData = []; // To store the current quiz questions

function renderQuiz(data) {
    quizData = data;
    currentQuestionIndex = 0;
    score = 0;
    showQuestion();
}

function showQuestion() {
    if (currentQuestionIndex >= quizData.length) {
        // End of quiz
        outputContainer.innerHTML = `<h2>Quiz Complete!</h2><p>Your final score is: ${score} out of ${quizData.length}</p>`;
        return;
    }

    const questionObj = quizData[currentQuestionIndex];
    let optionsHTML = '';
    questionObj.options.forEach(option => {
        // Note: Using onclick is simple here, but for larger apps, you'd use addEventListener
        optionsHTML += `<button class="option-btn" onclick="checkAnswer('${option}')">${option}</button>`;
    });

    outputContainer.innerHTML = `
        <div class="quiz-question">
            <h3>Question ${currentQuestionIndex + 1} / ${quizData.length}</h3>
            <p>${questionObj.question}</p>
        </div>
        <div class="quiz-options">
            ${optionsHTML}
        </div>
    `;
}

function checkAnswer(selectedOption) {
    const correctAnswser = quizData[currentQuestionIndex].answer;
    if (selectedOption === correctAnswser) {
        score++;
        // You can add visual feedback here (e.g., button turns green)
    } else {
        // You can add feedback for wrong answers (e.g., button turns red)
    }
    
    currentQuestionIndex++;
    showQuestion();
}

// Attach event listeners
notesBtn.addEventListener('click', () => generateContent('notes'));
factsBtn.addEventListener('click', () => generateContent('facts'));
quizBtn.addEventListener('click', () => generateContent('quiz'));
