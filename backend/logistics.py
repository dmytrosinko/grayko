import random
import json
from datetime import datetime

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

def search_settlements(query=""):
    """Simulates Nova Poshta API 2.0 Settlement search."""
    q = query.strip().lower()
    if not q:
        return UKRAINE_CITIES
    return [c for c in UKRAINE_CITIES if q in c["name"].lower() or q in c["region"].lower()]

def get_city_warehouses(city_name):
    """Returns warehouses & postomats for a chosen city."""
    for c in UKRAINE_CITIES:
        if c["name"].lower() == city_name.lower():
            return c["warehouses"]
    return [
        {"ref": "wh-gen-1", "name": f"Відділення №1 (Вантажне): вул. Центральна, 1", "type": "Branch", "max_weight": 1100},
        {"ref": "wh-gen-2", "name": f"Відділення №2 (до 30 кг): вул. Головна, 25", "type": "Branch", "max_weight": 30},
        {"ref": "wh-gen-postomat", "name": f"Поштомат №1001: просп. Свободи, 10", "type": "Postomat", "max_weight": 20}
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
