"""
Google Maps API Router

Endpoints:
- GET /api/maps/directions → Get directions between two locations
"""

from fastapi import APIRouter, HTTPException, Query
from utils.google_maps import get_directions, get_distance_matrix

router = APIRouter(prefix="/api/maps", tags=["Maps"])


@router.get("/directions")
def fetch_directions(
    origin: str = Query(..., description="Starting location"),
    destination: str = Query(..., description="Ending location"),
    mode: str = Query("driving", description="Travel mode: driving/walking/bicycling/transit")
):
    """Get directions between two locations."""
    try:
        result = get_directions(origin=origin, destination=destination, mode=mode)
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
    mode: str = Query("driving", description="Travel mode")
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
