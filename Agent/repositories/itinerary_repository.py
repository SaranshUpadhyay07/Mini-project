"""
Simple itinerary repository for MongoDB storage.
"""
from typing import Any, Dict, Optional
from datetime import timedelta
from pymongo.collection import Collection


class ItineraryRepository:
    """Repository for storing itineraries by (user_id, chat_id)."""
    
    def __init__(self, collection: Collection):
        self.collection = collection
        self._ensure_indexes()
    
    def _ensure_indexes(self) -> None:
        """Create necessary indexes."""
        # Compound index for user_id + chat_id lookups
        self.collection.create_index([("user_id", 1), ("chat_id", 1)], unique=True)
        
        # TTL index - auto-delete after 60 days of inactivity
        self.collection.create_index(
            "last_activity_at",
            expireAfterSeconds=int(timedelta(days=60).total_seconds())
        )
        
        print(f"[ItineraryRepository] Indexes created/verified", flush=True)
    
    def get(self, user_id: str, chat_id: str) -> Optional[Dict[str, Any]]:
        """Get itinerary by user_id and chat_id."""
        return self.collection.find_one({"user_id": user_id, "chat_id": chat_id})
    
    def save(self, user_id: str, chat_id: str, itinerary: Dict[str, Any], message: str) -> None:
        """Save or update itinerary."""
        from datetime import datetime
        
        existing = self.get(user_id, chat_id)
        
        if existing:
            # Update existing
            now = datetime.utcnow()
            chat_history = existing.get("chat_history", []) + [message]
            self.collection.update_one(
                {"user_id": user_id, "chat_id": chat_id},
                {
                    "$set": {
                        "itinerary": itinerary,
                        "chat_history": chat_history,
                        "updated_at": now,
                        "last_activity_at": now,
                    }
                }
            )
        else:
            # Create new
            now = datetime.utcnow()
            self.collection.insert_one({
                "user_id": user_id,
                "chat_id": chat_id,
                "itinerary": itinerary,
                "chat_history": [message],
                "created_at": now,
                "updated_at": now,
                "last_activity_at": now,
            })
    
    def reset(self, user_id: str, chat_id: str) -> None:
        """Delete itinerary for this user/chat."""
        self.collection.delete_one({"user_id": user_id, "chat_id": chat_id})
    
    def has_itinerary(self, user_id: str, chat_id: str) -> bool:
        """Check if itinerary exists."""
        return self.get(user_id, chat_id) is not None
    
    def list_by_user(self, user_id: str, limit: int = 50) -> list[Dict[str, Any]]:
        """Get all itineraries for a user, sorted by most recent activity."""
        cursor = self.collection.find(
            {"user_id": user_id}
        ).sort("last_activity_at", -1).limit(limit)
        return list(cursor)
