import requests, time, json

url = "http://localhost:8000/api/chatbot/context-snapshot"

print("1st call (fresh)...")
t0 = time.time()
r = requests.get(url, timeout=30)
data = r.json()
print(f"  Time: {time.time()-t0:.1f}s  Status: {data['status']}")
if data.get("snapshot"):
    s = data["snapshot"]
    print(f"  Emails: {s.get('unread_emails', '?')}, Tasks: {s.get('pending_tasks', '?')}, Services: {s.get('connected_services', [])}")
else:
    print("  No snapshot data!")

print("\n2nd call (cached)...")
t0 = time.time()
r = requests.get(url, timeout=30)
data = r.json()
print(f"  Time: {time.time()-t0:.1f}s  Status: {data['status']}")
if data.get("snapshot"):
    s = data["snapshot"]
    print(f"  Emails: {s.get('unread_emails', '?')}, Tasks: {s.get('pending_tasks', '?')}, Services: {s.get('connected_services', [])}")

# Now test the chat endpoint
print("\nChat test: 'Any urgent emails?'...")
t0 = time.time()
r = requests.post("http://localhost:8000/api/chatbot/ask", json={
    "message": "Any urgent emails?",
    "history": [],
    "preferred_model": "auto"
}, timeout=60)
data = r.json()
print(f"  Time: {time.time()-t0:.1f}s")
print(f"  Model: {data.get('model_source', '?')}")
print(f"  Used context: {data.get('used_context', '?')}")
print(f"  Reply: {data.get('reply', data.get('detail', '?'))[:200]}")
