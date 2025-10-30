// ══════════════════════════════════════════════════════════════
// CLOUDINARY IMAGE STORAGE MODULE
// Complete implementation for profile image uploads
// ══════════════════════════════════════════════════════════════

/**
 * Helper function to get Firestore's server timestamp object safely.
 * NOTE: Defined in firebaseApi.js, declared here for clear dependency.
 */
function getServerTimestamp() {
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
        return firebase.firestore.FieldValue.serverTimestamp();
    }
    // Fallback to a simple ISO string if Firebase is not fully initialized (e.g., in Guest Mode)
    return new Date().toISOString(); 
}

/**
 * Uploads an image to Cloudinary using settings from config.js
 * @param {File} imageFile - The image file to upload
 * @param {string} folder - Optional folder name in Cloudinary
 * @returns {Promise<Object>} Upload result with URL and metadata
 */
async function uploadImageToCloudinary(imageFile, folder = 'study_assistant') {
    // CLOUDINARY_CONFIG is from config.js
    const config = CLOUDINARY_CONFIG;
    
    if (!config || !config.cloudName || !config.uploadPreset) {
        showToast("Cloudinary is not configured. Avatar upload disabled.", "error");
        return null;
    }
    
    const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

    try {
        if (!imageFile.type.startsWith('image/')) throw new Error('File must be an image.');
        if (imageFile.size > 5 * 1024 * 1024) throw new Error('Image size must be less than 5MB.');

        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', config.uploadPreset);
        formData.append('folder', folder);

        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            const errorMessage = error.error?.message || `Upload failed with HTTP status: ${response.status}`;
            console.error('Cloudinary API response error:', errorMessage, error);
            
            if (errorMessage.includes('Invalid API key') || errorMessage.includes('unknown api key')) {
                 throw new Error("Invalid Cloudinary Configuration (Check cloudName/uploadPreset).");
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        return {
            url: data.secure_url,
            publicId: data.public_id,
            width: data.width,
            height: data.height,
            format: data.format,
            size: data.bytes,
            thumbnail: data.thumbnail_url || data.secure_url,
            createdAt: data.created_at
        };
    } catch (error) {
        console.error('Cloudinary upload execution error:', error);
        throw error;
    }
}

/**
 * Uploads profile avatar to Cloudinary and saves URL to Firestore
 * @param {File} imageFile - The avatar image file
 * @returns {Promise<string>} The uploaded image URL
 */
// cloudinary.js (Function: uploadProfileAvatar)

async function uploadProfileAvatar(imageFile) {
    try {
        // Upload to Cloudinary
        const result = await uploadImageToCloudinary(imageFile, 'avatars');
        if (!result) throw new Error("Cloudinary upload failed (Check Configuration)."); // Catch configuration error earlier

        // Save URL to Firestore if user is logged in
        if (appState.currentUser && typeof db !== 'undefined' && db) {
            await db.collection('users').doc(appState.currentUser.uid).update({
                avatarUrl: result.url,
                avatarThumbnail: result.url,
                avatarUpdatedAt: new Date().toISOString() 
            });
        } else if (!appState.currentUser) {
            throw new Error("Login required to save profile picture.");
        }
        
        // Update local state
        appState.userProfile.avatarUrl = result.url;

        return result.url;
    } catch (error) {
        const errorMsg = error.message || 'Image upload failed with an unknown error.';
        console.error('Avatar upload error:', error);
        
        // **CRITICAL IMPROVEMENT:** If upload fails, still update the local profile 
        // with a placeholder URL to prevent the UI from being unresponsive 
        // if this function crashes before returning.
        
        // Fallback to local profile picture storage (or a default static image)
        appState.userProfile.avatarUrl = appState.userProfile.avatarUrl || 'DEFAULT_AVATAR_URL'; 
        
        showToast(`Profile picture upload failed: ${errorMsg}`, 'error'); 
        throw error;
    }
}

/**
 * Gets optimized image URL from Cloudinary with transformations
 * @param {string} publicId - The public ID of the image in Cloudinary
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
function getOptimizedImageUrl(publicId, options = {}) {
    const config = CLOUDINARY_CONFIG;
    if (!config || !config.cloudName) {
        console.warn("Cloudinary cloudName not configured.");
        return publicId; // Fallback
    }

    const {
        width = 'auto',
        height = 'auto',
        crop = 'fill',
        quality = 'auto',
        format = 'auto',
        gravity = 'face'  // Focus on faces for avatars
    } = options;

    const baseUrl = `https://res.cloudinary.com/${config.cloudName}/image/upload`;
    const transformations = `w_${width},h_${height},c_${crop},q_${quality},f_${format},g_${gravity}`;

    return `${baseUrl}/${transformations}/${publicId}`;
}

/**
 * Gets avatar URL optimized for display
 * @param {string} avatarUrl - Full Cloudinary URL
 * @param {number} size - Desired size in pixels
 * @returns {string} Optimized avatar URL
 */
function getAvatarUrl(avatarUrl, size = 200) {
    const config = CLOUDINARY_CONFIG;
    if (!avatarUrl || !config || !config.cloudName || !avatarUrl.includes('cloudinary.com')) {
        return avatarUrl;  // Return as-is if not Cloudinary URL or not configured
    }

    // Extract public ID from URL
    const match = avatarUrl.match(/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return avatarUrl;

    const path = avatarUrl.substring(avatarUrl.indexOf('/upload/') + 8);
    
    // Construct the new URL with desired transformations
    const transformations = `w_${size},h_${size},c_fill,q_auto,f_auto`;
    const baseUrl = `https://res.cloudinary.com/${config.cloudName}/image/upload`;
    
    // Insert transformations right after /upload/
    return `${baseUrl}/${transformations}/${path}`;
}

/**
 * Verifies Cloudinary configuration on startup
 * @returns {Object} Configuration status
 */
function verifyCloudinarySetup() {
    const config = CLOUDINARY_CONFIG;
    
    if (typeof config === 'undefined' || !config.cloudName || !config.uploadPreset || config.cloudName === 'YOUR_CLOUD_NAME') {
        console.warn('⚠️ Cloudinary not configured');
        if (typeof showToast === 'function') {
            showToast("Cloudinary not set up. Image features disabled.", "warning");
        }
        return false;
    } else {
        console.log('✅ Cloudinary configured successfully.');
        return true;
    }
}

// Verify setup on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // Wait a moment for config.js to be loaded
        setTimeout(verifyCloudinarySetup, 500);
    });
}
