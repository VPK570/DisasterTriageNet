import sqlite3
import os
from config import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn

def create_user(user_id, name, email, password_hash, role, created_at):
    conn = None
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO users (id, name, email, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, name, email, password_hash, role, created_at))
        conn.commit()
    except sqlite3.IntegrityError:
        return False # Email likely exists
    finally:
        if conn:
            conn.close()
    return True

def get_user_by_email(email):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    return dict(user) if user else None

def get_user_by_id(user_id):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    return dict(user) if user else None
