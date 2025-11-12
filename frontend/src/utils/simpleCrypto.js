/**
 * Simplified crypto implementation for debugging
 * This uses a shared secret approach for testing
 */

// Simple function to derive a shared key from two usernames
export async function getSharedKey(username1, username2) {
  // Create a deterministic shared secret from usernames
  const sharedSecret = [username1, username2].sort().join('-');
  
  // Use TextEncoder to convert to ArrayBuffer
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(sharedSecret);
  
  // Import as key material
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    keyMaterial,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES key
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('e2ee-chat-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  return key;
}

// Simple encrypt function
export async function simpleEncrypt(message, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv)))
  };
}

// Simple decrypt function
export async function simpleDecrypt(encryptedData, key) {
  const ciphertext = new Uint8Array(atob(encryptedData.ciphertext).split('').map(c => c.charCodeAt(0)));
  const iv = new Uint8Array(atob(encryptedData.iv).split('').map(c => c.charCodeAt(0)));
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}