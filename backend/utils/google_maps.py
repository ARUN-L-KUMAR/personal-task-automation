"""
Google Maps API Utility with OpenStreetMap Fallback

Primary: Google Maps REST API (when API key available)
Fallback: OpenStreetMap services (OSRM for routing, Nominatim for geocoding)

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

# OpenStreetMap fallback services (free, no API key needed)
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "https://router.project-osrm.org/route/v1"


def _no_key():
    return {"error": "GOOGLE_MAPS_API_KEY not configured. Add it to your .env file."}


# ─── FREE FALLBACK: Nominatim Geocoding ───────────────────────────────────────
def _geocode_nominatim(address: str):
    """Free geocoding using OpenStreetMap's Nominatim service."""
    try:
        response = requests.get(NOMINATIM_URL, params={
            "q": address,
            "format": "json",
            "limit": 1,
            "addressdetails": 1
        }, headers={"User-Agent": "G-One-TaskApp/1.0"}, timeout=10)
        
        data = response.json()
        if not data:
            return None
            
        result = data[0]
        
        # Extract cleaner address (city, state, country)
        addr_parts = result.get("address", {})
        clean_parts = []
        for key in ["city", "town", "village", "state", "country"]:
            if key in addr_parts:
                clean_parts.append(addr_parts[key])
        
        clean_address = ", ".join(clean_parts) if clean_parts else result.get("display_name", address)
        
        return {
            "lat": float(result["lat"]),
            "lng": float(result["lon"]),
            "formatted_address": clean_address
        }
    except Exception as e:
        print(f"Nominatim geocoding error: {e}")
        return None


# ─── Helper: Format distance ─────────────────────────────────────────────────
def _format_distance(meters: float) -> str:
    """Format distance in a user-friendly way."""
    if meters < 1000:
        return f"{int(meters)} m"
    else:
        km = meters / 1000
        return f"{km:.1f} km"


# ─── Helper: Format duration ─────────────────────────────────────────────────
def _format_duration(seconds: float) -> str:
    """Format duration in a user-friendly way."""
    mins = int(seconds / 60)
    if mins < 1:
        return "< 1 min"
    elif mins < 60:
        return f"{mins} min{'s' if mins != 1 else ''}"
    else:
        hours = mins // 60
        remaining_mins = mins % 60
        if remaining_mins == 0:
            return f"{hours} hour{'s' if hours != 1 else ''}"
        return f"{hours} hour{'s' if hours != 1 else ''} {remaining_mins} min{'s' if remaining_mins != 1 else ''}"


# ─── Helper: Clean step instruction ──────────────────────────────────────────
def _clean_instruction(maneuver: dict, road_name: str = None) -> str:
    """Build a clean, readable turn-by-turn instruction."""
    maneuver_type = maneuver.get("type", "continue")
    modifier = maneuver.get("modifier", "")
    
    # Map OSRM maneuver types to friendly instructions
    instruction_map = {
        "depart": "Start",
        "arrive": "Arrive at destination",
        "turn": "Turn",
        "new name": "Continue",
        "continue": "Continue",
        "merge": "Merge",
        "on ramp": "Take the ramp",
        "off ramp": "Take the exit",
        "fork": "At the fork, keep",
        "end of road": "At the end of the road, turn",
        "roundabout": "At the roundabout, take",
        "rotary": "At the rotary, take"
    }
    
    instruction = instruction_map.get(maneuver_type, "Continue")
    
    # Add direction modifier
    if modifier and maneuver_type != "arrive":
        instruction += f" {modifier.replace('slight', 'slightly').replace('sharp', 'sharply')}"
    
    # Add road name if available
    if road_name and road_name != "":
        if maneuver_type == "depart":
            instruction += f" on {road_name}"
        elif maneuver_type != "arrive":
            instruction += f" onto {road_name}"
    
    return instruction


