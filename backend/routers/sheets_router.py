"""
Google Sheets API Router

Endpoints:
- GET  /api/sheets/{spreadsheet_id}  → Read sheet data
- POST /api/sheets/{spreadsheet_id}  → Write data to sheet
- POST /api/sheets/{spreadsheet_id}/append → Append rows
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List
from utils.google_auth import is_authenticated, get_credentials
from utils.google_sheets import read_sheet, write_sheet, append_sheet
from googleapiclient.discovery import build

router = APIRouter(prefix="/sheets", tags=["Sheets"])


def _check_auth():
    if not is_authenticated():
        raise HTTPException(status_code=401, detail="Google not authenticated. Please connect Google account.")


@router.get("/list")
def list_user_sheets(query: str = Query("", description="Optional search query")):
    """List the user's Google Sheets files from Drive."""
    _check_auth()
    try:
        creds = get_credentials()
        drive = build("drive", "v3", credentials=creds)
        q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
        if query:
            q += f" and name contains '{query}'"
        results = drive.files().list(
            q=q,
            pageSize=30,
            fields="files(id, name, modifiedTime, owners, size, webViewLink)",
            orderBy="modifiedTime desc"
        ).execute()
        files = results.get("files", [])
        sheets = [
            {
                "id": f["id"],
                "name": f.get("name", "Untitled"),
                "modified": f.get("modifiedTime", ""),
                "owner": f.get("owners", [{}])[0].get("displayName", "Me") if f.get("owners") else "Me",
                "link": f.get("webViewLink", ""),
            }
            for f in files
        ]
        return {"status": "success", "sheets": sheets, "count": len(sheets)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/{spreadsheet_id}/tabs")
def fetch_sheet_tabs(spreadsheet_id: str):
    """Get all sheet tab names from a spreadsheet."""
    _check_auth()
    try:
        creds = get_credentials()
        svc = build("sheets", "v4", credentials=creds)
        meta = svc.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        tabs = [s["properties"]["title"] for s in meta.get("sheets", [])]
        title = meta.get("properties", {}).get("title", "")
        return {"status": "success", "title": title, "tabs": tabs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{spreadsheet_id}")
def fetch_sheet_data(
    spreadsheet_id: str,
    range_name: str = Query("Sheet1", description="Sheet range (e.g., Sheet1!A1:D10)")
):
    """Read data from a Google Sheet."""
    _check_auth()
    try:
        data = read_sheet(spreadsheet_id=spreadsheet_id, range_name=range_name)
        if isinstance(data, dict) and "error" in data:
            # Check for common invalid ID error
            if "404" in str(data.get("error", "")):
                raise HTTPException(status_code=404, detail=f"Spreadsheet not found: {spreadsheet_id}")
            raise HTTPException(status_code=400, detail=data["error"])
        return {"status": "success", "sheet": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sheet data: {str(e)}")


class WriteSheetRequest(BaseModel):
    range_name: str = "Sheet1"
    values: List[List[str]]


@router.post("/{spreadsheet_id}")
def write_sheet_data(spreadsheet_id: str, body: WriteSheetRequest):
    """Write data to a Google Sheet."""
    _check_auth()
    try:
        result = write_sheet(
            spreadsheet_id=spreadsheet_id,
            range_name=body.range_name,
            values=body.values
        )
        if isinstance(result, dict) and "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"status": "success", "result": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write sheet data: {str(e)}")


@router.post("/{spreadsheet_id}/append")
def append_sheet_data(spreadsheet_id: str, body: WriteSheetRequest):
    """Append rows to a Google Sheet."""
    _check_auth()
    try:
        result = append_sheet(
            spreadsheet_id=spreadsheet_id,
            range_name=body.range_name,
            values=body.values
        )
        if isinstance(result, dict) and "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"status": "success", "result": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to append sheet data: {str(e)}")
