from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from database import Database
import secrets
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)
db = Database()

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user with username, password, and public key"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'password', 'public_key']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        username = data['username'].strip()
        password = data['password']
        public_key = data['public_key']
        
        # Validate username length and characters
        if len(username) < 3 or len(username) > 50:
            return jsonify({"error": "Username must be between 3 and 50 characters"}), 400
        
        if not username.replace('_', '').replace('-', '').isalnum():
            return jsonify({"error": "Username can only contain letters, numbers, hyphens, and underscores"}), 400
        
        # Validate password strength
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400
        
        # Hash the password
        password_hash = generate_password_hash(password)
        
        # Try to create the user
        success = db.create_user(username, password_hash, public_key)
        
        if success:
            return jsonify({
                "message": "User registered successfully",
                "username": username
            }), 201
        else:
            return jsonify({"error": "Username already exists"}), 409
            
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and create session"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'username' not in data or 'password' not in data:
            return jsonify({"error": "Username and password are required"}), 400
        
        username = data['username'].strip()
        password = data['password']
        
        # Get user from database
        user = db.get_user(username)
        
        if not user:
            return jsonify({"error": "Invalid username or password"}), 401
        
        # Check password
        if not check_password_hash(user['password_hash'], password):
            return jsonify({"error": "Invalid username or password"}), 401
        
        # Create session
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=24)  # 24 hour session
        
        success = db.create_session(username, session_token, expires_at)
        
        if success:
            return jsonify({
                "message": "Login successful",
                "session_token": session_token,
                "username": username,
                "expires_at": expires_at.isoformat()
            }), 200
        else:
            return jsonify({"error": "Failed to create session"}), 500
            
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout user and delete session"""
    try:
        # Get session token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
        
        session_token = auth_header.split(' ')[1]
        
        # Delete the session
        success = db.delete_session(session_token)
        
        if success:
            return jsonify({"message": "Logout successful"}), 200
        else:
            return jsonify({"error": "Invalid session"}), 401
            
    except Exception as e:
        print(f"Logout error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@auth_bp.route('/verify', methods=['GET'])
def verify_session():
    """Verify if session token is valid"""
    try:
        # Get session token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
        
        session_token = auth_header.split(' ')[1]
        
        # Check if session exists and is valid
        session = db.get_session(session_token)
        
        if session:
            return jsonify({
                "valid": True,
                "username": session['username'],
                "expires_at": session['expires_at']
            }), 200
        else:
            return jsonify({"valid": False, "error": "Invalid or expired session"}), 401
            
    except Exception as e:
        print(f"Session verification error: {e}")
        return jsonify({"error": "Internal server error"}), 500

def require_auth(f):
    """Decorator to require authentication for routes"""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get session token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
        
        session_token = auth_header.split(' ')[1]
        
        # Check if session exists and is valid
        session = db.get_session(session_token)
        
        if not session:
            return jsonify({"error": "Invalid or expired session"}), 401
        
        # Add user info to request context
        request.current_user = session['username']
        
        return f(*args, **kwargs)
    
    return decorated_function