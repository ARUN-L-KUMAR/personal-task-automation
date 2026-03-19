# Multi-User Google OAuth Migration - Remaining Updates

## ✅ COMPLETED
- google_auth.py - Database-based token storage
- google_gmail.py - Per-user authentication 
- google_calendar.py - Per-user functions
- google_contacts.py - Per-user functions
- google_sheets.py - Per-user functions
- google_tasks.py - Per-user functions
- auth_router.py - OAuth with state tracking
- email_router.py - Current user context

## 🔧 REMAINING ROUTERS TO UPDATE

All router endpoints need to:
1. Import: `from middleware import get_current_user` and `from database.connection import get_db`
2. Add dependencies: `current_user: User = Depends(get_current_user), db: Session = Depends(get_db)`
3. Pass user and db as first two arguments to all Google utility function calls

### calendar_router.py
- Update `/events` endpoint
- Update `/events/create` endpoint  
- Pass `current_user, db` to `get_today_events()`, `get_events()`, `create_event()`

### contacts_router.py
- Update `/contacts` endpoint
- Update `/contacts/search` endpoint
- Pass `current_user, db` to `get_contacts()`, `search_contacts()`

### sheets_router.py
- Update `/sheets/read`, `/sheets/write`, `/sheets/append` endpoints
- Pass `current_user, db` to `read_sheet()`, `write_sheet()`, `append_sheet()`

### tasks_router.py
- Update all task endpoints
- Pass `current_user, db` to `get_task_lists()`, `get_tasks()`, `create_task()`, `complete_task()`

### dashboard_router.py
- Update summary endpoint that calls `get_today_events()`, `get_tasks()`
- Pass `current_user, db` to these functions

## Pattern for Router Updates

```python
# Before:
@router.get("/example")
def example_endpoint():
    result = some_google_function()
    return result

# After:
@router.get("/example")
def example_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = some_google_function(current_user, db)
    return result
```

## Testing Checklist
- [ ] Connect Google services in Settings
- [ ] Test email inbox loading
- [ ] Test calendar events
- [ ] Test tasks list
- [ ] Test contacts
- [ ] Test with multiple users (create second account)
- [ ] Verify tokens are per-user in database
