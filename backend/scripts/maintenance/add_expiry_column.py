"""Add missing google_token_expiry column"""
from database.connection import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN google_token_expiry TIMESTAMP"))
        conn.commit()
        print("✓ Added google_token_expiry column successfully!")
    except Exception as e:
        if "already exists" in str(e):
            print("✓ google_token_expiry column already exists!")
        else:
            print(f"Error: {e}")
