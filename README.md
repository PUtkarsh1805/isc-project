# 🔒 End-to-End Encrypted Chat Web Application

A secure, end-to-end encrypted chat application built with React and Python Flask that ensures only the sender and intended receiver can read messages.

## 🚀 Features

- **🔐 End-to-End Encryption**: Messages are encrypted using AES-256-GCM on the client side
- **🔑 RSA Key Exchange**: Secure key exchange using RSA-2048 encryption
- **👤 User Authentication**: Secure registration and login system
- **💬 Real-time Messaging**: Send and receive encrypted messages instantly
- **🔍 User Search**: Find and start conversations with other users
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🛡️ Zero Server Access**: Server never sees plaintext messages or private keys

## 🏗️ Architecture

### Security Model
- **Client-side Encryption**: All encryption/decryption happens in the browser using Web Crypto API
- **Hybrid Cryptography**: RSA for key exchange + AES-GCM for message encryption
- **Key Management**: Private keys stored only in browser localStorage, never transmitted
- **Perfect Forward Secrecy**: Each conversation uses unique session keys

### Tech Stack
- **Frontend**: React 18 + Vite (Web Crypto API for encryption)
- **Backend**: Python Flask (message routing, authentication)
- **Database**: SQLite (stores only public keys and encrypted messages)
- **Cryptography**: 
  - RSA-2048 for asymmetric key exchange
  - AES-256-GCM for symmetric message encryption
  - SHA-256 for key derivation and hashing

## 📁 Project Structure

```
encrypted-chat/
├── backend/
│   ├── app.py              # Flask application entry point
│   ├── database.py         # SQLite database operations
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example       # Environment variables template
│   └── routes/
│       ├── auth.py        # Authentication endpoints
│       └── chat.py        # Chat and messaging endpoints
├── frontend/
│   ├── package.json       # Node.js dependencies
│   ├── vite.config.js     # Vite configuration
│   ├── index.html         # HTML template
│   ├── src/
│   │   ├── App.jsx        # Main application component
│   │   ├── main.jsx       # Application entry point
│   │   ├── index.css      # Global styles
│   │   ├── components/    # React components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   └── ContactList.jsx
│   │   └── utils/         # Utility functions
│   │       ├── crypto.js  # Encryption utilities
│   │       └── api.js     # API client
│   └── public/            # Static assets
├── .github/
│   └── copilot-instructions.md
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites
- **Python 3.8+** (Python 3.13.3 recommended)
- **Node.js 16+** and npm
- Modern web browser with Web Crypto API support

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd encrypted-chat

# Or if you're starting fresh, create the directory structure as shown above
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install Python dependencies
pip install -r requirements.txt

# Copy environment variables template
copy .env.example .env  # On Unix: cp .env.example .env

# Edit .env file and set your configuration
# At minimum, change the SECRET_KEY to a secure random string
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install Node.js dependencies
npm install
```

### 4. Running the Application

#### Start the Backend (Terminal 1)
```bash
cd backend
python app.py
```
The Flask API will start on `http://localhost:5000`

#### Start the Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
The React app will start on `http://localhost:3000`

### 5. Access the Application
Open your browser and navigate to `http://localhost:3000`

## 🔐 Cryptographic Implementation

### Key Generation and Exchange

1. **User Registration**:
   - Client generates RSA-2048 key pair using Web Crypto API
   - Public key sent to server for storage
   - Private key stored only in browser localStorage

2. **Starting a Conversation**:
   - Client fetches recipient's public key from server
   - Generates AES-256 session key for the conversation
   - Session key encrypted with recipient's RSA public key
   - Encrypted session key could be sent via initial message (not implemented in this version)

### Message Encryption Flow

```
Sender                          Server                     Receiver
  |                               |                          |
  |-- Generate AES session key ---|                          |
  |-- Encrypt message with AES ---|-- Store ciphertext ---> |
  |                               |                          |-- Decrypt with AES --|
```

#### Detailed Encryption Process:

1. **Message Encryption** (Sender):
   ```javascript
   // Generate or retrieve AES session key
   const sessionKey = await generateAESKey();
   
   // Encrypt message
   const iv = crypto.getRandomValues(new Uint8Array(12));
   const encrypted = await crypto.subtle.encrypt(
     { name: 'AES-GCM', iv: iv },
     sessionKey,
     messageText
   );
   ```

2. **Server Storage**:
   - Server receives only: `{sender, receiver, encrypted_content, iv}`
   - No access to plaintext message or encryption keys