# ─── FREE FALLBACK: OSRM Routing ──────────────────────────────────────────────
def _get_directions_osrm(origin: str, destination: str, mode: str = "driving"):
    """
    Free routing using OpenStreetMap's OSRM service.
    Supports driving and walking. Bicycling uses walking profile, transit not supported.
    """
    # Geocode addresses first
    origin_coords = _geocode_nominatim(origin)
    dest_coords = _geocode_nominatim(destination)
    
    if not origin_coords or not dest_coords:
        return {"error": "Could not find the locations. Please check the addresses and try again."}
    
    # Map travel modes to OSRM profiles (free service only has 'driving' and 'foot')
    if mode == "driving":
        osrm_profile = "driving"
    elif mode == "walking":
        osrm_profile = "foot"
    elif mode == "bicycling":
        osrm_profile = "foot"  # Use walking profile for bike (closer than driving)
    elif mode == "transit":
        return {
            "error": "Public transit routing is not available with the free service. Please use Drive or Walk mode, or enable Google Maps API with billing for transit support."
        }
    else:
        osrm_profile = "driving"
    
    print(f"[OSRM] Mode '{mode}' mapped to profile '{osrm_profile}'")
    
    try:
        # Format: /route/v1/{profile}/{lon,lat;lon,lat}
        coords = f"{origin_coords['lng']},{origin_coords['lat']};{dest_coords['lng']},{dest_coords['lat']}"
        url = f"{OSRM_URL}/{osrm_profile}/{coords}"
        
        print(f"[OSRM] Calling URL: {url}")
        print(f"[OSRM] Origin: {origin} → {origin_coords}")
        print(f"[OSRM] Destination: {destination} → {dest_coords}")
        
        response = requests.get(url, params={
            "overview": "full",
            "steps": "true",
            "geometries": "polyline"
        }, timeout=15)
        
        data = response.json()
        
        print(f"[OSRM] Raw response code: {data.get('code')}")
        if data.get("code") == "Ok" and data.get("routes"):
            raw_route = data["routes"][0]
            print(f"[OSRM] Raw distance: {raw_route.get('distance')} meters")
            print(f"[OSRM] Raw duration: {raw_route.get('duration')} seconds")
        
        if data.get("code") != "Ok":
            return {"error": f"Could not calculate route: {data.get('message', 'Route not found')}"}
        
        route = data["routes"][0]
        leg = route["legs"][0]
        
        # Log what OSRM returned
        print(f"[OSRM] Distance: {route['distance']} meters, Duration: {route['duration']} seconds ({_format_duration(route['duration'])})") 
        
        # Build readable summary from main roads
        summary_roads = []
        for step in leg.get("steps", [])[:5]:  # First 5 major roads
            road_name = step.get("name", "")
            if road_name and road_name not in summary_roads and road_name != "":
                summary_roads.append(road_name)
        
        summary = " → ".join(summary_roads[:3]) if summary_roads else "Fastest route"
        
        # Add note if bicycling uses walking profile
        if mode == "bicycling" and osrm_profile == "foot":
            summary += " (pedestrian route)"
        
        # Format steps with better instructions
        steps = []
        for step in leg.get("steps", [])[:25]:  # Limit to 25 steps
            maneuver = step.get("maneuver", {})
            road_name = step.get("name", "")
            
            instruction = _clean_instruction(maneuver, road_name)
            
            steps.append({
                "instruction": instruction,
                "distance": _format_distance(step["distance"]),
                "duration": _format_duration(step["duration"]),
                "maneuver": maneuver.get("type", ""),
            })
        
        return {
            "summary": summary,
            "origin": origin_coords["formatted_address"],
            "destination": dest_coords["formatted_address"],
            "distance": _format_distance(route["distance"]),
            "distance_meters": int(route["distance"]),
            "duration": _format_duration(route["duration"]),
            "duration_seconds": int(route["duration"]),
            "steps": steps,
            "mode": mode,  # Return the requested mode (not the OSRM profile)
            "polyline": route["geometry"],
            "alternatives": [],
            "free_service": True  # Flag to indicate fallback was used
        }
        
    except requests.Timeout:
        return {"error": "Request timed out. Please try again."}
    except requests.RequestException as e:
        return {"error": f"Network error: {str(e)}"}
    except Exception as e:
        return {"error": f"An error occurred while calculating the route. Please try again."}


