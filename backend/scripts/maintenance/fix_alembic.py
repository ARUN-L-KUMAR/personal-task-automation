"""Fix Alembic migration state"""
from database.connection import engine
from sqlalchemy import text

# Check current version in database
with engine.connect() as conn:
    try:
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        current = result.fetchone()
        print(f"Current DB version: {current[0] if current else 'None'}")
    except Exception as e:
        print(f"Error: {e}")
        print("Creating alembic_version table...")
        
    # Delete and reset to the latest migration
    print("\nResetting to latest migration: 1b64e09c7b9c")
    conn.execute(text("DELETE FROM alembic_version"))
    conn.execute(text("INSERT INTO alembic_version VALUES ('1b64e09c7b9c')"))
    conn.commit()
    print("✓ Migration state reset successfully!")
