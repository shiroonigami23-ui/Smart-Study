// ══════════════════════════════════════════════════════════════
// CLOUDINARY IMAGE STORAGE MODULE
// Complete implementation for profile image uploads
// ══════════════════════════════════════════════════════════════

/**
 * Uploads an image to Cloudinary using settings from config.js
 * @param {File} imageFile - The image file to upload
 * @param {string} folder - Optional folder name in Cloudinary
 * @returns {Promise<Object>} Upload result with URL and metadata
 */
async function uploadImageToCloudinary(imageFile, folder = 'study_assistant') {
    // Get config from config.js
    const config = CLOUDINARY_CONFIG;
    
    if (!config || !config.cloudName || !config.uploadPreset) {
        showToast("Cloudinary is not configured. Avatar upload disabled.", "error");
        console.error("Cloudinary config missing in config.js");
        return null;
    }
    
    const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;

    try {
        // Validate file type
        if (!imageFile.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        // Validate file size (max 5MB for free tier)
        if (imageFile.size > 5 * 1024 * 1024) {
            throw new Error('Image size must be less than 5MB');
        }

        // Create form data
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', config.uploadPreset);
        formData.append('folder', folder);

        // Add timestamp for unique filenames
        const timestamp = Date.now();
        const publicId = `${folder}/${timestamp}_${imageFile.name.split('.')[0]}`;
        formData.append('public_id', publicId);

        // Upload to Cloudinary
        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `Upload failed with status: ${response.status}`);
        }

        const data = await response.json();

        return {
            url: data.secure_url,  // HTTPS URL
            publicId: data.public_id,
            width: data.width,
            height: data.height,
            format: data.format,
            size: data.bytes,
            thumbnail: data.thumbnail_url || data.secure_url,
            createdAt: data.created_at
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}

/**
 * Uploads profile avatar to Cloudinary and saves URL to Firestore
 * @param {File} imageFile - The avatar image file
 * @returns {Promise<string>} The uploaded image URL
 */
async function uploadProfileAvatar(imageFile) {
    try {
        // Upload to Cloudinary
        const result = await uploadImageToCloudinary(imageFile, 'avatars');
        if (!result) throw new Error("Cloudinary upload returned null");

        // CRITICAL FIX: Ensure db (global from firebaseApi.js) is initialized
        if (appState.currentUser && typeof db !== 'undefined' && db) {
            await db.collection('users').doc(appState.currentUser.uid).update({
                avatarUrl: result.url,
                avatarThumbnail: result.thumbnail,
                avatarUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
             console.warn("User logged in but Firestore DB not initialized. Profile picture URL not saved to Firestore.");
        }

        // Update local state
        appState.userProfile.avatarUrl = result.url;

        return result.url;
    } catch (error) {
        console.error('Avatar upload error:', error);
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
        gravity = 'face'
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
        return avatarUrl;
    }

    // Extract public ID from URL
    const match = avatarUrl.match(/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return avatarUrl;

    const publicId = match[1];
    return getOptimizedImageUrl(publicId, {
        width: size,
        height: size,
        crop: 'fill',
        quality: 'auto',
        format: 'auto'
    });
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
