# 🔒 End-to-End Encrypted Chat Web Application

A secure, end-to-end encrypted chat application built with React and Python Flask that ensures only the sender and intended receiver can read messages.

## 🚀 Features

- **🔐 End-to-End Encryption**: Messages are encrypted using AES-256-GCM on the client side
- **🔑 RSA Key Exchange**: Secure session key exchange using RSA-2048 encryption
- **👤 User Authentication**: Secure registration and login with session tokens
- **💬 Real-time Messaging**: Send and receive encrypted messages instantly
- **🔍 User Search**: Find and start conversations with other users
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🛡️ Zero Server Access**: Server never sees plaintext messages or private keys
- **🔄 Automatic Key Exchange**: Encrypted session keys sent with first message

## 🏗️ Architecture

### Security Model
- **Client-side Encryption**: All encryption/decryption happens in the browser using Web Crypto API
- **Hybrid Cryptography**: RSA-2048 for key exchange + AES-256-GCM for message encryption
- **Key Management**: Private keys stored only in browser localStorage, never transmitted
- **Session Key Sharing**: Master AES key encrypted with recipient's public RSA key
- **Automatic Decryption**: Receivers automatically decrypt session keys using their private RSA key

### Tech Stack
- **Frontend**: React 18 + Vite (Web Crypto API for encryption)
- **Backend**: Python Flask (message routing, authentication)
- **Database**: SQLite (stores only public keys and encrypted messages)
- **Cryptography**: 
  - RSA-2048 for asymmetric key exchange
  - AES-256-GCM for symmetric message encryption
  - SHA-256 for key derivation and hashing
  - PBKDF2 for key derivation in simplified crypto

## 📁 Project Structure

```
isc/
├── backend/
│   ├── app.py              # Flask application entry point
│   ├── database.py         # SQLite database operations
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example       # Environment variables template
│   ├── chat.db            # SQLite database (auto-generated)
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
│   │       ├── simple-crypto.js  # Simplified E2EE implementation (active)
│   │       ├── crypto.js         # Complex crypto utilities
│   │       ├── simpleCrypto.js   # Alternative crypto (for testing)
│   │       └── api.js            # Axios API client
│   └── public/            # Static assets
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
# On Windows:
venv\Scripts\activate
# On Unix/MacOS:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# The database (chat.db) will be created automatically on first run
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

### Current Implementation: SimpleCrypto

The application uses a **simplified master key approach** for easier key management:

1. **User Registration**:
   - Client generates RSA-2048 key pair using Web Crypto API
   - Client generates a random AES-256 master key
   - RSA public key sent to server for storage
   - RSA private key and AES master key stored only in browser localStorage

2. **Starting a Conversation**:
   - Sender fetches recipient's public RSA key from server
   - Sender encrypts their AES master key with recipient's public RSA key
   - Encrypted master key sent along with the first message

3. **Receiving Messages**:
   - Recipient receives encrypted master key from sender
   - Recipient decrypts master key using their RSA private key
   - Recipient stores decrypted master key for future message decryption
   - All subsequent messages from that sender use the same master key

### Message Encryption Flow

```
Sender                          Server                     Receiver
  |                               |                          |
  |-- Generate AES master key ----|                          |
  |-- Encrypt msg with AES -------|                          |
  |-- Encrypt master key w/ RSA --|                          |
  |-- Send both to server ------->|-- Store encrypted --->   |
  |                               |                          |-- Decrypt master key (RSA) --|
  |                               |                          |-- Decrypt message (AES) -----|
