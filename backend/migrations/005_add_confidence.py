def up(cursor):
    try:
        cursor.execute("ALTER TABLE victims ADD COLUMN confidence REAL")
    except Exception as e:
        if "duplicate column name" not in str(e).lower():
            raise e
