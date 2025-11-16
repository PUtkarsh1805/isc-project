import React, { useState } from 'react';
import { chatAPI } from '../utils/api';

function ContactList({ 
  conversations, 
  activeConversation, 
  onSelectConversation, 
  onStartConversation 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await chatAPI.searchUsers(query);
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartConversation = async (username) => {
    await onStartConversation(username);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      {/* Search Input */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search or start new chat"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="conversations">
        {/* Search Results */}
        {searchQuery && (
          <>
            <div className="conversations-section-header">
              {isSearching ? 'Searching...' : 'Search Results'}
            </div>
            
            {!isSearching && searchResults.length === 0 && searchQuery.length >= 2 && (
              <div className="conversations-empty">
                <div className="conversations-empty-icon">🔍</div>
                <p>No users found matching "{searchQuery}"</p>
              </div>
            )}
            
            {searchResults.map((username) => (
              <div
                key={username}
                className="conversation-item"
                onClick={() => handleStartConversation(username)}
              >
                <div className="conversation-details">
                  <div className="conversation-name">
                    <span>{username}</span>
                    <span style={{ 
                      fontSize: '11px', 
                      color: 'var(--accent-green)',
                      fontWeight: '500' 
                    }}>
                      New
                    </span>
                  </div>
                  <div className="conversation-preview">
                    Start encrypted conversation
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Existing Conversations */}
        {!searchQuery && (
          <>
            {conversations.length > 0 && (
              <div className="conversations-section-header">
                Chats
              </div>
            )}
            
            {conversations.length === 0 ? (
              <div className="conversations-empty">
                <div className="conversations-empty-icon">💬</div>
                <h4 style={{ 
                  color: 'var(--text-primary)', 
                  marginBottom: '8px',
                  fontWeight: '400' 
                }}>
                  No conversations yet
                </h4>
                <p>Search for users to start chatting</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.contact_username}
                  className={`conversation-item ${
                    activeConversation?.contact_username === conversation.contact_username 
                      ? 'active' 
                      : ''
                  }`}
                  onClick={() => onSelectConversation(conversation)}
                >
                  <div className="conversation-details">
                    <div className="conversation-name">
                      <span>{conversation.contact_username}</span>
                      <span className="conversation-time">
                        {formatTime(conversation.last_message_time)}
                      </span>
                    </div>
                    <div className="conversation-preview">
                      Tap to view messages
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </>
  );
}

export default ContactList;