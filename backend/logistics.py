import random
import json
from datetime import datetime
import time

UKRAINE_CITIES = [
    {
        "ref": "8d5a980d-391c-11dd-90d9-001a92567626",
        "name": "Київ",
        "region": "Київська область",
        "warehouses": [
            {"ref": "wh-kyiv-1", "name": "Відділення №1: вул. Пирогівський шлях, 135", "type": "Branch", "max_weight": 1100},
            {"ref": "wh-kyiv-14", "name": "Відділення №14: вул. Миколи Василенка, 2", "type": "Branch", "max_weight": 30},
            {"ref": "wh-kyiv-35", "name": "Відділення №35: вул. Алма-Атинська, 39А", "type": "Branch", "max_weight": 30},
            {"ref": "wh-kyiv-55", "name": "Відділення №55: просп. Перемоги (Берестейський), 67", "type": "Branch", "max_weight": 30},
            {"ref": "wh-kyiv-102", "name": "Поштомат №4510: вул. Хрещатик, 24", "type": "Postomat", "max_weight": 20},
            {"ref": "wh-kyiv-103", "name": "Поштомат №8821: просп. Оболонський, 1Б (ТРЦ Dream)", "type": "Postomat", "max_weight": 20}
        ]
    },
    {
        "ref": "db5c88f5-391c-11dd-90d9-001a92567626",
        "name": "Львів",
        "region": "Львівська область",
        "warehouses": [
            {"ref": "wh-lviv-1", "name": "Відділення №1: вул. Городоцька, 355/6", "type": "Branch", "max_weight": 1100},
            {"ref": "wh-lviv-4", "name": "Відділення №4: вул. Угорська, 22", "type": "Branch", "max_weight": 30},
            {"ref": "wh-lviv-11", "name": "Відділення №11: вул. Зелена, 147", "type": "Branch", "max_weight": 30},
            {"ref": "wh-lviv-101", "name": "Поштомат №5230: площа Ринок, 10", "type": "Postomat", "max_weight": 20}
        ]
    },
    {
        "ref": "db5c88e0-391c-11dd-90d9-001a92567626",
        "name": "Дніпро",
        "region": "Дніпропетровська область",
        "warehouses": [
            {"ref": "wh-dnipro-1", "name": "Відділення №1: вул. Маршала Малиновського, 114", "type": "Branch", "max_weight": 1100},
            {"ref": "wh-dnipro-12", "name": "Відділення №12: просп. Дмитра Яворницького, 41", "type": "Branch", "max_weight": 30},
            {"ref": "wh-dnipro-101", "name": "Поштомат №6104: вул. Короленка, 3", "type": "Postomat", "max_weight": 20}
        ]
    },
    {
        "ref": "db5c88d0-391c-11dd-90d9-001a92567626",
        "name": "Одеса",
        "region": "Одеська область",
        "warehouses": [
            {"ref": "wh-odesa-1", "name": "Відділення №1: вул. Київське шосе, 27", "type": "Branch", "max_weight": 1100},
            {"ref": "wh-odesa-8", "name": "Відділення №8: вул. Розумовська, 29", "type": "Branch", "max_weight": 30},
            {"ref": "wh-odesa-101", "name": "Поштомат №3190: вул. Дерибасівська, 14", "type": "Postomat", "max_weight": 20}
        ]
    },
    {
        "ref": "db5c88c0-391c-11dd-90d9-001a92567626",
        "name": "Харків",
        "region": "Харківська область",
        "warehouses": [
            {"ref": "wh-kharkiv-1", "name": "Відділення №1: просп. Гагаріна, 201-Б", "type": "Branch", "max_weight": 1100},
            {"ref": "wh-kharkiv-25", "name": "Відділення №25: просп. Науки, 38", "type": "Branch", "max_weight": 30}
        ]
    },
    {
        "ref": "db5c88a1-391c-11dd-90d9-001a92567626",
        "name": "Вінниця",
        "region": "Вінницька область",
        "warehouses": [
            {"ref": "wh-vin-1", "name": "Відділення №1: вул. Якова Шепеля, 1", "type": "Branch", "max_weight": 1100},
            {"ref": "wh-vin-5", "name": "Відділення №5: вул. Соборна, 89", "type": "Branch", "max_weight": 30}
        ]
    },
    {
        "ref": "db5c88a2-391c-11dd-90d9-001a92567626",
        "name": "Івано-Франківськ",
        "region": "Івано-Франківська область",
        "warehouses": [
            {"ref": "wh-if-1", "name": "Відділення №1: вул. Польова, 8", "type": "Branch", "max_weight": 1100},
            {"ref": "wh-if-4", "name": "Відділення №4: вул. Незалежності, 97", "type": "Branch", "max_weight": 30}
        ]
    }
]

