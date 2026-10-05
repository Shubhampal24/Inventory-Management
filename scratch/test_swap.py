import urllib.request
import json

def test_swap():
    url = "http://localhost:5003/api/locations"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer TEST", "Content-Type": "application/json"})
    res = urllib.request.urlopen(req)
    locations = json.loads(res.read())
    
    url = "http://localhost:5003/api/movements"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer TEST", "Content-Type": "application/json"})
    res = urllib.request.urlopen(req)
    movements = json.loads(res.read())
    
    # Calculate stock from movements manually to verify
    stock_map = {}
    for m in movements:
        key = f"{m['locationId']}_{m['materialId']}"
        if key not in stock_map:
            stock_map[key] = 0
        if m['type'] == 'IN':
            stock_map[key] += m['quantity']
        else:
            stock_map[key] -= m['quantity']
            
    print("Computed Stock:")
    for k, v in stock_map.items():
        if v > 0:
            print(f"{k}: {v}")

test_swap()
