import React, { useState, useEffect, useRef } from 'react';
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
  
  // Refs to track message count and prevent unnecessary re-renders
  const lastMessageCountRef = useRef(0);
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      // Initial load
      loadMessages(activeConversation.contact_username);
      
      // Set up smart polling - check every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        checkForNewMessages(activeConversation.contact_username);
      }, 3000);
      
      return () => {
        // Cleanup interval when conversation changes or component unmounts
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [activeConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (withUsername, showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      
      const response = await chatAPI.getMessages(withUsername);
      const { SimpleCrypto } = await import('../utils/simple-crypto');
      
      const decryptedMessages = await Promise.all(
        response.data.messages.map(async (msg) => {
          try {
            const isReceived = msg.sender_username !== user.username;
            
            // If this is a received message with an encrypted session key, decrypt it first
            if (isReceived && msg.encrypted_session_key) {
              await SimpleCrypto.decryptAndStoreSessionKey(msg.encrypted_session_key, msg.sender_username);
            }
            
            // Now decrypt the message
            const decryptedContent = await SimpleCrypto.decrypt(msg.encrypted_content, msg.iv);
            
            return {
              ...msg,
              decrypted_content: decryptedContent,
              type: isReceived ? 'received' : 'sent'
            };
          } catch (error) {
            console.error('❌ Decrypt failed:', error.message);
            return {
              ...msg,
              decrypted_content: '[Could not decrypt message]',
              type: msg.sender_username !== user.username ? 'received' : 'sent',
              decryption_failed: true
            };
          }
        })
      );
      
      // Update message count reference
      lastMessageCountRef.current = decryptedMessages.length;
      setMessages(decryptedMessages);
      
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // Smart check for new messages - only updates if count changed
  const checkForNewMessages = async (withUsername) => {
    try {
      const response = await chatAPI.getMessages(withUsername);
      
      // Only reload if message count changed
      if (response.data.messages.length !== lastMessageCountRef.current) {
        console.log('🔔 New messages detected! Refreshing...');
        await loadMessages(withUsername, false); // Don't show loading spinner
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
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
      const { SimpleCrypto } = await import('../utils/simple-crypto');
      
      // Encrypt message
      const encrypted = await SimpleCrypto.encrypt(messageText);
      
      // Encrypt key for recipient  
      const encryptedKey = await SimpleCrypto.encryptKeyFor(receiverUsername);

      await chatAPI.sendMessage({
        receiver_username: receiverUsername,
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        encrypted_session_key: encryptedKey
      });

      // Optimistically add message to UI
      const newMsg = {
        id: Date.now(),
        sender_username: user.username,
        receiver_username: receiverUsername,
        decrypted_content: messageText,
        type: 'sent',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMsg]);
      lastMessageCountRef.current += 1; // Update count to prevent duplicate on next poll

      // Refresh conversations to update last message time
      loadConversations();

    } catch (error) {
      console.error('Send failed:', error);
      alert('Send failed: ' + error.message);
      setNewMessage(messageText);
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
            <span>End-to-End Encrypted (Simplified)</span>
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
                <>
                  {messages.map((message, index) => (
                    <div key={message.id || index} className={`message ${message.type}`}>
                      <div className="message-content">
                        {message.decrypted_content}
                        {message.decryption_failed && (
                          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
                            ⚠️ Old message - send new message to establish encryption
                          </div>
                        )}
                      </div>
                      <div className="message-time">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  ))}
                  {/* Invisible element to scroll to */}
                  <div ref={messagesEndRef} />
                </>
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
                  autoFocus
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
              <h3>Welcome to E2EE Chat (Simplified)</h3>
              <p>Select a conversation or search for users to start chatting securely.</p>
              <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '15px' }}>
                🔒 All messages are encrypted with a master session key
                <br />
                🔑 New messages will work immediately
              </p>
              <button 
                onClick={() => window.SimpleCrypto?.clearAll()}
                style={{ 
                  marginTop: '15px', 
                  padding: '8px 16px', 
                  fontSize: '13px',
                  background: '#e53e3e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Reset Keys
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ChatWindow;