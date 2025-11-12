import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional

class Database:
    def __init__(self, db_path='chat.db'):
        self.db_path = db_path
        
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable dict-like access
        return conn
    
    def init_db(self):
        """Initialize database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Users table - stores username, hashed password, and public key
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                public_key TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Messages table - stores only encrypted messages
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_username TEXT NOT NULL,
                receiver_username TEXT NOT NULL,
                encrypted_content TEXT NOT NULL,
                iv TEXT NOT NULL,
                encrypted_session_key TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_username) REFERENCES users (username),
                FOREIGN KEY (receiver_username) REFERENCES users (username)
            )
        ''')
        
        # Sessions table - for managing user sessions
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users (username)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_user(self, username: str, password_hash: str, public_key: str) -> bool:
        """Create a new user"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                'INSERT INTO users (username, password_hash, public_key) VALUES (?, ?, ?)',
                (username, password_hash, public_key)
            )
            
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            conn.close()
            return False  # Username already exists
    
    def get_user(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    def get_user_public_key(self, username: str) -> Optional[str]:
        """Get user's public key"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT public_key FROM users WHERE username = ?', (username,))
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return row['public_key']
        return None
    
    def store_message(self, sender: str, receiver: str, encrypted_content: str, iv: str, encrypted_session_key: str = None) -> bool:
        """Store encrypted message"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                'INSERT INTO messages (sender_username, receiver_username, encrypted_content, iv, encrypted_session_key) VALUES (?, ?, ?, ?, ?)',
                (sender, receiver, encrypted_content, iv, encrypted_session_key)
            )
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error storing message: {e}")
            conn.close()
            return False
    
    def get_messages(self, username: str, other_username: str = None) -> List[Dict]:
        """Get messages for a user (optionally filtered by conversation partner)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if other_username:
            # Get messages between two specific users
            cursor.execute('''
                SELECT * FROM messages 
                WHERE (sender_username = ? AND receiver_username = ?) 
                   OR (sender_username = ? AND receiver_username = ?)
                ORDER BY timestamp ASC
            ''', (username, other_username, other_username, username))
        else:
            # Get all messages for the user
            cursor.execute('''
                SELECT * FROM messages 
                WHERE sender_username = ? OR receiver_username = ?
                ORDER BY timestamp ASC
            ''', (username, username))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def get_conversations(self, username: str) -> List[Dict]:
        """Get list of users the current user has conversations with"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT DISTINCT 
                CASE 
                    WHEN sender_username = ? THEN receiver_username 
                    ELSE sender_username 
                END as contact_username,
                MAX(timestamp) as last_message_time
            FROM messages 
            WHERE sender_username = ? OR receiver_username = ?
            GROUP BY contact_username
            ORDER BY last_message_time DESC
        ''', (username, username, username))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def create_session(self, username: str, session_token: str, expires_at: datetime) -> bool:
        """Create a user session"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute(
                'INSERT INTO sessions (username, session_token, expires_at) VALUES (?, ?, ?)',
                (username, session_token, expires_at)
            )
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error creating session: {e}")
            conn.close()
            return False
    
    def get_session(self, session_token: str) -> Optional[Dict]:
        """Get session by token"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT * FROM sessions WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP',
            (session_token,)
        )
        row = cursor.fetchone()
        
        conn.close()
        
        if row:
            return dict(row)
        return None
    
    def delete_session(self, session_token: str) -> bool:
        """Delete a session (logout)"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM sessions WHERE session_token = ?', (session_token,))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            conn.close()
            return False
    
    def search_users(self, query: str, current_user: str) -> List[str]:
        """Search for users by username (excluding current user)"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Search for usernames that contain the query (case-insensitive)
            cursor.execute('''
                SELECT username FROM users 
                WHERE username LIKE ? AND username != ?
                ORDER BY username
                LIMIT 10
            ''', (f'%{query}%', current_user))
            
            rows = cursor.fetchall()
            conn.close()
            
            return [row['username'] for row in rows]
        except Exception as e:
            print(f"Error searching users: {e}")
            conn.close()
            return []
    
    def get_all_users(self, current_user: str) -> List[str]:
        """Get all users except the current user"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT username FROM users 
                WHERE username != ?
                ORDER BY username
            ''', (current_user,))
            
            rows = cursor.fetchall()
            conn.close()
            
            return [row['username'] for row in rows]
        except Exception as e:
            print(f"Error getting all users: {e}")
            conn.close()
            return []