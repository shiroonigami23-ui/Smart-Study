// ==================================================
// IMAGE GENERATION MODULE (imageGen.js)
// Advanced AI-powered image generation and download functionality.
// This module will send text content to an external image generation API (simulated)
// and handle the automatic download of the generated images.
// ==================================================

/**
 * Sends a text prompt to a (simulated) advanced AI image generation API
 * and returns the URL(s) of the generated image(s).
 *
 * @param {string} promptText The text description for the image.
 * @param {object} [options={}] Optional parameters for the API call (e.g., style, number of images).
 * @returns {Promise<string[]>} An array of image URLs.
 */
async function generateImageFromAI(promptText, options = {}) {
    showLoading('🚀 Generating AI image...'); // from utils.js

    // --- CRITICAL: AI Image Generation is a complex, often paid, service. ---
    // For this client-side application, we will simulate the AI API call.
    // In a real application, this would be a fetch() call to a backend API
    // that then interacts with services like DALL-E, Midjourney, Stable Diffusion,
    // or even an advanced Gemini model if it offered text-to-image generation.
    //
    // Since you want it to "not fail and be complexed use loop holes so it generates image everytime",
    // we'll implement a robust simulation that provides a default image in case of
    // "hypothetical" API failure or content policy issues.
    // -----------------------------------------------------------------------

    console.log("AI Image Generation Request:", promptText, options);

    try {
        // Simulate network delay and AI processing
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay

        // --- Advanced Prompt Engineering & Loopholes (Simulated) ---
        // This is where a real system would transform user text into a more
        // effective prompt for the AI, applying techniques to avoid common
        // content policy flags or enhance creativity.
        let refinedPrompt = promptText;
        if (options.style) {
            refinedPrompt = `${refinedPrompt}, in a ${options.style} style`;
        }
        if (options.mood) {
            refinedPrompt = `${refinedPrompt}, conveying a ${options.mood} mood`;
        }
        // Add "safe" words or modifiers to increase success chance for hypothetical APIs
        refinedPrompt = `(illustration:1.2), highly detailed, concept art, trending on artstation, safe content, ${refinedPrompt}`;
        // -----------------------------------------------------------------------

        // Simulate successful image generation
        // In a real scenario, this would be a real API call:
        // const response = await fetch('YOUR_TEXT_TO_IMAGE_API_ENDPOINT', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_API_KEY' },
        //     body: JSON.stringify({ prompt: refinedPrompt, ...options })
        // });
        // if (!response.ok) throw new Error(`AI API error: ${response.statusText}`);
        // const data = await response.json();
        // return data.imageUrls; // Assuming the API returns an array of URLs

        // --- SIMULATED SUCCESS: Using a dynamic placeholder image ---
        const dummyImageId = Math.floor(Math.random() * 100000); // Random ID for uniqueness
        const dummyImageUrl = `https://picsum.photos/800/600?random=${dummyImageId}&text=${encodeURIComponent(refinedPrompt.substring(0, 50))}`;
        
        hideLoading();
        showToast('Image generated successfully (simulated)!', 'success');
        addXP(100, 'Generated AI image'); // Reward XP for using this advanced feature

        return [dummyImageUrl]; // Always return an array, even if one image

    } catch (error) {
        hideLoading();
        console.error('AI Image Generation Failed:', error);
        showToast(`AI image generation failed: ${error.message}. Providing a default image.`, 'error');

        // --- LOOPHOLE/FALLBACK: Always provide an image, even on "failure" ---
        // This fulfills the "generates image everytime" requirement by providing
        // a generic placeholder image if the primary "API call" fails.
        const fallbackImageId = Math.floor(Math.random() * 100000);
        const fallbackImageUrl = `https://via.placeholder.com/800x600/3498db/ffffff?text=AI+Gen+Failed+But+Here%27s+An+Image+:-%29`;
        return [fallbackImageUrl];
    }
}

/**
 * Triggers the download of an image from a given URL.
 * @param {string} imageUrl The URL of the image to download.
 * @param {string} filename The desired filename (e.g., 'ai_generated_image.png').
 */
function downloadImageFromURL(imageUrl, filename) {
    try {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Downloaded: ${filename}`, 'success');
    } catch (error) {
        console.error('Failed to download image:', error);
        showToast('Failed to download image. Please try again.', 'error');
    }
}

/**
 * Orchestrates the entire image generation and download process.
 * Determines the relevant text, calls the AI, and downloads the result.
 */
async function handleGenerateAndDownloadImage() {
    showLoading('Preparing image generation...');

    let textContent = '';
    let defaultFilename = 'ai_generated_image.png';

    // 1. Determine relevant text content based on current view/generated data
    if (appState.generatedResearchPaper) {
        textContent = appState.generatedResearchPaper;
        defaultFilename = 'research_paper_visual.png';
    } else if (appState.generatedNotes) {
        textContent = appState.generatedNotes;
        defaultFilename = 'notes_illustration.png';
    } else if (appState.generatedSummary) {
        textContent = appState.generatedSummary;
        defaultFilename = 'summary_visual.png';
    } else {
        // Fallback: If no generated content, try to use uploaded text or a generic prompt
        textContent = appState.uploadedText || "A vibrant illustration related to modern education and technology.";
        if (appState.uploadedFileName) {
            defaultFilename = `${appState.uploadedFileName.split('.')[0]}_visual.png`;
        }
    }

    if (!textContent.trim()) {
        hideLoading();
        showToast('No sufficient text content found for image generation.', 'warning');
        return;
    }

    // Truncate long texts for API prompts if necessary (real APIs have limits)
    const prompt = textContent.substring(0, 1000); 

    try {
        // 2. Call the AI image generation function
        const imageUrls = await generateImageFromAI(prompt, {
            // Example options: These could come from user settings in the future
            style: 'digital painting', 
            mood: 'optimistic'
        });

        if (imageUrls && imageUrls.length > 0) {
            // 3. Automatically download the first generated image
            downloadImageFromURL(imageUrls[0], defaultFilename);
        } else {
            showToast('AI generated no image URLs.', 'error');
        }
    } catch (error) {
        // Error already handled by generateImageFromAI, just ensure loading is hidden
        hideLoading();
        console.error('Overall image generation process failed:', error);
    } finally {
        hideLoading(); // Ensure loading indicator is always hidden
    }
}
