import sqlite3

conn = sqlite3.connect('chat.db')
cursor = conn.cursor()

cursor.execute('SELECT * FROM messages')
messages = cursor.fetchall()

print("=== ENCRYPTED MESSAGES ===\n")
for msg in messages:
    print(f"ID: {msg[0]}")
    print(f"From: {msg[1]} → To: {msg[2]}")
    print(f"Encrypted Content: {msg[3][:50]}...")
    print(f"IV: {msg[4][:30]}...")
    if msg[5]:
        print(f"Encrypted Session Key: {msg[5][:50]}...")
    print(f"Timestamp: {msg[6]}")
    print("-" * 60)

conn.close()