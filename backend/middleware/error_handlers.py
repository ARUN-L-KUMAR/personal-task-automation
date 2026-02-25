"""
Global Error Handling Middleware for FastAPI.
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError
import traceback


async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions."""
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc) if str(exc) else "An unexpected error occurred",
        },
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Handle database constraint violations (duplicate email, etc.)."""
    return JSONResponse(
        status_code=409,
        content={
            "success": False,
            "message": "Database constraint violation",
            "detail": str(exc.orig) if exc.orig else str(exc),
        },
    )


async def db_connection_error_handler(request: Request, exc: OperationalError):
    """Handle database connection failures."""
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "message": "Database connection error",
            "detail": "Unable to connect to the database. Please try again later.",
        },
    )
