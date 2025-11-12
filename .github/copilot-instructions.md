# End-to-End Encrypted Chat Web App

## Project Overview
This is an End-to-End Encrypted Chat Web Application with:
- **Frontend**: React with Vite (Web Crypto API for encryption)
- **Backend**: Python Flask (message routing, authentication)
- **Database**: SQLite (stores public keys and encrypted messages only)
- **Security**: RSA/ECDH key exchange + AES-256-GCM encryption

## Architecture
- Client-side encryption/decryption using Web Crypto API
- Server never sees plaintext messages or private keys
- Asymmetric cryptography for key exchange
- Symmetric encryption for message content

## Development Status
✅ Project structure created
✅ Backend Flask API implemented  
✅ React frontend with crypto utilities
✅ Authentication and chat components
✅ SQLite database integration