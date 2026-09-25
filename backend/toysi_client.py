import os
import re
import json
import urllib.request
import urllib.parse
from datetime import datetime

TOYSI_API_URL = "https://toysi.ua/api.php"
TOYSI_USER_ID = "1000082303"
TOYSI_SECRET_KEY = "7f3aca02c15a225164bbcb885d0d9b4e"

def clean_phone_number(phone_raw):
    """Formats phone number to Toysi required 12 digits: 380XXXXXXXXX."""
    digits = re.sub(r'\D', '', str(phone_raw))
    if digits.startswith('0') and len(digits) == 10:
        digits = '38' + digits
    elif digits.startswith('80') and len(digits) == 11:
        digits = '3' + digits
    elif len(digits) == 9:
        digits = '380' + digits
    return digits[:12]

def extract_warehouse_number(wh_text):
    """Extracts warehouse integer number from string like 'Відділення №35: вул. ...'."""
    if not wh_text:
        return 0
    match = re.search(r'№\s*(\d+)', wh_text)
    if match:
        return int(match.group(1))
    match_num = re.search(r'\d+', wh_text)
    if match_num:
        return int(match_num.group(0))
    return 0

def split_full_name(full_name):
    """Splits full name into firstname, lastname, middlename."""
    parts = full_name.strip().split()
    if len(parts) >= 3:
        return parts[1], parts[0], parts[2]  # First, Last, Middle
    elif len(parts) == 2:
        return parts[1], parts[0], ""        # First, Last
    elif len(parts) == 1:
        return parts[0], "Клієнт", ""
    return "Клієнт", "Покупець", ""

def create_toysi_order(order, items, is_test=False):
    """
    Submits order to Toysi API (https://toysi.ua/api-doc.php).
    Returns dict with success status, Toysi order_id, or error.
    """
    phone = clean_firstname = clean_lastname = clean_middlename = ""
    firstname, lastname, middlename = split_full_name(order.get('customer_name', ''))
    phone = clean_phone_number(order.get('customer_phone', ''))

    city = order.get('delivery_city', 'Київ')
    warehouse_raw = order.get('delivery_warehouse', '')
    warehouse_id = extract_warehouse_number(warehouse_raw)

    # Build positions_quantity array for Toysi
    # Toysi requires offer IDs from the feed as integer keys
    positions_quantity = {}
    for it in items:
        # supplier_sku is the offer id from the XML feed
        sku = str(it.get('supplier_sku') or it.get('product_sku', '')).replace('TY-', '')
        sku_digits = re.search(r'\d+', sku)
        if sku_digits:
            offer_id = int(sku_digits.group(0))
            qty = max(1, int(it.get('quantity', 1)))
            positions_quantity[offer_id] = positions_quantity.get(offer_id, 0) + qty

    if not positions_quantity:
        return {"success": False, "error": "Не знайдено валідних артикулів Toysi для замовлення."}

    # Format POST data (application/x-www-form-urlencoded)
    post_params = [
        ('api_version', '1'),
        ('api_method', 'order_create'),
        ('auth_user', TOYSI_USER_ID),
        ('auth_key', TOYSI_SECRET_KEY),
        ('internal_order_id', str(order.get('order_number', f"GR-{order.get('id', 1)}"))[:25]),
        ('positions_count', str(len(positions_quantity))),
        ('comment', f"Замовлення інтернет-магазину GRAYKO. Повна передоплата від клієнта."),
        ('shipping_warehouse_id', str(warehouse_id)),
        ('shipping_carrier_name', 'Нова Пошта'),
        ('shipping_city', city),
        ('shipping_city_id', ''),
        ('shipping_address', warehouse_raw if warehouse_id == 0 else ''),
        ('shipping_firstname', firstname),
        ('shipping_lastname', lastname),
        ('shipping_middlename', middlename),
        ('shipping_phone', phone),
        ('shipping_dt', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
        ('shipping_moneyback', '0'),  # 100% Prepayment (no cash on delivery)
        ('shipping_declared_value', str(max(500, int(float(order.get('total_amount', 500))))))
    ]

    # Add array entries: positions_quantity[<offer_id>]=<qty>
    for oid, q in positions_quantity.items():
        post_params.append((f'positions_quantity[{oid}]', str(q)))

    if is_test:
        post_params.append(('api_mode', 'test'))

    encoded_data = urllib.parse.urlencode(post_params).encode('utf-8')

    try:
        req = urllib.request.Request(
            TOYSI_API_URL,
            data=encoded_data,
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'GraykoECommerce/1.0'
            }
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw_res = resp.read().decode('utf-8')
            res = json.loads(raw_res)

        code = res.get('response_code')
        if code in [1, 2]:
            return {
                "success": True,
                "toysi_order_id": res.get('order_id'),
                "sum_with_discount": res.get('sum_with_discount'),
                "message": res.get('response_msg', 'Замовлення успішно створено в Toysi'),
                "raw": res
            }
        else:
            return {
                "success": False,
                "error": f"Помилка Toysi API ({code}): {res.get('response_msg')}",
                "raw": res
            }
    except Exception as e:
        return {"success": False, "error": f"Мережева помилка підключення до Toysi API: {str(e)}"}

def check_toysi_order_status(toysi_order_id):
    """Queries Toysi API for order status by order_id."""
    post_params = {
        'api_version': '1',
        'api_method': 'order_status',
        'auth_user': TOYSI_USER_ID,
        'auth_key': TOYSI_SECRET_KEY,
        'order_id': str(toysi_order_id)
    }
    encoded_data = urllib.parse.urlencode(post_params).encode('utf-8')
    try:
        req = urllib.request.Request(TOYSI_API_URL, data=encoded_data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}
