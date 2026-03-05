"""Check users table structure"""
from database.connection import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)
columns = inspector.get_columns('users')

print("Users table columns:")
print("-" * 60)
for col in columns:
    print(f"{col['name']:30} {str(col['type']):20} {'NULL' if col['nullable'] else 'NOT NULL'}")
