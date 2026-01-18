
/**
 * CodecUtils.js - Compression utilities for SDP exchange
 * Uses CompressionStream (GZIP) and Base64 to shrink link/QR payloads.
 */

// URL-safe Base64 helpers
function base64ToBytes(base64) {
    const binString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

function bytesToBase64(bytes) {
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
    return btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Compresses a JSON object (SDP) into a URL-safe Base64 string.
 * @param {Object} data - The JSON object (SDP offer/answer)
 * @returns {Promise<string>} Compressed Base64 string
 */
export async function compressSDP(data) {
    const jsonStr = JSON.stringify(data);
    const stream = new Blob([jsonStr]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
    const chunks = [];
    for await (const chunk of compressedStream) {
        chunks.push(chunk);
    }
    
    // Concatenate chunks
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return bytesToBase64(result);
}

/**
 * Decompresses a URL-safe Base64 string back into a JSON object.
 * @param {string} compressedString 
 * @returns {Promise<Object>} The original JSON object (SDP)
 */
export async function decompressSDP(compressedString) {
    try {
        const bytes = base64ToBytes(compressedString);
        const stream = new Blob([bytes]).stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"));
        
        const response = new Response(decompressedStream);
        const text = await response.text();
        return JSON.parse(text);
    } catch (e) {
        console.error("Decompression failed:", e);
        return null;
    }
}
