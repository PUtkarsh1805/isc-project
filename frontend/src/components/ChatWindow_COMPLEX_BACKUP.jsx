import React, { useState, useEffect } from 'react';
import ContactList from './ContactList';
import { chatAPI } from '../utils/api';
import { ChatCrypto, KeyStorage } from '../utils/crypto';

function ChatWindow({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.contact_username);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (withUsername) => {
    try {
      setIsLoading(true);
      const response = await chatAPI.getMessages(withUsername);
      
      // Import crypto functions
      const { KeyStorage, decryptAESKey, decryptMessage } = await import('../utils/crypto');
      
      console.log('📨 Loaded', response.data.messages.length, 'messages');
      
      // PASS 1: Extract and store all session keys FIRST
      console.log('🔑 PASS 1: Extracting session keys...');
      const ourKeyPair = await KeyStorage.getKeyPair();
      
      console.log('🔍 PASS 1 Debug Info:');
      console.log('   - Our key pair available:', !!ourKeyPair);
      console.log('   - Current user:', user.username);
      console.log('   - Messages to process:', response.data.messages.length);
      
      // Debug: Show all messages and their session key status
      response.data.messages.forEach((msg, index) => {
        const isReceived = msg.sender_username !== user.username;
        console.log(`   Message ${index}: sender=${msg.sender_username}, receiver=${msg.receiver_username}, isReceived=${isReceived}, hasSessionKey=${!!msg.encrypted_session_key}`);
      });
      
      let sessionKeysFound = 0;
      let sessionKeysDecrypted = 0;
      
      for (const msg of response.data.messages) {
        const isReceived = msg.sender_username !== user.username;
        const otherUsername = isReceived ? msg.sender_username : msg.receiver_username;
        
        // If this is a received message with encrypted session key, extract and store it
        if (isReceived && msg.encrypted_session_key) {
          sessionKeysFound++;
          console.log(`🔑 [${sessionKeysFound}] Found encrypted session key in message from`, otherUsername);
          console.log('🔑 Found encrypted session key in message from', otherUsername);
          
          // Check if we already have this session key
          const existingKey = await KeyStorage.getSessionKey(otherUsername);
          if (!existingKey && ourKeyPair) {
            try {
              console.log('🔓 Decrypting session key from', otherUsername);
              console.log('📏 Encrypted session key length:', msg.encrypted_session_key.length);
              
              // Decrypt the session key with our private key
              const sessionKey = await decryptAESKey(msg.encrypted_session_key, ourKeyPair.privateKey);
              
              // Store the session key for this conversation
              await KeyStorage.storeSessionKey(otherUsername, sessionKey);
              sessionKeysDecrypted++;
              console.log(`💾 [${sessionKeysDecrypted}] Session key stored successfully for`, otherUsername);
            } catch (keyError) {
              console.error('❌ Failed to decrypt session key from', otherUsername, ':', keyError);
              console.error('🔍 Key error details:', keyError.message);
              console.error('🔍 This suggests key pair mismatch or corrupted session key data');
            }
          } else if (existingKey) {
            console.log('✅ Session key already exists for', otherUsername);
            sessionKeysDecrypted++; // Count existing keys too
          } else {
            console.log('❌ No key pair available to decrypt session key from', otherUsername);
          }
        }
      }
      
      console.log(`🔑 PASS 1 Summary: Found ${sessionKeysFound} session keys, decrypted ${sessionKeysDecrypted}`);
      
      // Show what session keys we have in localStorage after PASS 1
      const availableKeys = Object.keys(localStorage).filter(k => k.startsWith('e2ee_session_'));
      console.log(`🔑 Total session keys in storage: ${availableKeys.length}`);
      availableKeys.forEach(key => {
        console.log(`   - ${key.replace('e2ee_session_', '')}`);
      });
      
      // TEMPORARY FIX: If no session keys found, generate one for this conversation
      if (sessionKeysDecrypted === 0 && withUsername) {
        console.log('🚨 NO SESSION KEYS AVAILABLE - Generating temporary key for', withUsername);
        console.log('⚠️  This is a temporary fix. Proper fix: Send a new message to establish session key');
        
        try {
          const { generateAESKey } = await import('../utils/crypto');
          const tempSessionKey = await generateAESKey();
          await KeyStorage.storeSessionKey(withUsername, tempSessionKey);
          console.log('✅ Temporary session key generated for', withUsername);
          console.log('📝 NOTE: This will only decrypt messages encrypted with this same temp key');
        } catch (tempKeyError) {
          console.error('❌ Failed to generate temporary session key:', tempKeyError);
        }
      }
      
      // PASS 2: Now decrypt all messages
      console.log('🔐 PASS 2: Decrypting messages...');
      const decryptedMessages = await Promise.all(
        response.data.messages.map(async (msg) => {
          try {
            // Determine if this is a sent or received message
            const isReceived = msg.sender_username !== user.username;
            const otherUsername = isReceived ? msg.sender_username : msg.receiver_username;
            
            console.log('🔍 Processing message:', {
              id: msg.id,
              from: msg.sender_username,
              to: msg.receiver_username,
              isReceived: isReceived,
              otherUsername: otherUsername,
              currentUser: user.username,
              timestamp: msg.timestamp
            });
            
            // Get session key for decryption based on message direction
            let sessionKey;
            let keySource;
            
            if (isReceived) {
              // For received messages, use the session key from the sender
              sessionKey = await KeyStorage.getSessionKey(otherUsername);
              keySource = `received from ${otherUsername}`;
            } else {
              // For sent messages, use the session key we created for this conversation
              sessionKey = await KeyStorage.getSessionKey(otherUsername);
              keySource = `sent to ${otherUsername}`;
            }
            
            console.log('🔑 Session key available for', keySource, ':', !!sessionKey);
            
            if (!sessionKey) {
              console.error('❌ No session key available for', keySource);
              console.error('📝 Available session keys:', Object.keys(localStorage).filter(k => k.startsWith('e2ee_session_')));
              
              // Show all available keys for debugging
              const allKeys = Object.keys(localStorage).filter(k => k.startsWith('e2ee_'));
              allKeys.forEach(key => {
                const value = localStorage.getItem(key);
                console.log(`   ${key}: ${value?.substring(0, 30)}...`);
              });
              
              throw new Error(`No session key available for ${keySource}`);
            }
            
            // Decrypt the message
            console.log('🔐 Attempting to decrypt message from', otherUsername);
            console.log('📦 Message data:', {
              id: msg.id,
              contentLength: msg.encrypted_content?.length || 'MISSING',
              ivLength: msg.iv?.length || 'MISSING',
              contentSample: msg.encrypted_content?.substring(0, 20) || 'MISSING',
              ivSample: msg.iv?.substring(0, 20) || 'MISSING'
            });
            
            // Validate data before decryption
            if (!msg.encrypted_content || !msg.iv) {
              throw new Error(`Missing encrypted data: content=${!!msg.encrypted_content}, iv=${!!msg.iv}`);
            }
            
            // Test base64 validity
            try {
              window.atob(msg.encrypted_content);
              console.log('✅ Content is valid base64');
            } catch (e) {
              throw new Error(`Invalid base64 content: ${e.message}`);
            }
            
            try {
              window.atob(msg.iv);
              console.log('✅ IV is valid base64');
            } catch (e) {
              throw new Error(`Invalid base64 IV: ${e.message}`);
            }
            
            const decryptedContent = await decryptMessage(
              {
                ciphertext: msg.encrypted_content,
                iv: msg.iv
              },
              sessionKey
            );
            
            console.log('✅ Message decrypted successfully:', decryptedContent.substring(0, 50) + (decryptedContent.length > 50 ? '...' : ''));
            
            return {
              ...msg,
              decrypted_content: decryptedContent,
              type: isReceived ? 'received' : 'sent'
            };
          } catch (error) {
            console.error('Failed to decrypt message ID', msg.id, ':', error.message);
            console.error('Error type:', error.name);
            
            // Determine error cause
            let errorReason = 'Unknown error';
            if (error.message.includes('Invalid base64')) {
              errorReason = 'Corrupted data (invalid base64)';
            } else if (error.name === 'OperationError') {
              errorReason = 'Data/key mismatch (OperationError)';
            } else if (error.message.includes('Missing encrypted data')) {
              errorReason = 'Missing data fields';
            } else if (error.message.includes('No session key')) {
              errorReason = 'No session key available';
            }
            
            return {
              ...msg,
              decrypted_content: `[Decryption failed: ${errorReason}]`,
              type: msg.sender_username !== user.username ? 'received' : 'sent',
              decryption_failed: true,
              error_reason: errorReason
            };
          }
        })
      );
      
      setMessages(decryptedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startConversation = async (username) => {
    try {
      // Set as active conversation
      setActiveConversation({ contact_username: username });
      
      // Add to conversations list if not already there
      const existingConv = conversations.find(c => c.contact_username === username);
      if (!existingConv) {
        setConversations(prev => [...prev, { 
          contact_username: username, 
          last_message_time: new Date().toISOString() 
        }]);
      }
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation. Make sure the user exists.');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeConversation || isSending) {
      return;
    }

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const receiverUsername = activeConversation.contact_username;
      
      // Import crypto functions
      const { 
        KeyStorage, 
        generateAESKey, 
        encryptMessage, 
        exportAESKey, 
        importPublicKey, 
        encryptAESKey 
      } = await import('../utils/crypto');
      
      console.log('📨 Sending message to:', receiverUsername);
      console.log('👤 Current user:', user.username);
      
      // Check if we have a session key for this conversation
      let sessionKey = await KeyStorage.getSessionKey(receiverUsername);
      let encryptedSessionKey = null;
      
      console.log('🔍 Existing session key available:', !!sessionKey);
      
      // ALWAYS include session key for now (until conversation is properly established)
      let shouldIncludeSessionKey = true; // Force include session key in every message
      
      if (!sessionKey) {
        // First message - need to establish session key
        console.log('🔑 Establishing new session key with', receiverUsername);
        
        try {
          // Generate new AES session key
          console.log('⚡ Generating AES session key...');
          sessionKey = await generateAESKey();
          console.log('✅ AES session key generated');
        } catch (keyError) {
          console.error('❌ Key generation failed:', keyError);
          throw new Error('Failed to generate session key: ' + keyError.message);
        }
      } else {
        console.log('✅ Using existing session key for', receiverUsername);
        console.log('🔄 Will re-send session key to ensure receiver has it');
      }
      
      // Encrypt session key with receiver's public key (doing this for every message now)
      try {
        console.log('📡 Fetching public key for', receiverUsername);
        const response = await chatAPI.getPublicKey(receiverUsername);
        const receiverPublicKey = response.data.public_key;
        console.log('📋 Receiver public key length:', receiverPublicKey.length);
        
        console.log('🔒 Importing and encrypting session key...');
        const publicKey = await importPublicKey(receiverPublicKey);
        
        try {
          encryptedSessionKey = await encryptAESKey(sessionKey, publicKey);
          console.log('📦 Encrypted session key length:', encryptedSessionKey.length);
        } catch (exportError) {
          if (exportError.message.includes('not extractable')) {
            console.log('⚠️  Session key not extractable, regenerating...');
            // Regenerate extractable session key
            sessionKey = await generateAESKey();
            await KeyStorage.storeSessionKey(receiverUsername, sessionKey);
            console.log('✅ New extractable session key generated and stored');
            
            encryptedSessionKey = await encryptAESKey(sessionKey, publicKey);
            console.log('📦 Encrypted session key length:', encryptedSessionKey.length);
          } else {
            throw exportError;
          }
        }
        
        // Store session key locally for future messages
        await KeyStorage.storeSessionKey(receiverUsername, sessionKey);
        console.log('💾 Session key stored locally for', receiverUsername);
      } catch (keyError) {
        console.error('❌ Key exchange failed:', keyError);
        throw new Error('Failed to establish session key: ' + keyError.message);
      }

      // Encrypt the message with session key
      console.log('🔐 Encrypting message with session key');
      console.log('📝 Message text length:', messageText.length);
      
      const encryptedData = await encryptMessage(messageText, sessionKey);
      console.log('📦 Encrypted data:', {
        ciphertextLength: encryptedData.ciphertext.length,
        ivLength: encryptedData.iv.length
      });

      // Send to server (include encrypted session key if it's the first message)
      const messagePayload = {
        receiver_username: receiverUsername,
        encrypted_content: encryptedData.ciphertext,
        iv: encryptedData.iv,
        ...(encryptedSessionKey && { encrypted_session_key: encryptedSessionKey })
      };

      console.log('📤 Sending message payload:', {
        ...messagePayload,
        encrypted_session_key: messagePayload.encrypted_session_key ? 'present' : 'not included'
      });
      
      await chatAPI.sendMessage(messagePayload);

      // Add to local messages immediately for better UX
      const newMsg = {
        id: Date.now(), // temporary ID
        sender_username: user.username,
        receiver_username: receiverUsername,
        decrypted_content: messageText,
        type: 'sent',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMsg]);

      // Refresh conversations to update last message time
      loadConversations();

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <span className="username">{user.username}</span>
            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
          
          <div className="security-badge">
            <span className="security-icon">🔒</span>
            <span>End-to-End Encrypted</span>
          </div>
        </div>

        <ContactList 
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={setActiveConversation}
          onStartConversation={startConversation}
        />
      </div>

      <div className="chat-main">
        {activeConversation ? (
          <>
            <div className="chat-header">
              <div className="chat-title">
                {activeConversation.contact_username}
              </div>
            </div>

            <div className="messages">
              {isLoading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <span>Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="empty-chat">
                  <div>
                    <div className="lock-icon">🔒</div>
                    <p>Start your encrypted conversation with {activeConversation.contact_username}</p>
                    <p style={{ fontSize: '14px', opacity: 0.7 }}>
                      Messages are end-to-end encrypted and can only be read by you and the recipient.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={message.id || index} className={`message ${message.type}`}>
                    <div className="message-content">
                      {message.decrypted_content}
                      {message.decryption_failed && (
                        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
                          ⚠️ Decryption failed
                        </div>
                      )}
                    </div>
                    <div className="message-time">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="message-input-container">
              <form className="message-input-form" onSubmit={sendMessage}>
                <input
                  type="text"
                  className="message-input"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Send encrypted message to ${activeConversation.contact_username}...`}
                  disabled={isSending}
                />
                <button 
                  type="submit" 
                  className="send-btn"
                  disabled={!newMessage.trim() || isSending}
                >
                  {isSending ? '...' : 'Send'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="empty-chat">
            <div>
              <div className="lock-icon">💬</div>
              <h3>Welcome to E2EE Chat</h3>
              <p>Select a conversation or search for users to start chatting securely.</p>
              <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '15px' }}>
                🔒 All messages are encrypted end-to-end using AES-256-GCM
                <br />
                🔑 Your private keys never leave your device
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ChatWindow;