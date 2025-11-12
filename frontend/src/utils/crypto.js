/**
 * Cryptographic utilities using Web Crypto API for End-to-End Encryption
 * Implements RSA + AES-256-GCM hybrid encryption system
 */

// Convert ArrayBuffer to base64 string
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert base64 string to ArrayBuffer
export function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate RSA key pair for asymmetric encryption
 * Used for secure key exchange between users
 */
export async function generateKeyPair() {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: 'SHA-256',
      },
      true, // extractable - both keys need to be extractable
      ['encrypt', 'decrypt'] // This will be split: public key gets 'encrypt', private key gets 'decrypt'
    );
    
    return keyPair;
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw error;
  }
}

/**
 * Export public key to base64 string format for storage/transmission
 */
export async function exportPublicKey(publicKey) {
  try {
    const exported = await window.crypto.subtle.exportKey('spki', publicKey);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error('Error exporting public key:', error);
    throw error;
  }
}

/**
 * Export private key to base64 string for local storage
 */
export async function exportPrivateKey(privateKey) {
  try {
    const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error('Error exporting private key:', error);
    throw error;
  }
}

/**
 * Import public key from base64 string
 */
export async function importPublicKey(base64Key, extractable = false) {
  try {
    const keyData = base64ToArrayBuffer(base64Key);
    return await window.crypto.subtle.importKey(
      'spki',
      keyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      extractable, // Allow making keys extractable when needed
      ['encrypt']
    );
  } catch (error) {
    console.error('Error importing public key:', error);
    throw error;
  }
}

/**
 * Import private key from base64 string
 */
export async function importPrivateKey(base64Key, extractable = false) {
  try {
    const keyData = base64ToArrayBuffer(base64Key);
    return await window.crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      extractable, // Allow making keys extractable when needed
      ['decrypt']
    );
  } catch (error) {
    console.error('Error importing private key:', error);
    throw error;
  }
}

/**
 * Generate AES key for symmetric encryption of messages
 */
export async function generateAESKey() {
  try {
    return await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Error generating AES key:', error);
    throw error;
  }
}

/**
 * Export AES key to base64 string
 */
export async function exportAESKey(aesKey) {
  try {
    const exported = await window.crypto.subtle.exportKey('raw', aesKey);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error('Error exporting AES key:', error);
    throw error;
  }
}

/**
 * Import AES key from base64 string
 */
export async function importAESKey(base64Key) {
  try {
    const keyData = base64ToArrayBuffer(base64Key);
    return await window.crypto.subtle.importKey(
      'raw',
      keyData,
      'AES-GCM',
      true, // Make extractable for re-export/storage
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Error importing AES key:', error);
    throw error;
  }
}

/**
 * Encrypt message using AES-GCM
 */
export async function encryptMessage(message, aesKey) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Generate a random IV (Initialization Vector)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      data
    );
    
    return {
      ciphertext: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv),
    };
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw error;
  }
}

/**
 * Decrypt message using AES-GCM
 */
export async function decryptMessage(encryptedData, aesKey) {
  try {
    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = base64ToArrayBuffer(encryptedData.iv);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw error;
  }
}

/**
 * Encrypt AES key using RSA public key (for key exchange)
 */
export async function encryptAESKey(aesKey, publicKey) {
  try {
    const exported = await window.crypto.subtle.exportKey('raw', aesKey);
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      exported
    );
    
    return arrayBufferToBase64(encrypted);
  } catch (error) {
    console.error('Error encrypting AES key:', error);
    throw error;
  }
}

/**
 * Decrypt AES key using RSA private key
 */
export async function decryptAESKey(encryptedKey, privateKey) {
  try {
    const keyData = base64ToArrayBuffer(encryptedKey);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      privateKey,
      keyData
    );
    
    return await window.crypto.subtle.importKey(
      'raw',
      decrypted,
      'AES-GCM',
      true, // Make extractable for re-export/storage
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Error decrypting AES key:', error);
    throw error;
  }
}

/**
 * Key management utilities for localStorage
 */
export const KeyStorage = {
  // Store user's own key pair
  storeKeyPair: async (keyPair) => {
    try {
      const publicKey = await exportPublicKey(keyPair.publicKey);
      const privateKey = await exportPrivateKey(keyPair.privateKey);
      
      localStorage.setItem('e2ee_public_key', publicKey);
      localStorage.setItem('e2ee_private_key', privateKey);
    } catch (error) {
      console.error('Error storing key pair:', error);
      throw error;
    }
  },
  
  // Retrieve user's own key pair
  getKeyPair: async (extractable = true) => {
    try {
      const publicKeyBase64 = localStorage.getItem('e2ee_public_key');
      const privateKeyBase64 = localStorage.getItem('e2ee_private_key');
      
      if (!publicKeyBase64 || !privateKeyBase64) {
        return null;
      }
      
      const publicKey = await importPublicKey(publicKeyBase64, extractable);
      const privateKey = await importPrivateKey(privateKeyBase64, extractable);
      
      return { publicKey, privateKey };
    } catch (error) {
      console.error('Error retrieving key pair:', error);
      return null;
    }
  },
  
  // Store session key for a conversation
  storeSessionKey: async (username, aesKey) => {
    try {
      const exportedKey = await exportAESKey(aesKey);
      localStorage.setItem(`e2ee_session_${username}`, exportedKey);
    } catch (error) {
      console.error('Error storing session key:', error);
      throw error;
    }
  },
  
  // Retrieve session key for a conversation
  getSessionKey: async (username) => {
    try {
      const keyBase64 = localStorage.getItem(`e2ee_session_${username}`);
      if (!keyBase64) {
        return null;
      }
      
      return await importAESKey(keyBase64);
    } catch (error) {
      console.error('Error retrieving session key:', error);
      return null;
    }
  },
  
  // Clear all stored keys (logout)
  clearKeys: () => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('e2ee_'));
    keys.forEach(key => localStorage.removeItem(key));
  }
};

/**
 * High-level crypto operations for the chat application
 */
export const ChatCrypto = {
  // Initialize user's cryptographic identity
  initializeUser: async () => {
    try {
      let keyPair = await KeyStorage.getKeyPair();
      
      if (!keyPair) {
        console.log('Generating new key pair...');
        keyPair = await generateKeyPair();
        await KeyStorage.storeKeyPair(keyPair);
      }
      
      return keyPair;
    } catch (error) {
      console.error('Error initializing user crypto:', error);
      throw error;
    }
  },
  
  // Start encrypted conversation with another user
  startConversation: async (otherUserPublicKey) => {
    try {
      // Generate new AES session key for this conversation
      const sessionKey = await generateAESKey();
      
      // Encrypt the session key with the other user's public key
      const publicKey = await importPublicKey(otherUserPublicKey);
      const encryptedSessionKey = await encryptAESKey(sessionKey, publicKey);
      
      return { sessionKey, encryptedSessionKey };
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  },
  
  // Send encrypted message
  sendMessage: async (message, username) => {
    try {
      let sessionKey = await KeyStorage.getSessionKey(username);
      
      if (!sessionKey) {
        throw new Error('No session key found for this conversation. Start a new conversation first.');
      }
      
      return await encryptMessage(message, sessionKey);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
  
  // Decrypt received message
  receiveMessage: async (encryptedData, username) => {
    try {
      let sessionKey = await KeyStorage.getSessionKey(username);
      
      if (!sessionKey) {
        throw new Error('No session key found for this conversation.');
      }
      
      return await decryptMessage(encryptedData, sessionKey);
    } catch (error) {
      console.error('Error receiving message:', error);
      throw error;
    }
  }
};