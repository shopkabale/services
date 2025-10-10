// This is a helper file to make uploading to Cloudinary easier and reusable.

// --- IMPORTANT ---
// Before this works, you need to set up an "Unsigned Upload Preset" in your Cloudinary account.
// 1. Go to your Cloudinary Dashboard -> Settings (gear icon) -> Upload.
// 2. Scroll down to "Upload presets".
// 3. Click "Add upload preset".
// 4. Change "Signing Mode" from "Signed" to "Unsigned".
// 5. Give it a name (e.g., 'kabale_online_preset').
// 6. Save it and copy the preset name. You'll need it soon.

// IMPORTANT: Replace 'YOUR_CLOUD_NAME' with your actual Cloudinary Cloud Name from your dashboard.
const CLOUDINARY_CLOUD_NAME = 'YOUR_CLOUD_NAME'; 
// IMPORTANT: Replace 'YOUR_UNSIGNED_PRESET' with the actual upload preset name you just created.
const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UNSIGNED_PRESET'; 

const uploadToCloudinary = async (file) => {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Image upload failed');
        }

        const data = await response.json();
        return data.secure_url; // Returns the optimized image URL
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};

export { uploadToCloudinary };