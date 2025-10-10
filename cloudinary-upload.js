// This file now acts as the "customer" who goes to the "bank teller" first.

// IMPORTANT: Replace 'YOUR_CLOUD_NAME' with your actual Cloudinary Cloud Name.
const CLOUDINARY_CLOUD_NAME = 'dzdqzpnmv';
// IMPORTANT: Replace 'YOUR_API_KEY' with your actual Cloudinary API Key (it's safe to have this one here).
const CLOUDINARY_API_KEY = '927694656312358';

const uploadToCloudinary = async (file) => {
    try {
        // --- Step 1: Ask our own server for a signature ---
        const signatureResponse = await fetch('/generate-signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // We can pass extra parameters to sign if needed, e.g., a folder
                params_to_sign: { folder: 'kabale_online_services' } 
            }),
        });
        
        if (!signatureResponse.ok) {
            throw new Error('Could not get upload signature from server.');
        }

        const { signature, timestamp } = await signatureResponse.json();

        // --- Step 2: Use the signature to upload directly to Cloudinary ---
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', CLOUDINARY_API_KEY);
        formData.append('signature', signature);
        formData.append('timestamp', timestamp);
        formData.append('folder', 'kabale_online_services'); // Match the folder sent for signing

        const uploadResponse = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            throw new Error('Image upload to Cloudinary failed.');
        }

        const data = await uploadResponse.json();
        return data.secure_url; // Return the final, secure URL

    } catch (error) {
        console.error('Cloudinary upload process failed:', error);
        throw error;
    }
};

export { uploadToCloudinary };