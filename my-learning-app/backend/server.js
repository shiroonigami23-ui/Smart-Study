const express = require('express');
const fetch = require('node-fetch'); // Use the new fetch library
require('dotenv').config();
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-latest";

app.post('/generate', async (req, res) => {
    try {
        const { topic, type } = req.body;
        let promptText = '';

        if (type === 'notes') {
            promptText = `Generate concise, easy-to-understand study notes on the topic of "${topic}". Use markdown for headings and bullet points.`;
        } else if (type === 'facts') {
            promptText = `Generate 3 surprising and fun facts about "${topic}".`;
        } else if (type === 'quiz') {
            promptText = `Create a 5-question multiple-choice quiz on "${topic}". IMPORTANT: Respond with ONLY a valid JSON array of objects. Do not include any text before or after the JSON array. Each object should have three keys: "question" (string), "options" (an array of 4 strings), and "answer" (a string that exactly matches one of the options).`;
        }

        // --- This is the new direct API call ---
        const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: promptText
                    }]
                }]
            })
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error("Google API Error:", errorData);
            throw new Error(`API request failed with status ${apiResponse.status}`);
        }

        const responseData = await apiResponse.json();
        // The new response structure is different, so we extract the text like this:
        const content = responseData.candidates[0].content.parts[0].text;
        res.json({ content: content });

    } catch (error) {
        console.error("Server Error:", error.message);
        res.status(500).send('Error communicating with the Generative AI API.');
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running. Open http://localhost:${PORT} in your browser.`);
});
