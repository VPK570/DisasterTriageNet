"""
db.py — Canonical database connection factory.

All modules that need a SQLite connection must import get_db_connection from
here.  This ensures a single, consistent connection configuration across the
entire backend:
  - WAL journal mode    (concurrent reads during writes)
  - busy_timeout 5000ms (retry instead of immediately raising OperationalError)
  - synchronous NORMAL  (safe default with WAL)
  - Row factory         (column-name access on every row)
"""
import sqlite3
from config import DB_PATH


def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA busy_timeout=5000')
    conn.execute('PRAGMA synchronous=NORMAL')
    conn.row_factory = sqlite3.Row
    return conn
