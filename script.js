document.addEventListener('DOMContentLoaded', () => {
    const topicInput = document.getElementById('topic-input');
    const notesBtn = document.getElementById('notes-btn');
    const factsBtn = document.getElementById('facts-btn');
    const quizBtn = document.getElementById('quiz-btn');
    const outputContainer = document.getElementById('output-container');

    // Function to fetch data from our backend
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic: topic, type: type }),
            });

            const data = await response.json();
            
            // Note: For production, you would want to parse the markdown/JSON properly.
            // For now, we can display the raw text.
            outputContainer.innerText = data.content;

        } catch (error) {
            console.error('Error:', error);
            outputContainer.innerHTML = '<p>Failed to generate content. Please check the console.</p>';
        }
    }

    notesBtn.addEventListener('click', () => generateContent('notes'));
    factsBtn.addEventListener('click', () => generateContent('facts'));
    quizBtn.addEventListener('click', () => generateContent('quiz'));
});
