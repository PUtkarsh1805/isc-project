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

      // Smart polling every 3 sec
      pollingIntervalRef.current = setInterval(() => {
        checkForNewMessages(activeConversation.contact_username);
      }, 3000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [activeConversation]);

  // Auto-scroll
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
      if (showLoading) setIsLoading(true);

      const response = await chatAPI.getMessages(withUsername);
      const { SimpleCrypto } = await import('../utils/simple-crypto');

      const decryptedMessages = await Promise.all(
        response.data.messages.map(async (msg) => {
          try {
            const isReceived = msg.sender_username !== user.username;

            // decrypt any session key first
            if (isReceived && msg.encrypted_session_key) {
              await SimpleCrypto.decryptAndStoreSessionKey(
                msg.encrypted_session_key,
                msg.sender_username
              );
            }

            // decrypt message
            const decryptedContent = await SimpleCrypto.decrypt(
              msg.encrypted_content,
              msg.iv
            );

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

      lastMessageCountRef.current = decryptedMessages.length;
      setMessages(decryptedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const checkForNewMessages = async (withUsername) => {
    try {
      const response = await chatAPI.getMessages(withUsername);

      if (response.data.messages.length !== lastMessageCountRef.current) {
        await loadMessages(withUsername, false);
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  };

  const startConversation = async (username) => {
    try {
      setActiveConversation({ contact_username: username });

      const exists = conversations.find(c => c.contact_username === username);
      if (!exists) {
        setConversations(prev => [
          ...prev,
          { contact_username: username, last_message_time: new Date().toISOString() }
        ]);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation. Make sure the user exists.');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !activeConversation || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const receiverUsername = activeConversation.contact_username;
      const { SimpleCrypto } = await import('../utils/simple-crypto');

      // encrypt message
      const encrypted = await SimpleCrypto.encrypt(messageText);

      // encrypt key for recipient
      const encryptedKey = await SimpleCrypto.encryptKeyFor(receiverUsername);

      await chatAPI.sendMessage({
        receiver_username: receiverUsername,
        encrypted_content: encrypted.ciphertext,
        iv: encrypted.iv,
        encrypted_session_key: encryptedKey
      });

      // Optimistic insert
      const newMsg = {
        id: Date.now(),
        sender_username: user.username,
        receiver_username: receiverUsername,
        decrypted_content: messageText,
        type: 'sent',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMsg]);
      lastMessageCountRef.current += 1;

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
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
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
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ChatWindow;
