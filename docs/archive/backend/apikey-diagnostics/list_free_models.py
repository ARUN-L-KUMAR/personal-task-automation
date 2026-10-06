import requests

r = requests.get("https://openrouter.ai/api/v1/models")
models = r.json().get("data", [])
free_models = [m for m in models if ":free" in m.get("id", "")]

print(f"Total free models: {len(free_models)}\n")
for m in sorted(free_models, key=lambda x: x["id"]):
    print(f'  {m["id"]}  -  {m.get("name", "N/A")}')
