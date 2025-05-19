import os

import psycopg2


def get_db():
    db_url = os.getenv("DB_URL")
    if not db_url:
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASS", "")
        db_name = os.getenv("DB_NAME", "migrateit")
        db_url = f"postgresql://{user}{f':{password}' if password else ''}@{host}:{port}/{db_name}"
    if not db_url:
        raise ValueError("DB_URL environment variable is not set")

    conn = psycopg2.connect(db_url)
    try:
        yield conn
    finally:
        conn.close()
