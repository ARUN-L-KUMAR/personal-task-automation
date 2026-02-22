"""
Google Sheets API Utility

Functions:
- read_sheet(spreadsheet_id, range)  → Read data from a sheet
- write_sheet(spreadsheet_id, range, values) → Write data to a sheet
- append_sheet(spreadsheet_id, range, values) → Append rows to a sheet
"""

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from utils.google_auth import get_credentials


def _get_service():
    """Build Google Sheets service."""
    creds = get_credentials()
    if not creds:
        raise Exception("Google not authenticated. Please connect Google account first.")
    return build("sheets", "v4", credentials=creds)


def read_sheet(spreadsheet_id: str, range_name: str = "Sheet1"):
    """
    Read data from a Google Sheet.
    
    Args:
        spreadsheet_id: The spreadsheet ID from the URL
        range_name: Sheet range (e.g., "Sheet1!A1:D10")
    """
    service = _get_service()
    
    try:
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=range_name
        ).execute()
    except HttpError as e:
        return {"error": f"Google Sheets error: {e.resp.status}", "detail": str(e)}
    
    values = result.get("values", [])
    
    if not values:
        return {"data": [], "rows": 0, "message": "No data found"}
    
    # First row as headers if it looks like headers
    headers = values[0] if values else []
    rows = values[1:] if len(values) > 1 else []
    
    return {
        "headers": headers,
        "data": rows,
        "rows": len(rows),
        "spreadsheet_id": spreadsheet_id,
        "range": range_name,
    }


def write_sheet(spreadsheet_id: str, range_name: str, values: list):
    """
    Write data to a Google Sheet (overwrites existing data in range).
    
    Args:
        spreadsheet_id: The spreadsheet ID
        range_name: Sheet range to write to
        values: 2D list of values [[row1], [row2], ...]
    """
    service = _get_service()
    
    body = {"values": values}
    
    try:
        result = service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption="USER_ENTERED",
            body=body
        ).execute()
        
        return {
            "updated_cells": result.get("updatedCells", 0),
            "updated_range": result.get("updatedRange", ""),
            "status": "success"
        }
    except HttpError as e:
        return {"error": f"Google Sheets error: {e.resp.status}", "detail": str(e)}


def append_sheet(spreadsheet_id: str, range_name: str, values: list):
    """
    Append rows to a Google Sheet.
    
    Args:
        spreadsheet_id: The spreadsheet ID
        range_name: Sheet range to append to
        values: 2D list of values [[row1], [row2], ...]
    """
    service = _get_service()
    
    body = {"values": values}
    
    try:
        result = service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption="USER_ENTERED",
            body=body
        ).execute()
        
        return {
            "updated_cells": result.get("updates", {}).get("updatedCells", 0),
            "updated_range": result.get("updates", {}).get("updatedRange", ""),
            "status": "appended"
        }
    except HttpError as e:
        return {"error": f"Google Sheets error: {e.resp.status}", "detail": str(e)}
