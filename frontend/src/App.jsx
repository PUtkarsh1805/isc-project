import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import ChatWindow from './components/ChatWindow';
import { authAPI } from './utils/api';
import { ChatCrypto, KeyStorage } from './utils/crypto';

// Import crypto tests for debugging
import { testCryptoOperations, testKeyStorage } from './utils/cryptoTest';

// Add tests to window for easy access in console
if (typeof window !== 'undefined') {
  window.testCrypto = testCryptoOperations;
  window.testKeyStorage = testKeyStorage;
}

function App() {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'chat'
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const username = localStorage.getItem('username');
      
      if (!token || !username) {
        setIsLoading(false);
        return;
      }

      // Verify token with server
      const response = await authAPI.verifySession();
      
      if (response.data.valid) {
        // Initialize simple crypto
        const { SimpleCrypto } = await import('./utils/simple-crypto');
        await SimpleCrypto.getRSAKeys(); // Generate keys if needed
        
        setUser({
          username: response.data.username,
          token: token
        });
        setCurrentView('chat');
      } else {
        // Invalid token, clear storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('username');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (username, password) => {
    try {
      setError('');
      
      const response = await authAPI.login(username, password);
      
      // Store auth data
      localStorage.setItem('auth_token', response.data.session_token);
      localStorage.setItem('username', response.data.username);
      
      // Initialize user's cryptographic identity
      await ChatCrypto.initializeUser();
      
      setUser({
        username: response.data.username,
        token: response.data.session_token
      });
      
      setCurrentView('chat');
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    }
  };

  const handleRegister = async (username, password) => {
    try {
      setError('');
      
      // Clear any existing keys
      const { SimpleCrypto } = await import('./utils/simple-crypto');
      SimpleCrypto.clearAll();
      
      // Generate keys
      const { publicKeyString } = await SimpleCrypto.getRSAKeys();
      
      // Register with server
      await authAPI.register(username, password, publicKeyString);
      
      // Auto-login after successful registration
      await handleLogin(username, password);
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('username');
      
      // Clear only session keys (keep RSA keys)
      const { SimpleCrypto } = await import('./utils/simple-crypto');
      SimpleCrypto.clearSessionKeys();
      
      setUser(null);
      setCurrentView('login');
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="card auth-container">
          <div className="loading">
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {currentView === 'login' && (
        <div className="card auth-container">
          <h1 className="app-title">🔒 E2EE Chat</h1>
          <p className="app-subtitle">End-to-End Encrypted Messaging</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <Login 
            onLogin={handleLogin} 
            onSwitchToRegister={() => {
              setCurrentView('register');
              setError('');
            }} 
          />
        </div>
      )}

      {currentView === 'register' && (
        <div className="card auth-container">
          <h1 className="app-title">🔒 E2EE Chat</h1>
          <p className="app-subtitle">Create Your Secure Account</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <Register 
            onRegister={handleRegister} 
            onSwitchToLogin={() => {
              setCurrentView('login');
              setError('');
            }} 
          />
        </div>
      )}

      {currentView === 'chat' && user && (
        <div className="card chat-container">
          <ChatWindow 
            user={user} 
            onLogout={handleLogout} 
          />
        </div>
      )}
    </div>
  );
}

export default App;