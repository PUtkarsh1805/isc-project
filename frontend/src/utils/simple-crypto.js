/**
 * DEAD SIMPLE E2E CRYPTO - NO BULLSHIT APPROACH
 */

import { chatAPI } from './api';

// Simple base64 helpers
function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64) {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

export class SimpleCrypto {
  
  // Get ONE master key for everything
  static async getMasterKey() {
    let key = localStorage.getItem('MASTER_KEY');
    
    if (!key) {
      console.log('🔑 Creating new master key');
      const cryptoKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      const exported = await crypto.subtle.exportKey('raw', cryptoKey);
      key = toBase64(exported);
      localStorage.setItem('MASTER_KEY', key);
    }
    
    return crypto.subtle.importKey(
      'raw',
      fromBase64(key),
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  // Encrypt message - SIMPLE
  static async encrypt(text) {
    const key = await this.getMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(text);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return {
      ciphertext: toBase64(encrypted),
      iv: toBase64(iv)
    };
  }
  
  // Decrypt message - SIMPLE
  static async decrypt(ciphertext, iv) {
    const key = await this.getMasterKey();
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(iv) },
      key,
      fromBase64(ciphertext)
    );
    
    return new TextDecoder().decode(decrypted);
  }
  
  // Get RSA keys for key exchange
  static async getRSAKeys() {
    let pubKey = localStorage.getItem('RSA_PUBLIC');
    let privKey = localStorage.getItem('RSA_PRIVATE');
    
    if (!pubKey || !privKey) {
      console.log('🔑 Creating RSA keys');
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      const pubExported = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privExported = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      
      pubKey = toBase64(pubExported);
      privKey = toBase64(privExported);
      
      localStorage.setItem('RSA_PUBLIC', pubKey);
      localStorage.setItem('RSA_PRIVATE', privKey);
    }
    
    const publicKey = await crypto.subtle.importKey(
      'spki',
      fromBase64(pubKey),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );
    
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      fromBase64(privKey),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );
    
    return { publicKey, privateKey, publicKeyString: pubKey };
  }
  
  // Encrypt master key for someone else
  static async encryptKeyFor(username) {
    try {
      // Use API helper so Authorization header is included
      const response = await chatAPI.getPublicKey(username);
      if (!response || !response.data) {
        throw new Error(`Failed to get public key for ${username}`);
      }

      const public_key = response.data.public_key;
      console.log('🔑 Got public key for', username, 'length:', public_key?.length);

      if (!public_key) {
        throw new Error('No public key received');
      }

      // Import their key
      const theirKey = await crypto.subtle.importKey(
        'spki',
        fromBase64(public_key).buffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
      );

      // Get our master key and encrypt it
      const masterKeyRaw = localStorage.getItem('MASTER_KEY');
      if (!masterKeyRaw) {
        throw new Error('No master key found - generate one first');
      }
      
      console.log('🔐 Encrypting master key with their public key');
      const encrypted = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        theirKey,
        fromBase64(masterKeyRaw).buffer
      );
      
      return toBase64(encrypted);
    } catch (error) {
      console.error('❌ Error encrypting key for user:', error);
      throw error;
    }
  }
  
  // Decrypt received session key and store it
  static async decryptAndStoreSessionKey(encryptedSessionKey, senderUsername) {
    try {
      console.log('🔓 Decrypting session key from', senderUsername);
      
      // Get our RSA keys
      const { privateKey } = await this.getRSAKeys();
      
      // Decrypt the session key
      const decryptedKeyBytes = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        fromBase64(encryptedSessionKey).buffer
      );
      
      // Store it as our master key (overwrite with sender's key)
      const keyBase64 = toBase64(decryptedKeyBytes);
      localStorage.setItem('MASTER_KEY', keyBase64);
      
      console.log('✅ Session key decrypted and stored');
    } catch (error) {
      console.error('❌ Error decrypting session key:', error);
      throw error;
    }
  }
  
  // Clear everything
  static clearAll() {
    localStorage.removeItem('MASTER_KEY');
    localStorage.removeItem('RSA_PUBLIC');
    localStorage.removeItem('RSA_PRIVATE');
    console.log('🧹 All keys cleared');
  }
}

window.SimpleCrypto = SimpleCrypto;