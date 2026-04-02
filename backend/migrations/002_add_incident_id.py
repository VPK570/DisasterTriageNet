import sys
import os

# Ensure config can be imported securely
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import DEFAULT_INCIDENT_ID

def up(cursor):
    # Ignore errors if the columns already exist
    try:
        cursor.execute(f"ALTER TABLE victims ADD COLUMN incident_id TEXT DEFAULT '{DEFAULT_INCIDENT_ID}' REFERENCES incidents(id)")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            raise e

    try:
        cursor.execute(f"ALTER TABLE clusters ADD COLUMN incident_id TEXT DEFAULT '{DEFAULT_INCIDENT_ID}' REFERENCES incidents(id)")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            raise e
