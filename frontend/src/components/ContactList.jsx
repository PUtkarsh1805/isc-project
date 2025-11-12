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
    <div className="conversations">
      {/* Search Input */}
      <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(226, 232, 240, 0.3)' }}>
        <input
          type="text"
          className="search-input"
          placeholder="Search users to start chatting..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div>
          <div style={{ 
            padding: '10px 20px', 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#718096',
            background: 'rgba(247, 250, 252, 0.5)' 
          }}>
            {isSearching ? 'Searching...' : `Search Results for "${searchQuery}"`}
          </div>
          
          {!isSearching && searchResults.length === 0 && searchQuery.length >= 2 && (
            <div style={{ 
              padding: '15px 20px', 
              fontSize: '14px', 
              color: '#718096',
              textAlign: 'center' 
            }}>
              No users found
            </div>
          )}
          
          {searchResults.map((username) => (
            <div
              key={username}
              className="conversation-item"
              onClick={() => handleStartConversation(username)}
              style={{ cursor: 'pointer' }}
            >
              <div className="conversation-name">
                {username}
                <span style={{ 
                  marginLeft: '8px', 
                  fontSize: '11px', 
                  color: '#667eea',
                  fontWeight: '500' 
                }}>
                  + Start Chat
                </span>
              </div>
              <div className="conversation-time">New conversation</div>
            </div>
          ))}
          
          {searchResults.length > 0 && (
            <div style={{ 
              padding: '10px 20px', 
              borderBottom: '1px solid rgba(226, 232, 240, 0.3)',
              background: 'rgba(247, 250, 252, 0.3)' 
            }}></div>
          )}
        </div>
      )}

      {/* Existing Conversations */}
      {!searchQuery && (
        <>
          {conversations.length > 0 && (
            <div style={{ 
              padding: '10px 20px', 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#718096',
              background: 'rgba(247, 250, 252, 0.5)' 
            }}>
              Recent Conversations
            </div>
          )}
          
          {conversations.length === 0 ? (
            <div style={{ 
              padding: '30px 20px', 
              textAlign: 'center', 
              color: '#718096',
              fontSize: '14px' 
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>💬</div>
              <p>No conversations yet</p>
              <p style={{ fontSize: '12px', marginTop: '5px' }}>
                Search for users above to start chatting
              </p>
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
                <div className="conversation-name">
                  {conversation.contact_username}
                </div>
                <div className="conversation-time">
                  {formatTime(conversation.last_message_time)}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

export default ContactList;