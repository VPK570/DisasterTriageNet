import sqlite3
import os
import glob
import importlib.util
import sys

# Ensure config can be imported securely
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import DB_PATH

def run_migrations():
    # Only establish database connection to apply structure
    conn = sqlite3.connect(DB_PATH, timeout=30)
    cursor = conn.cursor()

    # Create schema_version table if missing
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY
        )
    ''')
    
    # Get current version
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
            print(f"Applying migration: {filename}")
            try:
                # Load the migration module
                spec = importlib.util.spec_from_file_location("migration_module", file_path)
                migration_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(migration_module)

                # Run the migration
                conn.execute('BEGIN TRANSACTION')
                migration_module.up(cursor)
                
                # Update schema version
                cursor.execute("INSERT INTO schema_version (version) VALUES (?)", (version,))
                conn.commit()
                print(f"✅ Migration {filename} applied successfully.")
            except Exception as e:
                conn.rollback()
                print(f"❌ Migration {filename} failed: {e}")
                raise e

    if not applied_any:
        print("Database is already up to date.")
    
    conn.close()

if __name__ == "__main__":
    run_migrations()
