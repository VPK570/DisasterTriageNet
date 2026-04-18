import sqlite3
import os
import glob
import importlib.util
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import DB_PATH
from lib.logging_config import get_logger

logger = get_logger('triage.migrations')

def run_migrations():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA busy_timeout=5000')
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY
        )
    ''')
    
    cursor.execute("SELECT MAX(version) FROM schema_version")
    row = cursor.fetchone()
    current_version = row[0] if row[0] is not None else 0

    migrations_dir = os.path.dirname(__file__)
    migration_files = sorted(glob.glob(os.path.join(migrations_dir, "[0-9][0-9][0-9]_*.py")))

    applied_any = False

    for file_path in migration_files:
        filename = os.path.basename(file_path)
        version = int(filename[:3])

        if version > current_version:
            applied_any = True
            logger.info("Applying migration: %s", filename)
            try:
                spec = importlib.util.spec_from_file_location("migration_module", file_path)
                migration_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(migration_module)

                conn.execute('BEGIN TRANSACTION')
                migration_module.up(cursor)
                
                cursor.execute("INSERT INTO schema_version (version) VALUES (?)", (version,))
                conn.commit()
                logger.info("Migration %s applied successfully.", filename)
            except Exception as e:
                conn.rollback()
                logger.error("Migration %s failed: %s", filename, str(e), exc_info=True)
                raise e

    if not applied_any:
        logger.info("Database is already up to date.")
    
    conn.close()

if __name__ == "__main__":
    run_migrations()
