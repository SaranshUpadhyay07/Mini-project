"""
MongoDB connection wrapper.
Reuses the same connection pattern and env variable as /api.
"""
import os
import time
from typing import Optional

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database

load_dotenv()

_client: Optional[MongoClient] = None
_db: Optional[Database] = None

FILE = "Agent/db/mongo.py"


def _log(fn: str, message: str) -> None:
    print(f"[{FILE}] [{fn}] {message}", flush=True)


def connect_db() -> Database:
    """
    Connect to MongoDB using MONGO_URI (same as /api).
    Returns the database instance.
    """
    global _client, _db
    fn = "connect_db"

    if _db is not None:
        _log(fn, "already connected")
        return _db

    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        _log(fn, "error MONGO_URI not found in environment")
        raise RuntimeError("MONGO_URI not found in environment")

    _log(fn, "connecting to MongoDB")
    
    # Retry logic for connection issues
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            # Longer timeout, allow reading from secondaries if primary unavailable
            _client = MongoClient(
                mongo_uri,
                tls=True,
                serverSelectionTimeoutMS=15000,  # 15 seconds
                connectTimeoutMS=15000,
                socketTimeoutMS=15000,
                readPreference='primaryPreferred'  # Try primary, fall back to secondary (string value)
            )
            
            # Ping to verify connection (will use secondary if primary unavailable)
            _client.admin.command("ping")
            
            # Use specific database name (same as /api service)
            _db = _client["pilgrim_itinerary"]
            _log(fn, f"connected to database: {_db.name}")
            return _db
            
        except Exception as e:
            _log(fn, f"connection attempt {attempt}/{max_retries} failed: {e}")
            
            if attempt < max_retries:
                wait_time = 2 * attempt  # Exponential backoff: 2s, 4s, 6s
                _log(fn, f"retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                # Final attempt failed
                _log(fn, "all connection attempts failed")
                raise RuntimeError(f"Failed to connect to MongoDB after {max_retries} attempts: {e}")


def get_db() -> Database:
    """Get the database instance (must connect first)."""
    if _db is None:
        return connect_db()
    return _db


def close_db() -> None:
    """Close MongoDB connection."""
    global _client, _db
    fn = "close_db"
    if _client:
        _log(fn, "closing connection")
        _client.close()
        _client = None
        _db = None
        _log(fn, "connection closed")
