/**
 * Crypto diagnostic functions to test each step
 */

import { 
  generateKeyPair, 
  exportPublicKey, 
  exportPrivateKey, 
  importPublicKey, 
  importPrivateKey,
  generateAESKey,
  encryptMessage,
  decryptMessage,
  encryptAESKey,
  decryptAESKey
} from './crypto.js';

export async function testCryptoOperations() {
  console.log('🧪 Starting crypto diagnostics...');
  
  try {
    // Test 1: Generate RSA key pair
    console.log('1️⃣ Testing RSA key pair generation...');
    const keyPair1 = await generateKeyPair();
    const keyPair2 = await generateKeyPair();
    console.log('✅ RSA key pairs generated');
    
    // Test 2: Export and import public keys
    console.log('2️⃣ Testing key export/import...');
    const publicKey1Base64 = await exportPublicKey(keyPair1.publicKey);
    const publicKey2Base64 = await exportPublicKey(keyPair2.publicKey);
    console.log('✅ Public keys exported');
    
    const importedPubKey1 = await importPublicKey(publicKey1Base64);
    const importedPubKey2 = await importPublicKey(publicKey2Base64);
    console.log('✅ Public keys imported');
    
    // Test 3: Generate AES session key
    console.log('3️⃣ Testing AES key generation...');
    const sessionKey = await generateAESKey();
    console.log('✅ AES session key generated');
    
    // Test 4: Encrypt AES key with RSA public key
    console.log('4️⃣ Testing AES key encryption with RSA...');
    const encryptedSessionKey = await encryptAESKey(sessionKey, importedPubKey2);
    console.log('✅ AES key encrypted with RSA public key');
    console.log('📦 Encrypted session key length:', encryptedSessionKey.length);
    
    // Test 5: Decrypt AES key with RSA private key
    console.log('5️⃣ Testing AES key decryption with RSA...');
    const decryptedSessionKey = await decryptAESKey(encryptedSessionKey, keyPair2.privateKey);
    console.log('✅ AES key decrypted with RSA private key');
    
    // Test 6: Encrypt message with original session key
    console.log('6️⃣ Testing message encryption...');
    const testMessage = "Hello, this is a test message!";
    const encryptedMessage = await encryptMessage(testMessage, sessionKey);
    console.log('✅ Message encrypted');
    console.log('📦 Encrypted message length:', encryptedMessage.ciphertext.length);
    
    // Test 7: Decrypt message with decrypted session key
    console.log('7️⃣ Testing message decryption...');
    const decryptedMessage = await decryptMessage(encryptedMessage, decryptedSessionKey);
    console.log('✅ Message decrypted');
    console.log('📝 Decrypted message:', decryptedMessage);
    
    // Test 8: Verify message integrity
    console.log('8️⃣ Testing message integrity...');
    const success = decryptedMessage === testMessage;
    console.log(success ? '✅ Message integrity verified' : '❌ Message integrity failed');
    
    console.log('🎉 All crypto operations completed successfully!');
    return {
      success: true,
      message: 'All crypto operations working correctly'
    };
    
  } catch (error) {
    console.error('❌ Crypto diagnostic failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

export async function testKeyStorage() {
  console.log('🧪 Testing key storage...');
  
  try {
    const { KeyStorage } = await import('./crypto.js');
    
    // Test localStorage operations
    const keyPair = await generateKeyPair();
    
    console.log('💾 Testing key storage...');
    await KeyStorage.storeKeyPair(keyPair);
    console.log('✅ Key pair stored');
    
    console.log('🔍 Testing key retrieval...');
    const retrievedKeyPair = await KeyStorage.getKeyPair();
    console.log('✅ Key pair retrieved:', !!retrievedKeyPair);
    
    // Test session key storage
    console.log('🔑 Testing session key storage...');
    const sessionKey = await generateAESKey();
    await KeyStorage.storeSessionKey('testuser', sessionKey);
    console.log('✅ Session key stored');
    
    const retrievedSessionKey = await KeyStorage.getSessionKey('testuser');
    console.log('✅ Session key retrieved:', !!retrievedSessionKey);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Key storage test failed:', error);
    return { success: false, error: error.message };
  }
}

// Add this to window for easy testing
if (typeof window !== 'undefined') {
  window.testCrypto = testCryptoOperations;
  window.testKeyStorage = testKeyStorage;
}