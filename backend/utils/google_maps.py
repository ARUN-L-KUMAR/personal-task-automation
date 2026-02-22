"""
Google Maps API Utility

Uses Google Maps REST API (Directions, Geocoding, Places, Distance Matrix).
Requires GOOGLE_MAPS_API_KEY in .env

Functions:
- get_directions(origin, destination, mode, waypoints) → Route with distance/duration/steps
- get_distance_matrix(origins, destinations, mode)  → Distance matrix
- geocode(address)  → lat/lng + formatted address
- reverse_geocode(lat, lng) → address from coordinates
- get_place_suggestions(query) → autocomplete suggestions
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
DIRECTIONS_URL     = "https://maps.googleapis.com/maps/api/directions/json"
DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
GEOCODE_URL        = "https://maps.googleapis.com/maps/api/geocode/json"
AUTOCOMPLETE_URL   = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
PLACE_DETAILS_URL  = "https://maps.googleapis.com/maps/api/place/details/json"


def _no_key():
    return {"error": "GOOGLE_MAPS_API_KEY not configured. Add it to your .env file."}


def get_directions(origin: str, destination: str, mode: str = "driving", waypoints: list = None):
    """
    Get directions between two locations.

    Args:
        origin: Starting location (address or lat,lng)
        destination: Ending location (address or lat,lng)
        mode: driving / walking / bicycling / transit
        waypoints: Optional list of intermediate stops
    """
    if not MAPS_API_KEY:
        return _no_key()

    params = {
        "origin": origin,
        "destination": destination,
        "mode": mode,
        "key": MAPS_API_KEY,
        "alternatives": "true",
    }
    if waypoints:
        params["waypoints"] = "via:" + "|via:".join(waypoints)

    response = requests.get(DIRECTIONS_URL, params=params)
    data = response.json()

    if data.get("status") != "OK":
        google_error = data.get("error_message", "")
        status_code = data.get("status", "UNKNOWN")
        detail = f"Directions API returned '{status_code}'"
        if google_error:
            detail += f": {google_error}"
        if status_code == "REQUEST_DENIED":
            detail += ". Directions API may not be enabled in Google Cloud Console, or the API key is invalid."
        elif status_code == "ZERO_RESULTS":
            detail += ". No route could be found between those locations."
        return {"error": detail}

    routes = []
    for route_data in data.get("routes", []):
        leg = route_data["legs"][0]
        routes.append({
            "summary": route_data.get("summary", ""),
            "origin": leg.get("start_address", origin),
            "destination": leg.get("end_address", destination),
            "distance": leg.get("distance", {}).get("text", "Unknown"),
            "distance_meters": leg.get("distance", {}).get("value", 0),
            "duration": leg.get("duration", {}).get("text", "Unknown"),
            "duration_seconds": leg.get("duration", {}).get("value", 0),
            "steps": [
                {
                    "instruction": step.get("html_instructions", ""),
                    "distance": step.get("distance", {}).get("text", ""),
                    "duration": step.get("duration", {}).get("text", ""),
                    "maneuver": step.get("maneuver", ""),
                }
                for step in leg.get("steps", [])[:20]
            ],
            "mode": mode,
            "polyline": route_data.get("overview_polyline", {}).get("points", ""),
        })

    if not routes:
        return {"error": "No routes returned."}

    primary = routes[0]
    primary["alternatives"] = routes[1:] if len(routes) > 1 else []
    return primary


def get_distance_matrix(origins: list, destinations: list, mode: str = "driving"):
    """Get distance matrix for multiple origin-destination pairs."""
    if not MAPS_API_KEY:
        return _no_key()

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
                    "distance_meters": element["distance"]["value"],
                    "duration": element["duration"]["text"],
                    "duration_seconds": element["duration"]["value"],
                })
    return results


def geocode(address: str):
    """Convert an address to lat/lng coordinates."""
    if not MAPS_API_KEY:
        return _no_key()

    params = {"address": address, "key": MAPS_API_KEY}
    response = requests.get(GEOCODE_URL, params=params)
    data = response.json()

    if data.get("status") != "OK" or not data.get("results"):
        return {"error": f"Geocoding failed: {data.get('status', 'NO_RESULTS')}"}

    result = data["results"][0]
    loc = result["geometry"]["location"]
    return {
        "formatted_address": result.get("formatted_address", address),
        "lat": loc["lat"],
        "lng": loc["lng"],
        "place_id": result.get("place_id", ""),
    }


def reverse_geocode(lat: float, lng: float):
    """Convert lat/lng to a human-readable address."""
    if not MAPS_API_KEY:
        return _no_key()

    params = {"latlng": f"{lat},{lng}", "key": MAPS_API_KEY}
    response = requests.get(GEOCODE_URL, params=params)
    data = response.json()

    if data.get("status") != "OK" or not data.get("results"):
        return {"error": f"Reverse geocoding failed: {data.get('status')}"}

    result = data["results"][0]
    return {
        "formatted_address": result.get("formatted_address", f"{lat},{lng}"),
        "place_id": result.get("place_id", ""),
    }


def get_place_suggestions(query: str, session_token: str = ""):
    """Get place autocomplete suggestions."""
    if not MAPS_API_KEY:
        return []

    params = {
        "input": query,
        "key": MAPS_API_KEY,
        "types": "geocode|establishment",
    }
    if session_token:
        params["sessiontoken"] = session_token

    response = requests.get(AUTOCOMPLETE_URL, params=params)
    data = response.json()

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        return []

    return [
        {
            "place_id": p.get("place_id", ""),
            "description": p.get("description", ""),
            "main_text": p.get("structured_formatting", {}).get("main_text", ""),
            "secondary_text": p.get("structured_formatting", {}).get("secondary_text", ""),
        }
        for p in data.get("predictions", [])[:5]
    ]
