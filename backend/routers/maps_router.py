"""
Google Maps API Router

Endpoints:
- GET  /api/maps/directions  → Get directions (with alternatives & waypoints)
- GET  /api/maps/distance    → Distance matrix
- GET  /api/maps/geocode     → Geocode an address
- GET  /api/maps/reverse     → Reverse geocode lat/lng
- GET  /api/maps/suggest     → Place autocomplete suggestions
- GET  /api/maps/saved-routes     → List saved routes
- POST /api/maps/saved-routes     → Save a route
- DELETE /api/maps/saved-routes/{id} → Delete a saved route
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from utils.google_maps import (
    get_directions, get_distance_matrix,
    geocode, reverse_geocode, get_place_suggestions,
)
from database.connection import get_db
from database.models import User, SavedRoute
from middleware import get_current_user

router = APIRouter(prefix="/maps", tags=["Maps"])


@router.get("/directions")
def fetch_directions(
    origin: str = Query(..., description="Starting location"),
    destination: str = Query(..., description="Ending location"),
    mode: str = Query("driving", description="Travel mode: driving/walking/bicycling/transit"),
    waypoints: Optional[str] = Query(None, description="Pipe-separated waypoints, e.g. 'A|B'"),
):
    """Get directions between two locations with optional waypoints."""
    try:
        wp_list = [w.strip() for w in waypoints.split("|") if w.strip()] if waypoints else []
        result = get_directions(origin=origin, destination=destination, mode=mode, waypoints=wp_list)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"status": "success", "directions": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/distance")
def fetch_distance_matrix(
    origins: str = Query(..., description="Comma-separated origin addresses"),
    destinations: str = Query(..., description="Comma-separated destination addresses"),
    mode: str = Query("driving", description="Travel mode"),
):
    """Get distance matrix for multiple locations."""
    try:
        origin_list = [o.strip() for o in origins.split(",")]
        dest_list = [d.strip() for d in destinations.split(",")]
        result = get_distance_matrix(origins=origin_list, destinations=dest_list, mode=mode)
        if isinstance(result, dict) and "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"status": "success", "distances": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geocode")
def fetch_geocode(address: str = Query(..., description="Address to geocode")):
    """Convert an address to lat/lng coordinates."""
    try:
        result = geocode(address)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"status": "success", "location": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reverse")
def fetch_reverse_geocode(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
):
    """Convert lat/lng to a human-readable address."""
    try:
        result = reverse_geocode(lat, lng)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"status": "success", "address": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggest")
def fetch_place_suggestions(
    query: str = Query(..., description="Search query"),
    session_token: str = Query("", description="Session token for billing grouping"),
):
    """Get place autocomplete suggestions."""
    try:
        results = get_place_suggestions(query=query, session_token=session_token)
        return {"status": "success", "suggestions": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Saved Routes (DB-backed) ────────────────────────────────────────────────


class SavedRouteCreate(BaseModel):
    label: str
    origin: str
    destination: str
    mode: str = "driving"


@router.get("/saved-routes")
def list_saved_routes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all saved routes for the current user, newest first."""
    routes = (
        db.query(SavedRoute)
        .filter(SavedRoute.user_id == current_user.id)
        .order_by(SavedRoute.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "label": r.label,
            "origin": r.origin,
            "destination": r.destination,
            "mode": r.mode,
        }
        for r in routes
    ]


@router.post("/saved-routes")
def create_saved_route(
    body: SavedRouteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a new route for the current user."""
    route = SavedRoute(
        user_id=current_user.id,
        label=body.label,
        origin=body.origin,
        destination=body.destination,
        mode=body.mode,
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return {
        "id": str(route.id),
        "label": route.label,
        "origin": route.origin,
        "destination": route.destination,
        "mode": route.mode,
    }


@router.delete("/saved-routes/{route_id}")
def delete_saved_route(
    route_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved route belonging to the current user."""
    import uuid as _uuid

    try:
        rid = _uuid.UUID(route_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid route ID")

    route = (
        db.query(SavedRoute)
        .filter(SavedRoute.id == rid, SavedRoute.user_id == current_user.id)
        .first()
    )
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    db.delete(route)
    db.commit()
    return {"status": "deleted", "id": route_id}
