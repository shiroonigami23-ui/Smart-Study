const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/generate', async (req, res) => {
    try {
        const { topic, type } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});
        let prompt = '';

        if (type === 'notes') {
            prompt = `Generate concise, easy-to-understand study notes on the topic of "${topic}". Use markdown for headings and bullet points.`;
        } else if (type === 'facts') {
            prompt = `Generate 3 surprising and fun facts about "${topic}".`;
        } else if (type === 'quiz') {
            prompt = `Create a 5-question multiple-choice quiz on "${topic}". IMPORTANT: Respond with ONLY a valid JSON array of objects. Do not include any text before or after the JSON array. Each object should have three keys: "question" (string), "options" (an array of 4 strings), and "answer" (a string that exactly matches one of the options).`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ content: response.text() });

    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).send('Error communicating with the Generative AI API.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
