"""
Google Maps API Utility

Uses Google Maps REST API (Directions + Geocoding).
Requires GOOGLE_MAPS_API_KEY in .env

Functions:
- get_directions(origin, destination) → Route with distance/duration
- get_distance_matrix(origins, destinations) → Distance matrix
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"
DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


def get_directions(origin: str, destination: str, mode: str = "driving"):
    """
    Get directions between two locations.
    
    Args:
        origin: Starting location (address or lat,lng)
        destination: Ending location (address or lat,lng)
        mode: Travel mode (driving, walking, bicycling, transit)
    
    Returns:
        Route info with distance, duration, and steps
    """
    if not MAPS_API_KEY:
        return {"error": "GOOGLE_MAPS_API_KEY not configured"}
    
    params = {
        "origin": origin,
        "destination": destination,
        "mode": mode,
        "key": MAPS_API_KEY,
    }
    
    response = requests.get(DIRECTIONS_URL, params=params)
    data = response.json()
    
    if data.get("status") != "OK":
        return {
            "error": f"Directions API error: {data.get('status')}",
            "detail": data.get("error_message", "")
        }
    
    route = data["routes"][0]
    leg = route["legs"][0]
    
    return {
        "origin": leg.get("start_address", origin),
        "destination": leg.get("end_address", destination),
        "distance": leg.get("distance", {}).get("text", "Unknown"),
        "duration": leg.get("duration", {}).get("text", "Unknown"),
        "duration_seconds": leg.get("duration", {}).get("value", 0),
        "steps": [
            {
                "instruction": step.get("html_instructions", ""),
                "distance": step.get("distance", {}).get("text", ""),
                "duration": step.get("duration", {}).get("text", ""),
            }
            for step in leg.get("steps", [])[:10]  # Limit to 10 steps
        ],
        "mode": mode,
    }


def get_distance_matrix(origins: list, destinations: list, mode: str = "driving"):
    """
    Get distance matrix for multiple origin-destination pairs.
    
    Args:
        origins: List of origin addresses
        destinations: List of destination addresses
        mode: Travel mode
    
    Returns:
        Matrix of distances and durations
    """
    if not MAPS_API_KEY:
        return {"error": "GOOGLE_MAPS_API_KEY not configured"}
    
    params = {
        "origins": "|".join(origins),
        "destinations": "|".join(destinations),
        "mode": mode,
        "key": MAPS_API_KEY,
    }
    
    response = requests.get(DISTANCE_MATRIX_URL, params=params)
    data = response.json()
    
    if data.get("status") != "OK":
        return {
            "error": f"Distance Matrix API error: {data.get('status')}",
            "detail": data.get("error_message", "")
        }
    
    results = []
    for i, row in enumerate(data.get("rows", [])):
        for j, element in enumerate(row.get("elements", [])):
            if element.get("status") == "OK":
                results.append({
                    "origin": data["origin_addresses"][i],
                    "destination": data["destination_addresses"][j],
                    "distance": element["distance"]["text"],
                    "duration": element["duration"]["text"],
                    "duration_seconds": element["duration"]["value"],
                })
    
    return results
