"""
Database Connection Configuration
Connects to Neon PostgreSQL (serverless) via SQLAlchemy.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. "
        "Add it to your .env file. Example:\n"
        "DATABASE_URL=postgresql+psycopg2://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
    )

# Auto-convert postgresql:// → postgresql+psycopg2:// for SQLAlchemy
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Neon requires SSL — ensure sslmode=require is in the URL
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,        # Reconnect stale connections
    pool_size=5,               # Connection pool size
    max_overflow=10,           # Extra connections when pool is full
    echo=False,                # Set True for SQL query logging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
