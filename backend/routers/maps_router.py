"""
Google Maps API Router

Endpoints:
- GET  /api/maps/directions  → Get directions (with alternatives & waypoints)
- GET  /api/maps/distance    → Distance matrix
- GET  /api/maps/geocode     → Geocode an address
- GET  /api/maps/reverse     → Reverse geocode lat/lng
- GET  /api/maps/suggest     → Place autocomplete suggestions
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from utils.google_maps import (
    get_directions, get_distance_matrix,
    geocode, reverse_geocode, get_place_suggestions,
)

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
