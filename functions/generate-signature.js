// This is your secure "bank teller". It runs on Cloudflare's servers, not in the browser.
// Its only job is to generate a secure, temporary permission slip (a signature) for an upload.

// This function will be triggered when your front-end makes a POST request to /generate-signature.
export async function onRequestPost({ request, env }) {
  try {
    // Get the current time as a Unix timestamp.
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Get parameters from the front-end request (optional, but good practice).
    // For example, you could specify a folder to upload to.
    const body = await request.json();
    const paramsToSign = body.params_to_sign || {};
    paramsToSign.timestamp = timestamp;

    // --- The Core of Signature Generation ---
    // 1. Create a string of parameters to sign, sorted alphabetically.
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&');

    // 2. Append your SECRET API key. This is the crucial security step.
    // 'env.CLOUDINARY_API_SECRET' securely reads the environment variable you set in the Cloudflare dashboard.
    const stringToSign = `${sortedParams}${env.CLOUDINARY_API_SECRET}`;

    // 3. Use the Web Crypto API to create a SHA-1 hash of the string.
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    
    // 4. Convert the hash to a hexadecimal string. This is the signature.
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 5. Send the signature and timestamp back to the front-end.
    return new Response(JSON.stringify({ signature, timestamp }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}