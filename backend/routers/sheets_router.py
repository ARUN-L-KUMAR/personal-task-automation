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
from utils.google_auth import is_authenticated
from utils.google_sheets import read_sheet, write_sheet, append_sheet

router = APIRouter(prefix="/api/sheets", tags=["Sheets"])


def _check_auth():
    if not is_authenticated():
        raise HTTPException(status_code=401, detail="Google not authenticated. Please connect Google account.")


@router.get("/{spreadsheet_id}")
def fetch_sheet_data(
    spreadsheet_id: str,
    range_name: str = Query("Sheet1", description="Sheet range (e.g., Sheet1!A1:D10)")
):
    """Read data from a Google Sheet."""
    _check_auth()
    try:
        data = read_sheet(spreadsheet_id=spreadsheet_id, range_name=range_name)
        return {"status": "success", "sheet": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