```

#### Detailed Encryption Process:

1. **Message Encryption** (Sender):
   ```javascript
   // SimpleCrypto.encrypt(message)
   const masterKey = await getMasterKey(); // Get or generate AES-256 key
   const iv = crypto.getRandomValues(new Uint8Array(12));
   const encrypted = await crypto.subtle.encrypt(
     { name: 'AES-GCM', iv: iv },
     masterKey,
     messageText
   );
   
   // Encrypt master key for recipient
   const encryptedMasterKey = await encryptKeyFor(recipientUsername);
   ```

2. **Server Storage**:
   - Server receives: `{sender, receiver, encrypted_content, iv, encrypted_session_key}`
   - Database stores only encrypted data
   - No access to plaintext message or encryption keys

3. **Message Decryption** (Receiver):
   ```javascript
   // SimpleCrypto.decryptAndStoreSessionKey(encryptedKey)
   const privateKey = await getRSAKeys(); // Get RSA private key
   const masterKeyBytes = await crypto.subtle.decrypt(
     { name: 'RSA-OAEP' },
     privateKey,
     encryptedSessionKey
   );
   // Store decrypted master key
   
   // SimpleCrypto.decrypt(ciphertext, iv)
   const decrypted = await crypto.subtle.decrypt(
     { name: 'AES-GCM', iv: iv },
     masterKey,
     encryptedContent
   );
   ```

## 🛡️ Security Analysis

### Confidentiality ✅
- **AES-256-GCM**: Military-grade symmetric encryption for message content
- **RSA-2048**: Strong asymmetric encryption for master key exchange
- **Client-side Only**: All encryption/decryption happens in browser
- **Zero Server Knowledge**: Server never has access to plaintext or private keys

### Integrity ✅
- **AES-GCM**: Built-in authentication prevents message tampering
- **Cryptographic Hashing**: SHA-256 used for key derivation
- **Session Management**: Secure token-based authentication
- **Message Authentication**: GCM mode provides authenticated encryption

### Authenticity ✅
- **RSA Key Pairs**: Verify user identity through public key cryptography
- **Secure Authentication**: Password hashing with werkzeug security
- **Session Tokens**: Prevent unauthorized access
- **Public Key Infrastructure**: Users verified by their registered public keys

### Key Management ✅
- **Master Key Approach**: Single AES key per user simplifies key management
- **Secure Key Exchange**: Master keys encrypted with RSA-2048
- **Automatic Decryption**: Receivers automatically decrypt and store sender's master key
- **Local Key Storage**: All private keys stored only in browser localStorage
- **Key Isolation**: Keys cleared on logout for security

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
   - Open two browser windows/tabs (or use incognito mode for second user)
   - Register as "alice" in one window, "bob" in another
   - Note: Each user gets a unique RSA key pair and AES master key

2. **Start a conversation**:
   - In Alice's window, search for "bob" in the search bar
   - Click on Bob's username to start a conversation
   - This prepares the encrypted key exchange

3. **Send encrypted messages**:
   - Alice types a message and clicks Send
   - The message is encrypted with Alice's master AES key
   - Alice's master key is encrypted with Bob's public RSA key
   - Both encrypted data sent to server

4. **Receive and decrypt**:
   - Bob opens the conversation with Alice
   - Bob's browser automatically decrypts Alice's master key using Bob's private RSA key
   - Bob's browser uses Alice's master key to decrypt all messages from Alice
   - Messages appear in plaintext for Bob

5. **Verify encryption**:
   - Open browser DevTools → Network tab
   - Click on the POST request to `/api/chat/send`
   - In Request payload, verify `encrypted_content` is base64 gibberish
   - Verify `encrypted_session_key` is also encrypted (base64 RSA ciphertext)
   - Check database (see "Viewing Encrypted Messages" section below)

### Viewing Encrypted Messages in Database

You can verify messages are encrypted by viewing the SQLite database:

```bash
# Windows Command Prompt
cd backend
sqlite3 chat.db
```

Then run:
```sql
-- View all messages
SELECT id, sender_username, receiver_username, 
       substr(encrypted_content, 1, 50) as encrypted_preview,
       timestamp 
FROM messages;

-- Exit
.exit
```

**Expected output:** You should see base64-encoded gibberish, not plaintext messages.

Alternatively, use **DB Browser for SQLite** (GUI tool): https://sqlitebrowser.org/

### Security Testing

- **Key Isolation**: Logout and verify keys are cleared
- **Network Inspection**: Confirm no plaintext in network traffic
- **Database Inspection**: Verify encrypted storage only
- **Cross-Browser**: Test key exchange between different browsers

## 🚧 Known Limitations & Future Improvements

### Current Limitations
1. **Single Master Key**: Each user has one master key (not per-conversation keys)
2. **No Key Rotation**: Master keys don't automatically rotate
3. **Group Chat**: Currently supports only 1:1 conversations
4. **File Sharing**: No encrypted file transfer capability
5. **Message Persistence**: Keys lost if localStorage is cleared
6. **No Message Editing**: Cannot edit or delete sent messages
7. **Limited Forward Secrecy**: Master key reused across all messages

### Potential Improvements
1. **Signal Protocol**: Implement Double Ratchet for perfect forward secrecy
2. **Per-Conversation Keys**: Generate unique session keys per conversation
3. **Key Rotation**: Automatic periodic key rotation
4. **WebRTC**: Direct peer-to-peer messaging
5. **PWA Support**: Offline capability and mobile app experience
6. **Key Backup**: Secure key backup and recovery system (encrypted cloud backup)
7. **WebSocket**: Real-time message delivery notifications
8. **File Encryption**: Support for encrypted file/image sharing
9. **Message Status**: Read receipts and delivery confirmation
10. **Multi-Device**: Sync encrypted messages across devices

## 📋 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure backend is running on port 5000
   - Check CORS is enabled in Flask app (already configured)
   - Verify frontend is accessing `http://localhost:5000`

2. **Crypto API Not Available**:
   - Use HTTPS or localhost (required for Web Crypto API)
   - Ensure modern browser support (Chrome 37+, Firefox 34+, Safari 11+)
   - Check browser console for detailed errors

3. **"Could not decrypt message" Errors**:
   - This is normal for old messages before key exchange
   - Send a new message to establish encrypted session key
   - Receiver will auto-decrypt sender's master key on first message

4. **Database Issues**:
   - Delete `chat.db` file and restart backend to recreate
   - Check Python dependencies are installed (`pip install -r requirements.txt`)
   - Verify SQLite3 is available on your system

5. **Registration Fails (500 Error)**:
   - Check backend terminal for Python errors
   - Ensure database is writable
   - Verify all required fields are provided

6. **Keys Lost After Logout**:
   - This is expected behavior (keys cleared from localStorage)
   - Re-login and send new message to re-establish encryption
   - Consider implementing key backup for production use

### Debug Commands

```bash
# Check if backend is running
curl http://localhost:5000/api/health

# View database contents
cd backend
sqlite3 chat.db "SELECT * FROM users;"

# Check frontend dependencies
cd frontend
npm list

# Clear browser data
# Open DevTools (F12) → Application → Clear Storage → Clear site data
```

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