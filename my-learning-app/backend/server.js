// Inside your app.post('/generate', ...) in server.js

} else if (type === 'quiz') {
    prompt = `Create a 5-question multiple-choice quiz on "${topic}".
    IMPORTANT: Respond with ONLY a valid JSON array of objects. Do not include any text before or after the JSON array.
    Each object in the array should have three keys: "question" (string), "options" (an array of 4 strings), and "answer" (a string that exactly matches one of the options).
    Example format:
    [
        {
            "question": "What is the powerhouse of the cell?",
            "options": ["Nucleus", "Ribosome", "Mitochondrion", "Golgi apparatus"],
            "answer": "Mitochondrion"
        }
    ]`;
}
