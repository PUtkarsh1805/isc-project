from flask import Blueprint, request, jsonify
from routes.auth import require_auth
from database import Database

chat_bp = Blueprint('chat', __name__)
db = Database()

@chat_bp.route('/users', methods=['GET'])
@require_auth
def get_users():
    """Get list of all users (for contact list)"""
    try:
        current_user = request.current_user
        
        # Get all users except the current user
        users = db.get_all_users(current_user)
        
        return jsonify({
            "users": users,
            "message": "Users retrieved successfully"
        }), 200
        
    except Exception as e:
        print(f"Error getting users: {e}")
        return jsonify({"error": "Internal server error"}), 500

@chat_bp.route('/public-key/<username>', methods=['GET'])
@require_auth
def get_public_key(username):
    """Get a user's public key for key exchange"""
    try:
        public_key = db.get_user_public_key(username)
        
        if public_key:
            return jsonify({
                "username": username,
                "public_key": public_key
            }), 200
        else:
            return jsonify({"error": "User not found"}), 404
            
    except Exception as e:
        print(f"Error getting public key: {e}")
        return jsonify({"error": "Internal server error"}), 500

@chat_bp.route('/send', methods=['POST'])
@require_auth
def send_message():
    """Send an encrypted message"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['receiver_username', 'encrypted_content', 'iv']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        sender_username = request.current_user
        receiver_username = data['receiver_username']
        encrypted_content = data['encrypted_content']
        iv = data['iv']
        encrypted_session_key = data.get('encrypted_session_key')  # Optional for first message
        
        # Check if receiver exists
        receiver = db.get_user(receiver_username)
        if not receiver:
            return jsonify({"error": "Receiver not found"}), 404
        
        # Store the encrypted message
        success = db.store_message(sender_username, receiver_username, encrypted_content, iv, encrypted_session_key)
        
        if success:
            return jsonify({
                "message": "Message sent successfully",
                "sender": sender_username,
                "receiver": receiver_username
            }), 201
        else:
            return jsonify({"error": "Failed to send message"}), 500
            
    except Exception as e:
        print(f"Error sending message: {e}")
        return jsonify({"error": "Internal server error"}), 500

@chat_bp.route('/messages', methods=['GET'])
@require_auth
def get_messages():
    """Get messages for the authenticated user"""
    try:
        username = request.current_user
        other_username = request.args.get('with')  # Optional: filter by conversation partner
        
        messages = db.get_messages(username, other_username)
        
        return jsonify({
            "messages": messages,
            "count": len(messages)
        }), 200
        
    except Exception as e:
        print(f"Error getting messages: {e}")
        return jsonify({"error": "Internal server error"}), 500

@chat_bp.route('/conversations', methods=['GET'])
@require_auth
def get_conversations():
    """Get list of conversations for the authenticated user"""
    try:
        username = request.current_user
        
        conversations = db.get_conversations(username)
        
        return jsonify({
            "conversations": conversations,
            "count": len(conversations)
        }), 200
        
    except Exception as e:
        print(f"Error getting conversations: {e}")
        return jsonify({"error": "Internal server error"}), 500

@chat_bp.route('/search-users', methods=['GET'])
@require_auth
def search_users():
    """Search for users to start new conversations"""
    try:
        query = request.args.get('q', '').strip()
        
        if len(query) < 2:
            return jsonify({"error": "Search query must be at least 2 characters"}), 400
        
        current_user = request.current_user
        
        # Search for real users in the database
        matching_users = db.search_users(query, current_user)
        
        return jsonify({
            "users": matching_users[:10],  # Limit to 10 results
            "query": query
        }), 200
        
    except Exception as e:
        print(f"Error searching users: {e}")
        return jsonify({"error": "Internal server error"}), 500