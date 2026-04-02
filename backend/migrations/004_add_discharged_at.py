def up(cursor):
    try:
        cursor.execute("ALTER TABLE victims ADD COLUMN discharged_at TEXT DEFAULT NULL")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            raise e