NP_API_URL = "https://api.novaposhta.ua/v2.0/json/"
CACHE_CITIES = {}  # query -> (timestamp, data)
CACHE_WAREHOUSES = {}  # key -> (timestamp, data)

def search_settlements(query=""):
    """
    Searches settlements using Nova Poshta API 2.0 searchSettlements.
    Falls back to UKRAINE_CITIES if offline or API error.
    """
    q = (query or "").strip()
    if not q:
        return UKRAINE_CITIES

    cache_key = q.lower()
    now = time.time()
    if cache_key in CACHE_CITIES:
        ts, data = CACHE_CITIES[cache_key]
        if now - ts < 300:
            return data

    try:
        import urllib.request
        payload = {
            "modelName": "Address",
            "calledMethod": "searchSettlements",
            "methodProperties": {
                "CityName": q,
                "Limit": "25",
                "Page": "1"
            }
        }
        req = urllib.request.Request(
            NP_API_URL,
            json.dumps(payload).encode("utf-8"),
            {"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            if res_data.get("success") and res_data.get("data") and len(res_data["data"]) > 0:
                addresses = res_data["data"][0].get("Addresses", [])
                formatted = []
                for item in addresses:
                    formatted.append({
                        "ref": item.get("DeliveryCity") or item.get("Ref"),
                        "settlementRef": item.get("Ref"),
                        "name": item.get("MainDescription") or item.get("Present"),
                        "present": item.get("Present"),
                        "area": item.get("AreaDescription") or item.get("Area") or "",
                        "region": item.get("RegionsDescription") or item.get("Region") or "",
                        "settlementType": item.get("SettlementTypeCode") or ""
                    })
                CACHE_CITIES[cache_key] = (now, formatted)
                return formatted
    except Exception as e:
        print(f"Error in NP search_settlements: {e}")

    # Fallback to local data
    q_lower = q.lower()
    return [c for c in UKRAINE_CITIES if q_lower in c["name"].lower() or q_lower in c["region"].lower()]

def get_city_warehouses(city_ref="", city_name="", q="", category=""):
    """
    Fetches warehouses/postomats using Nova Poshta API 2.0 getWarehouses.
    Supports filtering by city_ref, city_name, q (street/number), category (Branch, Postomat).
    """
    city_ref = (city_ref or "").strip()
    city_name = (city_name or "").strip()
    q = (q or "").strip()
    category = (category or "").strip()

    if not city_ref and not city_name:
        return []

    cache_key = f"{city_ref}_{city_name}_{q}_{category}".lower()
    now = time.time()
    if cache_key in CACHE_WAREHOUSES:
        ts, data = CACHE_WAREHOUSES[cache_key]
        if now - ts < 300:
            return data

    try:
        import urllib.request
        method_props = {
            "Limit": "500",
            "FindByString": q
        }
        if city_ref:
            method_props["CityRef"] = city_ref
        elif city_name:
            method_props["CityName"] = city_name

        payload = {
            "modelName": "Address",
            "calledMethod": "getWarehouses",
            "methodProperties": method_props
        }

        req = urllib.request.Request(
            NP_API_URL,
            json.dumps(payload).encode("utf-8"),
            {"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            raw_warehouses = res_data.get("data") if res_data.get("success") else []

            # Fallback by clean city name if cityRef failed or was empty
            if (not raw_warehouses or len(raw_warehouses) == 0) and city_name:
                import re
                clean_name = re.sub(r'^(м|смт|с|село|місто)\.?\s*', '', city_name, flags=re.I).split(',')[0].strip()
                fb_props = {
                    "Limit": "500",
                    "FindByString": q,
                    "CityName": clean_name
                }
                fb_payload = {
                    "modelName": "Address",
                    "calledMethod": "getWarehouses",
                    "methodProperties": fb_props
                }
                fb_req = urllib.request.Request(
                    NP_API_URL,
                    json.dumps(fb_payload).encode("utf-8"),
                    {"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(fb_req, timeout=6) as fb_resp:
                    fb_res_data = json.loads(fb_resp.read().decode("utf-8"))
                    if fb_res_data.get("success") and fb_res_data.get("data"):
                        raw_warehouses = fb_res_data["data"]

            if raw_warehouses and isinstance(raw_warehouses, list):
                warehouses = []
                for item in raw_warehouses:
                    desc = item.get("Description", "")
                    cat_val = item.get("CategoryOfWarehouse", "")
                    is_postomat = (cat_val == "Postomat" or "поштомат" in desc.lower())
                    wh_item = {
                        "ref": item.get("Ref"),
                        "number": item.get("Number"),
                        "name": desc,
                        "description": desc,
                        "shortAddress": item.get("ShortAddress", ""),
                        "category": "Postomat" if is_postomat else "Branch",
                        "typeOfWarehouse": item.get("TypeOfWarehouse", ""),
                        "maxWeight": item.get("MaxWeightAllowed") or item.get("PlaceMaxWeightAllowed") or "30",
                        "phone": item.get("Phone", "")
                    }
                    if category == "Branch" and wh_item["category"] != "Branch":
                        continue
                    if category == "Postomat" and wh_item["category"] != "Postomat":
                        continue
                    warehouses.append(wh_item)

                CACHE_WAREHOUSES[cache_key] = (now, warehouses)
                return warehouses
    except Exception as e:
        print(f"Error in NP get_city_warehouses: {e}")

    # Fallback to local mock data
    for c in UKRAINE_CITIES:
        if (city_ref and c["ref"] == city_ref) or (city_name and c["name"].lower() == city_name.lower()):
            whs = []
            for w in c.get("warehouses", []):
                cat = "Postomat" if w.get("type") == "Postomat" else "Branch"
                if category == "Branch" and cat != "Branch":
                    continue
                if category == "Postomat" and cat != "Postomat":
                    continue
                whs.append({
                    "ref": w["ref"],
                    "number": w.get("number", "1"),
                    "name": w["name"],
                    "description": w["name"],
                    "shortAddress": w["name"],
                    "category": cat,
                    "maxWeight": w.get("max_weight", 30)
                })
            return whs

    return [
        {"ref": "wh-gen-1", "number": "1", "name": "Відділення №1 (Вантажне): вул. Центральна, 1", "description": "Відділення №1 (Вантажне): вул. Центральна, 1", "shortAddress": "вул. Центральна, 1", "category": "Branch", "maxWeight": 1100},
        {"ref": "wh-gen-2", "number": "2", "name": "Відділення №2 (до 30 кг): вул. Головна, 25", "description": "Відділення №2 (до 30 кг): вул. Головна, 25", "shortAddress": "вул. Головна, 25", "category": "Branch", "maxWeight": 30},
        {"ref": "wh-gen-postomat", "number": "1001", "name": "Поштомат №1001: просп. Свободи, 10", "description": "Поштомат №1001: просп. Свободи, 10", "shortAddress": "просп. Свободи, 10", "category": "Postomat", "maxWeight": 20}
    ]

def generate_ttn_number():
    """Generates authentic 14-digit Nova Poshta TTN (e.g. 20450893124578)."""
    prefix = "2045"
    body = "".join([str(random.randint(0, 9)) for _ in range(10)])
    return prefix + body

def generate_shipping_sticker_html(order, shipment, items, supplier):
    """
    Generates a printable, barcode-styled Nova Poshta PDF/HTML Express Waybill Sticker
    to be forwarded directly to the supplier warehouse.
    """
    ttn = shipment.get("ttn_number") or generate_ttn_number()
    items_list_html = "".join([
        f"<li><b>{it['product_sku']}</b> - {it['product_title']} x {it['quantity']} шт. ({it['price_per_item']} грн)</li>"
        for it in items
    ])
    
    html = f"""<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>Експрес-накладна Нова Пошта № {ttn}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 20px; color: #1e293b; }}
  .sticker-card {{ max-width: 600px; margin: 0 auto; background: white; border: 2px dashed #e11d48; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }}
  .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 16px; }}
  .np-logo {{ font-weight: 900; font-size: 24px; color: #dc2626; letter-spacing: -0.5px; }}
  .ttn-badge {{ font-size: 20px; font-weight: 800; font-family: monospace; background: #fee2e2; color: #991b1b; padding: 6px 14px; border-radius: 8px; }}
  .barcode-sim {{ background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 5px, #000 5px, #000 7px, #fff 7px, #fff 9px); height: 50px; margin: 16px 0; border-radius: 4px; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; font-size: 14px; }}
  .box {{ background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0; }}
  .box h4 {{ margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; color: #64748b; }}
  .items-box {{ background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; font-size: 13px; margin-bottom: 16px; }}
  .footer {{ display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px; color: #64748b; }}
  .print-btn {{ background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; }}
  @media print {{
    body {{ background: white; padding: 0; }}
    .print-btn {{ display: none; }}
    .sticker-card {{ border: 2px solid #000; box-shadow: none; }}
  }}
</style>
</head>
<body>
<div class="sticker-card">
  <div class="header">
    <div class="np-logo">НОВА ПОШТА 📦</div>
    <div class="ttn-badge">ЕН: {ttn}</div>
  </div>
  
  <div class="barcode-sim"></div>
  
  <div class="grid">
    <div class="box">
      <h4>Відправник (Склад)</h4>
      <b>{supplier['name']}</b><br>
      {supplier['warehouse_city']}, {supplier['warehouse_address']}<br>
      <span>ФОП Магазин GRAYKO</span>
    </div>
    <div class="box">
      <h4>Одержувач (Клієнт)</h4>
      <b>{order['customer_name']}</b><br>
      Тел: {order['customer_phone']}<br>
      {order['delivery_city']}, {order['delivery_warehouse']}
    </div>
  </div>
  
  <div class="items-box">
    <h4 style="margin:0 0 6px 0; color:#b45309;">Товарний склад відправлення ({shipment['shipment_number']})</h4>
    <ul style="margin:0; padding-left:18px;">
      {items_list_html}
    </ul>
  </div>
  
  <div class="grid">
    <div class="box">
      <h4>Оголошена вартість</h4>
      <b style="font-size:16px;">{sum(it['price_per_item'] * it['quantity'] for it in items):.2f} грн</b>
    </div>
    <div class="box">
      <h4>Форма розрахунку</h4>
      <b>{order['payment_method']}</b> ({'Сплачено онлайн' if order['payment_status'] == 'PAID' else 'Післяплата (Контроль оплати NovaPay)'})
    </div>
  </div>
  
  <div class="footer">
    <span>Створено в системі GRAYKO Kids Toys &copy; 2026</span>
    <button class="print-btn" onclick="window.print()">Друк стікера 🖨️</button>
  </div>
</div>
</body>
</html>"""
    return html
