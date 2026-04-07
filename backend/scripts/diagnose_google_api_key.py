"""
Google API key diagnostics for this project.

What this script can verify with just an API key:
- Whether endpoint calls succeed (service likely enabled + key allowed)
- Common denial causes from API responses (disabled API, billing issues, key restrictions, quota)
- Which Gemini models are visible to the key

What this script cannot reliably verify with only an API key:
- Cloud Billing account linkage status (authoritative)
- Exact quota usage / remaining limits
- Full list of enabled services in the project

Usage examples:
    python scripts/diagnose_google_api_key.py --key YOUR_KEY
    python scripts/diagnose_google_api_key.py --key YOUR_KEY --project-id your-gcp-project-id
    python scripts/diagnose_google_api_key.py --from-env

The --from-env flag loads GOOGLE_MAPS_API_KEY first, then GOOGLE_API_KEY.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field
from typing import Any

import requests
from dotenv import load_dotenv


REQUEST_TIMEOUT = 12


@dataclass
class CheckResult:
    name: str
    ok: bool
    endpoint: str
    http_status: int | None = None
    api_status: str | None = None
    message: str = ""
    hints: list[str] = field(default_factory=list)
    sample: dict[str, Any] | list[Any] | None = None


def _mask_key(key: str) -> str:
    if len(key) < 8:
        return "<redacted>"
    return f"{key[:4]}...{key[-4:]}"


def _safe_get(url: str, params: dict[str, Any]) -> tuple[int | None, dict[str, Any] | None, str | None]:
    try:
        response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        data = None
        try:
            data = response.json()
        except ValueError:
            data = {"raw": response.text[:600]}
        return response.status_code, data, None
    except requests.RequestException as exc:
        return None, None, str(exc)


def _extract_message(data: dict[str, Any] | None) -> str:
    if not data:
        return "No response payload"

    # Maps-style response payloads
    if isinstance(data, dict):
        if data.get("error_message"):
            return str(data["error_message"])
        if isinstance(data.get("error"), dict):
            err = data["error"]
            return str(err.get("message", "Unknown error"))
        if data.get("status") and data.get("status") != "OK":
            return str(data.get("status"))

    return ""


def _infer_hints(message: str) -> list[str]:
    msg = message.lower()
    hints: list[str] = []

    if any(x in msg for x in ["billing", "over_daily_limit", "billingnotenabled"]):
        hints.append("Billing may be missing/disabled for this project or API.")

    if any(x in msg for x in ["not authorized", "not enabled", "has not been used", "disabled"]):
        hints.append("API may not be enabled in Google Cloud for this project.")

    if any(x in msg for x in ["api key", "invalid key", "key not valid"]):
        hints.append("API key may be invalid, deleted, or from a different project.")

    if any(x in msg for x in ["referer", "ip", "restriction", "requests from this referrer are blocked"]):
        hints.append("API key restrictions (HTTP referrer/IP/app restrictions) may block this request.")

    if any(x in msg for x in ["over_query_limit", "quota", "rate limit", "resource exhausted"]):
        hints.append("Quota/rate limit may be exceeded.")

    return hints


def check_maps_geocoding(key: str, address: str) -> CheckResult:
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    status_code, data, network_error = _safe_get(url, {"address": address, "key": key})

    if network_error:
        return CheckResult("Maps Geocoding", False, url, message=network_error)

    api_status = str((data or {}).get("status", ""))
    ok = bool(status_code == 200 and api_status == "OK")
    message = _extract_message(data)

    sample = None
    if ok and isinstance(data, dict) and data.get("results"):
        first = data["results"][0]
        sample = {
            "formatted_address": first.get("formatted_address"),
            "place_id": first.get("place_id"),
        }

    return CheckResult(
        name="Maps Geocoding",
        ok=ok,
        endpoint=url,
        http_status=status_code,
        api_status=api_status,
        message=message,
        hints=_infer_hints(message),
        sample=sample,
    )


def check_maps_directions(key: str, origin: str, destination: str) -> CheckResult:
    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": origin,
        "destination": destination,
        "mode": "driving",
        "key": key,
    }
    status_code, data, network_error = _safe_get(url, params)

    if network_error:
        return CheckResult("Maps Directions", False, url, message=network_error)

    api_status = str((data or {}).get("status", ""))
    ok = bool(status_code == 200 and api_status == "OK")
    message = _extract_message(data)

    sample = None
    if ok and isinstance(data, dict) and data.get("routes"):
        route = data["routes"][0]
        leg = route.get("legs", [{}])[0]
        sample = {
            "summary": route.get("summary"),
            "distance": leg.get("distance", {}).get("text"),
            "duration": leg.get("duration", {}).get("text"),
        }

    return CheckResult(
        name="Maps Directions",
        ok=ok,
        endpoint=url,
        http_status=status_code,
        api_status=api_status,
        message=message,
        hints=_infer_hints(message),
        sample=sample,
    )


def check_maps_distance_matrix(key: str, origin: str, destination: str) -> CheckResult:
    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": origin,
        "destinations": destination,
        "mode": "driving",
        "key": key,
    }
    status_code, data, network_error = _safe_get(url, params)

    if network_error:
        return CheckResult("Maps Distance Matrix", False, url, message=network_error)

    api_status = str((data or {}).get("status", ""))
    ok = bool(status_code == 200 and api_status == "OK")
    message = _extract_message(data)

    sample = None
    if ok and isinstance(data, dict):
        rows = data.get("rows", [])
        if rows and rows[0].get("elements"):
            el = rows[0]["elements"][0]
            sample = {
                "element_status": el.get("status"),
                "distance": el.get("distance", {}).get("text"),
                "duration": el.get("duration", {}).get("text"),
            }

    return CheckResult(
        name="Maps Distance Matrix",
        ok=ok,
        endpoint=url,
        http_status=status_code,
        api_status=api_status,
        message=message,
        hints=_infer_hints(message),
        sample=sample,
    )


def check_places_autocomplete(key: str, query: str) -> CheckResult:
    url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    params = {"input": query, "key": key}
    status_code, data, network_error = _safe_get(url, params)

    if network_error:
        return CheckResult("Places Autocomplete", False, url, message=network_error)

    api_status = str((data or {}).get("status", ""))
    ok = bool(status_code == 200 and api_status in {"OK", "ZERO_RESULTS"})
    message = _extract_message(data)

    sample = None
    if ok and isinstance(data, dict) and data.get("predictions"):
        sample = {
            "top_prediction": data["predictions"][0].get("description"),
            "count": len(data["predictions"]),
        }

    return CheckResult(
        name="Places Autocomplete",
        ok=ok,
        endpoint=url,
        http_status=status_code,
        api_status=api_status,
        message=message,
        hints=_infer_hints(message),
        sample=sample,
    )


def check_gemini_models(key: str) -> CheckResult:
    url = "https://generativelanguage.googleapis.com/v1beta/models"
    status_code, data, network_error = _safe_get(url, {"key": key})

    if network_error:
        return CheckResult("Gemini Model Listing", False, url, message=network_error)

    ok = bool(status_code == 200 and isinstance(data, dict) and data.get("models"))
    message = _extract_message(data)

    sample = None
    if ok and isinstance(data, dict):
        models = [m.get("name", "") for m in data.get("models", [])]
        sample = {
            "model_count": len(models),
            "sample_models": models[:8],
        }

    return CheckResult(
        name="Gemini Model Listing",
        ok=ok,
        endpoint=url,
        http_status=status_code,
        api_status=None,
        message=message,
        hints=_infer_hints(message),
        sample=sample,
    )


def check_project_metadata(project_id: str, key: str) -> list[CheckResult]:
    """
    Attempts project-level checks with API key.

    These typically require IAM-authenticated OAuth/service account credentials,
    so failures here are expected with key-only auth.
    """
    results: list[CheckResult] = []

    billing_url = f"https://cloudbilling.googleapis.com/v1/projects/{project_id}/billingInfo"
    sc, data, net_err = _safe_get(billing_url, {"key": key})
    if net_err:
        results.append(CheckResult("Project Billing Info", False, billing_url, message=net_err))
    else:
        ok = bool(sc == 200 and isinstance(data, dict) and data.get("billingEnabled") is not None)
        msg = _extract_message(data)
        hints = _infer_hints(msg)
        if not ok:
            hints.append("Billing info endpoint usually needs IAM auth, not API key only.")
        results.append(
            CheckResult(
                name="Project Billing Info",
                ok=ok,
                endpoint=billing_url,
                http_status=sc,
                message=msg,
                hints=hints,
                sample=data if ok else None,
            )
        )

    services_url = f"https://serviceusage.googleapis.com/v1/projects/{project_id}/services"
    sc, data, net_err = _safe_get(services_url, {"filter": "state:ENABLED", "key": key})
    if net_err:
        results.append(CheckResult("Enabled Services List", False, services_url, message=net_err))
    else:
        ok = bool(sc == 200 and isinstance(data, dict) and "services" in data)
        msg = _extract_message(data)
        hints = _infer_hints(msg)
        if not ok:
            hints.append("Service Usage list usually needs IAM auth, not API key only.")
        sample = None
        if ok:
            sample = {
                "enabled_service_count": len(data.get("services", [])),
                "sample_services": [s.get("config", {}).get("name") for s in data.get("services", [])[:10]],
            }
        results.append(
            CheckResult(
                name="Enabled Services List",
                ok=ok,
                endpoint=services_url,
                http_status=sc,
                message=msg,
                hints=hints,
                sample=sample,
            )
        )

    return results


def _print_result(result: CheckResult) -> None:
    status = "PASS" if result.ok else "FAIL"
    print(f"[{status}] {result.name}")
    print(f"  endpoint: {result.endpoint}")
    if result.http_status is not None:
        print(f"  http_status: {result.http_status}")
    if result.api_status:
        print(f"  api_status: {result.api_status}")
    if result.message:
        print(f"  message: {result.message}")
    if result.hints:
        for hint in result.hints:
            print(f"  hint: {hint}")
    if result.sample is not None:
        print("  sample:")
        print("    " + json.dumps(result.sample, indent=2).replace("\n", "\n    "))
    print()


def main() -> int:
    parser = argparse.ArgumentParser(description="Diagnose Google API key capabilities for this project.")
    parser.add_argument("--key", help="Google API key to test")
    parser.add_argument("--from-env", action="store_true", help="Load key from .env (GOOGLE_MAPS_API_KEY then GOOGLE_API_KEY)")
    parser.add_argument("--project-id", help="Optional GCP project id for project-level check attempts")
    parser.add_argument("--address", default="Bengaluru, India", help="Address for geocoding test")
    parser.add_argument("--origin", default="Bengaluru, India", help="Origin for route tests")
    parser.add_argument("--destination", default="Chennai, India", help="Destination for route tests")
    parser.add_argument("--places-query", default="coffee near Bengaluru", help="Autocomplete query")
    args = parser.parse_args()

    if args.from_env:
        load_dotenv()

    key = args.key or os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not key:
        print("No key found. Provide --key or use --from-env with GOOGLE_MAPS_API_KEY/GOOGLE_API_KEY.")
        return 2

    print("Google API Key Diagnostics")
    print("==========================")
    print(f"Key: {_mask_key(key)}")
    print()

    results: list[CheckResult] = []
    results.append(check_maps_geocoding(key, args.address))
    results.append(check_maps_directions(key, args.origin, args.destination))
    results.append(check_maps_distance_matrix(key, args.origin, args.destination))
    results.append(check_places_autocomplete(key, args.places_query))
    results.append(check_gemini_models(key))

    if args.project_id:
        results.extend(check_project_metadata(args.project_id, key))

    for result in results:
        _print_result(result)

    passes = sum(1 for r in results if r.ok)
    fails = len(results) - passes

    print("Summary")
    print("=======")
    print(f"pass: {passes}")
    print(f"fail: {fails}")
    print()
    print("Notes")
    print("=====")
    print("- API key checks are endpoint-level, not full project health checks.")
    print("- Exact quota remaining and billing linkage generally require IAM-authenticated APIs.")
    print("- If a Maps check fails with billing/quota hints, verify billing + API enablement in Google Cloud Console.")

    return 0 if passes > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