3. **Message Decryption** (Receiver):
   ```javascript
   // Retrieve AES session key from localStorage
   const sessionKey = await getSessionKey(senderUsername);
   
   // Decrypt message
   const decrypted = await crypto.subtle.decrypt(
     { name: 'AES-GCM', iv: storedIV },
     sessionKey,
     encryptedContent
   );
   ```

## 🛡️ Security Analysis

### Confidentiality ✅
- **AES-256-GCM**: Military-grade symmetric encryption for message content
- **RSA-2048**: Strong asymmetric encryption for key exchange
- **Client-side Only**: All encryption/decryption happens in browser
- **Zero Server Knowledge**: Server never has access to plaintext

### Integrity ✅
- **AES-GCM**: Built-in authentication prevents message tampering
- **Cryptographic Hashing**: SHA-256 used for key derivation
- **Session Management**: Secure token-based authentication

### Authenticity ✅
- **RSA Key Pairs**: Verify user identity through public key cryptography
- **Secure Authentication**: Password hashing with werkzeug security
- **Session Tokens**: Prevent unauthorized access

### Forward Secrecy ✅
- **Unique Session Keys**: Each conversation uses separate AES keys
- **Ephemeral Keys**: Session keys can be rotated (extensible)
- **Local Key Storage**: Keys stored only in browser, cleared on logout

## 🔍 API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /register` - Register new user with public key
- `POST /login` - Authenticate user and create session
- `POST /logout` - Invalidate user session
- `GET /verify` - Verify session token validity

### Chat Routes (`/api/chat`)
- `GET /users` - Get list of users (for contact discovery)
- `GET /public-key/<username>` - Get user's public key
- `POST /send` - Send encrypted message
- `GET /messages?with=<username>` - Get encrypted messages
- `GET /conversations` - Get list of active conversations
- `GET /search-users?q=<query>` - Search for users

## 🧪 Testing the Application

### Manual Testing Workflow

1. **Register two users**:
   - Open two browser windows/tabs
   - Register as "alice" in one, "bob" in another
   - Note: Each user gets a unique RSA key pair

2. **Start a conversation**:
   - In Alice's window, search for "bob"
   - Click to start a conversation
   - This generates a shared AES session key

3. **Send encrypted messages**:
   - Type a message and send
   - Verify it appears encrypted in network tab
   - Confirm Bob receives and can decrypt the message

4. **Verify encryption**:
   - Check browser DevTools → Network tab
   - Verify message payloads show only encrypted content
   - Check database (chat.db) - should only contain ciphertext

### Security Testing

- **Key Isolation**: Logout and verify keys are cleared
- **Network Inspection**: Confirm no plaintext in network traffic
- **Database Inspection**: Verify encrypted storage only
- **Cross-Browser**: Test key exchange between different browsers

## 🚧 Known Limitations & Future Improvements

### Current Limitations
1. **Key Exchange**: Simplified key exchange (assumes users can establish session keys)
2. **Key Rotation**: No automatic key rotation implementation
3. **Group Chat**: Currently supports only 1:1 conversations
4. **File Sharing**: No encrypted file transfer capability
5. **Message Persistence**: Keys lost if localStorage is cleared

### Potential Improvements
1. **Signal Protocol**: Implement Double Ratchet for perfect forward secrecy
2. **WebRTC**: Direct peer-to-peer messaging
3. **PWA Support**: Offline capability and mobile app experience
4. **Key Backup**: Secure key backup and recovery system
5. **WebSocket**: Real-time message delivery
6. **File Encryption**: Support for encrypted file sharing

## 📋 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure backend is running on port 5000
   - Check CORS configuration in Flask app

2. **Crypto API Not Available**:
   - Use HTTPS or localhost (required for Web Crypto API)
   - Ensure modern browser support

3. **Key Not Found Errors**:
   - Clear localStorage and re-register
   - Ensure both users are registered before starting conversation

4. **Database Issues**:
   - Delete `chat.db` file and restart backend
   - Check Python dependencies are installed

### Debug Mode
Set `FLASK_ENV=development` in `.env` file for detailed error messages.

## 📄 License

This project is created for educational purposes to demonstrate end-to-end encryption implementation. Use and modify as needed for learning and development.

## 🤝 Contributing

This is a prototype for learning purposes. Feel free to:
- Report bugs and issues
- Suggest security improvements
- Add new features
- Improve documentation

## 🔗 Resources

- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [AES-GCM Specification](https://tools.ietf.org/html/rfc5116)
- [RSA-OAEP Specification](https://tools.ietf.org/html/rfc3447)
- [Signal Protocol](https://signal.org/docs/)

---

**⚠️ Security Notice**: This is a demonstration/educational implementation. For production use, consider additional security measures like key rotation, proper key exchange protocols, and security audits.