def get_directions(origin: str, destination: str, mode: str = "driving", waypoints: list = None):
    """
    Get directions between two locations.
    
    Tries Google Maps first, falls back to free OSRM if Google fails.

    Args:
        origin: Starting location (address or lat,lng)
        destination: Ending location (address or lat,lng)
        mode: driving / walking / bicycling / transit
        waypoints: Optional list of intermediate stops
    """
    print(f"[get_directions] Requested mode: {mode}")
    
    # Try Google Maps first if API key exists
    if MAPS_API_KEY and MAPS_API_KEY.strip():
        params = {
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "key": MAPS_API_KEY,
            "alternatives": "true",
        }
        if waypoints:
            params["waypoints"] = "via:" + "|via:".join(waypoints)

        try:
            print(f"[get_directions] Trying Google Maps API with mode: {mode}")
            response = requests.get(DIRECTIONS_URL, params=params, timeout=10)
            data = response.json()

            if data.get("status") == "OK":
                print(f"[get_directions] ✓ Google Maps API succeeded")
                # Google Maps succeeded - parse response
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

                if routes:
                    primary = routes[0]
                    primary["alternatives"] = routes[1:] if len(routes) > 1 else []
                    return primary
            
            # Google Maps failed - log error and fallback
            print(f"Google Maps API error: {data.get('status')} - {data.get('error_message', 'No message')}")
            print(f"[get_directions] Falling back to free OSRM routing...")
            
        except Exception as e:
            print(f"Google Maps request failed: {e}")
            print(f"[get_directions] Falling back to free OSRM routing...")
    else:
        print(f"[get_directions] No Google Maps API key, using free OSRM routing...")
    
    # Fallback to free OpenStreetMap routing
    if waypoints:
        print("Warning: Waypoints not supported with free routing service")
    
    return _get_directions_osrm(origin, destination, mode)


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
    """
    Convert an address to lat/lng coordinates.
    Tries Google Maps first, falls back to free Nominatim.
    """
    # Try Google Maps first if API key exists
    if MAPS_API_KEY and MAPS_API_KEY.strip():
        try:
            params = {"address": address, "key": MAPS_API_KEY}
            response = requests.get(GEOCODE_URL, params=params, timeout=10)
            data = response.json()

            if data.get("status") == "OK" and data.get("results"):
                result = data["results"][0]
                loc = result["geometry"]["location"]
                return {
                    "formatted_address": result.get("formatted_address", address),
                    "lat": loc["lat"],
                    "lng": loc["lng"],
                    "place_id": result.get("place_id", ""),
                }
            
            print(f"Google Geocoding failed: {data.get('status')}")
        except Exception as e:
            print(f"Google Geocoding error: {e}")
    
    # Fallback to free Nominatim
    print("Using free Nominatim geocoding as fallback...")
    result = _geocode_nominatim(address)
    if result:
        return result
    
    return {"error": "Geocoding failed with all services"}


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
    """
    Get place autocomplete suggestions.
    Tries Google Places first, falls back to Nominatim search.
    """
    # Try Google Places first if API key exists
    if MAPS_API_KEY and MAPS_API_KEY.strip():
        try:
            params = {
                "input": query,
                "key": MAPS_API_KEY,
                "types": "geocode|establishment",
            }
            if session_token:
                params["sessiontoken"] = session_token

            response = requests.get(AUTOCOMPLETE_URL, params=params, timeout=5)
            data = response.json()

            if data.get("status") in ("OK", "ZERO_RESULTS"):
                return [
                    {
                        "place_id": p.get("place_id", ""),
                        "description": p.get("description", ""),
                        "main_text": p.get("structured_formatting", {}).get("main_text", ""),
                        "secondary_text": p.get("structured_formatting", {}).get("secondary_text", ""),
                    }
                    for p in data.get("predictions", [])[:5]
                ]
        except Exception as e:
            print(f"Google Places autocomplete failed: {e}")
    
    # Fallback to Nominatim search
    try:
        response = requests.get(NOMINATIM_URL, params={
            "q": query,
            "format": "json",
            "limit": 5,
            "addressdetails": 1
        }, headers={"User-Agent": "G-One-TaskApp/1.0"}, timeout=5)
        
        data = response.json()
        
        suggestions = []
        for result in data:
            addr = result.get("address", {})
            
            # Build main text (city/town/village)
            main_text = addr.get("city") or addr.get("town") or addr.get("village") or result.get("name", query)
            
            # Build secondary text (state, country)
            secondary_parts = []
            for key in ["state", "country"]:
                if key in addr:
                    secondary_parts.append(addr[key])
            secondary_text = ", ".join(secondary_parts)
            
            suggestions.append({
                "place_id": result.get("place_id", ""),
                "description": result.get("display_name", query),
                "main_text": main_text,
                "secondary_text": secondary_text,
            })
        
        return suggestions
        
    except Exception as e:
        print(f"Nominatim search failed: {e}")
        return []
