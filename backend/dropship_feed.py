import os
import sys
import re
import json
import time
import random
import urllib.request
import sqlite3
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from db import get_db_connection, DB_PATH, init_db

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_LINK_FILE = os.path.join(BASE_DIR, 'docs', 'catalog-link')
DEFAULT_FEED_URL = "https://toysi.ua/feed-products-residue.php?key=7f3aca02c15a225164bbcb885d0d9b4e&vendor_code=prom&out_of_stock=2&picture=10&lwh=yes&prom_cat=1&lang=ukr&price_to=10000&round=up&category=-51995,98922,98932,98943,99090,99104,99194,99223,99236,99238&margin_ukr=0.3&margin_import=0.3&margin_action=0.2"
FEED_XML_PATH = os.path.join(BASE_DIR, 'data', 'toysi_feed.xml')

# Transliteration dictionary for Ukrainian Cyrillic to URL-friendly Latin
CYRILLIC_TO_LATIN = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
    'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l',
    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '',
    'ю': 'yu', 'я': 'ya', 'ъ': ''
}

# Category icon mapping based on Ukrainian title keywords
CATEGORY_ICONS = [
    (re.compile(r'машин|робот|збро|вертоліт|літак|радіокер|транспорт', re.I), '🏎️'),
    (re.compile(r'конструктор|лего|lego', re.I), '⚙️'),
    (re.compile(r'ляльк|пупс|м\'як|плюш|герої', re.I), '🧸'),
    (re.compile(r'дерев\'ян|монтессорі|кубик|сортер', re.I), '🪵'),
    (re.compile(r'ігрові набори|кухн|лікар|посуд|інструмент', re.I), '👨‍🍳'),
    (re.compile(r'настільн|пазл|головолом|мозаїк', re.I), '🎲'),
    (re.compile(r'творч|малюв|ліплен|пісок|бісер', re.I), '🎨'),
    (re.compile(r'інтерактив|навчан|малюк|музич|гаджет', re.I), '🔬'),
    (re.compile(r'велосипед|самокат|біговел|коляск|автокрісл', re.I), '🚲'),
    (re.compile(r'косметик|прикрас|сумочк', re.I), '💄'),
    (re.compile(r'антистрес|слайм|pop it', re.I), '✨'),
    (re.compile(r'сезон|літ|зим|басейн|надувн', re.I), '☀️'),
    (re.compile(r'патріот|украї', re.I), '🇺🇦'),
    (re.compile(r'геловін|halloween|карнавал', re.I), '🎃')
]

def slugify(text, extra_id=""):
    text = str(text).lower()
    out = []
    for char in text:
        if char in CYRILLIC_TO_LATIN:
            out.append(CYRILLIC_TO_LATIN[char])
        elif char.isalnum():
            out.append(char)
        elif char in [' ', '-', '_']:
            out.append('-')
    res = re.sub(r'-+', '-', ''.join(out)).strip('-')
    if extra_id:
        res = f"{res[:50]}-{extra_id}"
    return res or f"item-{extra_id}"

def get_feed_url():
    """Reads live feed URL from docs/catalog-link with fallback."""
    if os.path.exists(CATALOG_LINK_FILE):
        try:
            with open(CATALOG_LINK_FILE, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content.startswith('http'):
                    return content
        except Exception as e:
            print(f"Warning: could not read {CATALOG_LINK_FILE}: {e}")
    return DEFAULT_FEED_URL

def fetch_feed_xml(force=False):
    """Downloads XML from Toysi.ua feed URL, caching to data/toysi_feed.xml."""
    os.makedirs(os.path.dirname(FEED_XML_PATH), exist_ok=True)
    
    # If file exists and not forced, check if younger than 4 hours (14400s)
    if not force and os.path.exists(FEED_XML_PATH):
        file_age = time.time() - os.path.getmtime(FEED_XML_PATH)
        if file_age < 14400 and os.path.getsize(FEED_XML_PATH) > 1000000:
            print(f"Using cached feed XML (age: {file_age/60:.1f} mins, {os.path.getsize(FEED_XML_PATH):,} bytes)")
            return FEED_XML_PATH
            
    url = get_feed_url()
    print(f"Downloading live catalog feed from: {url[:70]}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = resp.read()
        with open(FEED_XML_PATH, 'wb') as f:
            f.write(data)
    print(f"Feed downloaded successfully: {len(data):,} bytes saved to {FEED_XML_PATH}")
    return FEED_XML_PATH

def parse_stock(ost_text, available_attr):
    """Parses stock quantity string from feed into an integer."""
    if available_attr == 'false':
        return 0
    if not ost_text:
        return 10 if available_attr == 'true' else 0
    m = re.search(r'\d+', ost_text)
    if m:
        return int(m.group(0))
    return 10 if available_attr == 'true' else 0

def map_age_group(age_val):
    """Normalizes age string into standardized age_group filters."""
    if not age_val:
        return '3-5 років'
    val = str(age_val).lower()
    if '0-' in val or '0+' in val or '6 міс' in val or 'від 0' in val or 'до 1' in val:
        return '0-1 рік'
    elif '1-' in val or '1+' in val or '1.5' in val or 'від 1' in val or '2+' in val:
        return '1-3 роки'
    elif '3-' in val or '3+' in val or 'від 3' in val or '4+' in val or '5+' in val:
        return '3-5 років'
    elif '6-' in val or '6+' in val or 'від 6' in val or '7+' in val or '8+' in val:
        return '6-8 років'
    elif '9-' in val or '9+' in val or '10+' in val or '12+' in val:
        return '9-12 років'
    elif '14+' in val or '16+' in val:
        return '14+'
    return '3-5 років'

def parse_description_metadata(desc_html):
    """Extracts Brand, Material, Age, Specifications from description HTML."""
    if not desc_html:
        return {}, "Тойсі", "безпечний пластик", "3-5 років"
        
    specs = {}
    brand = None
    material = None
    age_group = None
    
    matches = re.findall(r'<b>([^<]+):</b>\s*([^<]+)', desc_html)
    for k, v in matches:
        k_clean = k.strip()
        v_clean = v.strip()
        if k_clean == 'Бренд':
            brand = v_clean
        elif k_clean == 'Матеріал':
            material = v_clean
        elif k_clean == 'Вік':
            age_group = map_age_group(v_clean)
        else:
            specs[k_clean] = v_clean
            
    if not brand:
        brand = "Тойсі"
    if not material:
        material = "безпечний пластик"
    if not age_group:
        age_group = "3-5 років"
        
    return specs, brand, material, age_group

def get_category_icon(name):
    for pattern, icon in CATEGORY_ICONS:
        if pattern.search(name):
            return icon
    return '🧸'

# ----------------- MAIN DATABASE SEED & SYNC ----------------- #

def seed_database():
    """
    Initializes the database from the live Toysi XML feed (203 categories, ~17k products).
    Clears previous data and populates fresh, indexed catalog.
    """
    init_db()
    xml_file = fetch_feed_xml(force=False)
    
    print("Parsing XML feed data for database seeding...")
    t0 = time.time()
    tree = ET.parse(xml_file)
    shop = tree.getroot().find('shop')
    if shop is None:
        raise ValueError("Invalid YML feed: <shop> element not found")
        
    cats_elem = shop.find('categories')
    offers_elem = shop.find('offers')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = OFF")
    
    # Clean tables
    cursor.execute("DELETE FROM order_items")
    cursor.execute("DELETE FROM order_shipments")
    cursor.execute("DELETE FROM orders")
    cursor.execute("DELETE FROM cross_sell_rules")
    cursor.execute("DELETE FROM feed_sync_logs")
    cursor.execute("DELETE FROM products")
    cursor.execute("DELETE FROM categories")
    cursor.execute("DELETE FROM suppliers")
    cursor.execute("DELETE FROM sqlite_sequence")
    
    # 1. Insert Toysi Supplier
    cursor.execute("""
    INSERT INTO suppliers (id, name, code, warehouse_city, warehouse_address, feed_url, feed_type, settlement_terms, deposit_balance, free_packing_threshold, packing_fee)
    VALUES (1, 'Центральний склад Тойсі', 'TOYSI_UA', 'Київ', 'вул. Алма-Атинська, 35а', ?, 'YML', 'Відвантаження щодня Новою Поштою. Дропшипінг за передоплатою.', 15000.0, 1000.0, 15.0)
    """, (get_feed_url(),))
    supplier_id = 1
    
    # 2. Insert Categories
    print("Inserting categories...")
    category_rows = []
    if cats_elem is not None:
        for c in cats_elem.findall('category'):
            cid = int(c.attrib.get('id'))
            pid_str = c.attrib.get('parentId')
            pid = int(pid_str) if pid_str else None
            cname = (c.text or '').strip()
            cslug = slugify(cname, cid)
            cicon = get_category_icon(cname)
            category_rows.append((cid, pid, cslug, cname, cicon, f"Дитячі іграшки категорії {cname}"))
            
    # Sort root categories first (where parent_id is None)
    category_rows.sort(key=lambda x: (1 if x[1] is not None else 0, x[0]))
    cursor.executemany("""
    INSERT INTO categories (id, parent_id, slug, name_uk, icon, description_uk)
    VALUES (?, ?, ?, ?, ?, ?)
    """, category_rows)
    print(f"Inserted {len(category_rows)} categories.")
    
    # 3. Parse and Insert Offers
    print("Parsing and inserting products...")
    offers = offers_elem.findall('offer') if offers_elem is not None else []
    product_rows = []
    
    for idx, o in enumerate(offers):
        oid = o.attrib.get('id', str(idx + 1))
        available = o.attrib.get('available', 'true')
        
        name_elem = o.find('name')
        title_uk = (name_elem.text or f"Іграшка #{oid}").strip() if name_elem is not None else f"Іграшка #{oid}"
        
        vendor_elem = o.find('vendorCode')
        vendor_code = (vendor_elem.text or oid).strip() if vendor_elem is not None else oid
        internal_sku = f"TY-{vendor_code}"
        slug = slugify(title_uk, oid)
        
        price_elem = o.find('price')
        price = float(price_elem.text) if price_elem is not None and price_elem.text else 100.0
        cost_price = round(price / 1.3, 2)
        rrp_price = price
        
        cat_elem = o.find('categoryId')
        category_id = int(cat_elem.text) if cat_elem is not None and cat_elem.text and cat_elem.text.isdigit() else None
        
        ost_elem = o.find('ostatok')
        ost_text = ost_elem.text if ost_elem is not None else ''
        stock_qty = parse_stock(ost_text, available)
        is_active = 1 if stock_qty > 0 and available == 'true' else 0
        
        # Images
        images = [p.text.strip() for p in o.findall('picture') if p.text and p.text.strip()]
        if not images:
            images = ['https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600']
            
        desc_elem = o.find('description')
        desc_html = desc_elem.text if desc_elem is not None else ''
        specs, brand, material, age_group = parse_description_metadata(desc_html)
        
        # Extra tags
        is_bestseller = 1 if stock_qty > 20 and price < 1500 and idx % 7 == 0 else 0
        is_new = 1 if idx % 11 == 0 else 0
        is_featured = 1 if idx % 23 == 0 else 0
        
        skills = ["дрібна моторика", "уява", "просторове мислення"]
        
        product_rows.append((
            supplier_id, vendor_code, internal_sku, slug, title_uk, desc_html,
            brand, category_id, 3, 12, age_group, material,
            0, 0, 'Середній', json.dumps(skills, ensure_ascii=False),
            cost_price, rrp_price, price, stock_qty, is_active,
            is_featured, is_new, is_bestseller,
            json.dumps(images), '', json.dumps(specs, ensure_ascii=False)
        ))
        
        # Batch insert every 1000 items
        if len(product_rows) >= 1000:
            cursor.executemany("""
            INSERT INTO products (
                supplier_id, supplier_sku, internal_sku, slug, title_uk, description_uk,
                brand, category_id, min_age, max_age, age_group, material,
                parts_count, assembly_time_mins, difficulty_level, skills_developed,
                cost_price, rrp_price, price, stock_quantity, is_active,
                is_featured, is_new, is_bestseller, images, video_url, specifications, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, product_rows)
            product_rows = []
            
    # Final remaining batch
    if product_rows:
        cursor.executemany("""
        INSERT INTO products (
            supplier_id, supplier_sku, internal_sku, slug, title_uk, description_uk,
            brand, category_id, min_age, max_age, age_group, material,
            parts_count, assembly_time_mins, difficulty_level, skills_developed,
            cost_price, rrp_price, price, stock_quantity, is_active,
            is_featured, is_new, is_bestseller, images, video_url, specifications, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, product_rows)
        
    cursor.execute("""
    INSERT INTO feed_sync_logs (supplier_id, sync_type, status, items_processed, items_updated, items_added, rrp_violations_count, details)
    VALUES (?, 'FULL', 'SUCCESS', ?, 0, ?, 0, 'Базу даних успішно ініціалізовано з повного XML фіду Toysi.ua')
    """, (supplier_id, len(offers), len(offers)))
    
    conn.commit()
    conn.close()
    
    elapsed = time.time() - t0
    print(f"Database successfully seeded with {len(offers)} products and {len(category_rows)} categories in {elapsed:.2f}s!")
    return {
        "success": True,
        "categories_count": len(category_rows),
        "products_count": len(offers),
        "duration_seconds": round(elapsed, 2)
    }

def sync_catalog_from_feed(sync_type='FAST', force_download=True):
    """
    Core function to update catalog according to supplier changes (runs every 4 hours or on-demand).
    - FAST: Updates stock quantities, prices and availability for existing products, plus adds any newly discovered items.
    - FULL: Re-scans all descriptions, categories, images, specifications, adds new items, and updates existing.
    """
    t0 = time.time()
    try:
        xml_file = fetch_feed_xml(force=force_download)
    except Exception as e:
        print(f"Sync error fetching XML: {e}")
        return {"success": False, "error": f"Помилка завантаження фіду: {str(e)}"}
        
    tree = ET.parse(xml_file)
    shop = tree.getroot().find('shop')
    if shop is None:
        return {"success": False, "error": "Некоректний XML: відсутній елемент <shop>"}
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = OFF")
    supplier_id = 1
    
    # 1. Update/Add Categories if full sync
    if sync_type == 'FULL':
        cats_elem = shop.find('categories')
        if cats_elem is not None:
            for c in cats_elem.findall('category'):
                cid = int(c.attrib.get('id'))
                pid_str = c.attrib.get('parentId')
                pid = int(pid_str) if pid_str else None
                cname = (c.text or '').strip()
                cslug = slugify(cname, cid)
                cicon = get_category_icon(cname)
                cursor.execute("""
                INSERT INTO categories (id, parent_id, slug, name_uk, icon, description_uk)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name_uk = excluded.name_uk,
                    parent_id = excluded.parent_id,
                    icon = excluded.icon
                """, (cid, pid, cslug, cname, cicon, f"Дитячі іграшки категорії {cname}"))

    # 2. Load existing product SKU map
    cursor.execute("SELECT id, supplier_sku, price, stock_quantity, is_active FROM products WHERE supplier_id = ?", (supplier_id,))
    existing_products = {row['supplier_sku']: dict(row) for row in cursor.fetchall()}
    
    offers_elem = shop.find('offers')
    offers = offers_elem.findall('offer') if offers_elem is not None else []
    
    items_processed = len(offers)
    items_updated = 0
    items_added = 0
    out_of_stock_count = 0
    
    new_products_batch = []
    
    for idx, o in enumerate(offers):
        oid = o.attrib.get('id', str(idx + 1))
        available = o.attrib.get('available', 'true')
        
        vendor_elem = o.find('vendorCode')
        vendor_code = (vendor_elem.text or oid).strip() if vendor_elem is not None else oid
        
        price_elem = o.find('price')
        price = float(price_elem.text) if price_elem is not None and price_elem.text else 100.0
        cost_price = round(price / 1.3, 2)
        rrp_price = price
        
        ost_elem = o.find('ostatok')
        ost_text = ost_elem.text if ost_elem is not None else ''
        stock_qty = parse_stock(ost_text, available)
        is_active = 1 if stock_qty > 0 and available == 'true' else 0
        
        if is_active == 0:
            out_of_stock_count += 1
            
        if vendor_code in existing_products:
            # Existing product: update stock and price
            curr = existing_products[vendor_code]
            if curr['stock_quantity'] != stock_qty or curr['price'] != price or curr['is_active'] != is_active:
                cursor.execute("""
                UPDATE products SET
                    stock_quantity = ?,
                    price = ?,
                    cost_price = ?,
                    rrp_price = ?,
                    is_active = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """, (stock_qty, price, cost_price, rrp_price, is_active, curr['id']))
                items_updated += 1
        else:
            # New product found in feed! Add it to the store.
            name_elem = o.find('name')
            title_uk = (name_elem.text or f"Іграшка #{oid}").strip() if name_elem is not None else f"Іграшка #{oid}"
            internal_sku = f"TY-{vendor_code}"
            slug = slugify(title_uk, oid)
            
            cat_elem = o.find('categoryId')
            category_id = int(cat_elem.text) if cat_elem is not None and cat_elem.text and cat_elem.text.isdigit() else None
            
            images = [p.text.strip() for p in o.findall('picture') if p.text and p.text.strip()]
            if not images:
                images = ['https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600']
                
            desc_elem = o.find('description')
            desc_html = desc_elem.text if desc_elem is not None else ''
            specs, brand, material, age_group = parse_description_metadata(desc_html)
            
            new_products_batch.append((
                supplier_id, vendor_code, internal_sku, slug, title_uk, desc_html,
                brand, category_id, 3, 12, age_group, material,
                0, 0, 'Середній', json.dumps(["дрібна моторика", "уява"], ensure_ascii=False),
                cost_price, rrp_price, price, stock_qty, is_active,
                0, 1, 0, json.dumps(images), '', json.dumps(specs, ensure_ascii=False)
            ))
            items_added += 1
            
            if len(new_products_batch) >= 500:
                cursor.executemany("""
                INSERT INTO products (
                    supplier_id, supplier_sku, internal_sku, slug, title_uk, description_uk,
                    brand, category_id, min_age, max_age, age_group, material,
                    parts_count, assembly_time_mins, difficulty_level, skills_developed,
                    cost_price, rrp_price, price, stock_quantity, is_active,
                    is_featured, is_new, is_bestseller, images, video_url, specifications, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, new_products_batch)
                new_products_batch = []
                
    if new_products_batch:
        cursor.executemany("""
        INSERT INTO products (
            supplier_id, supplier_sku, internal_sku, slug, title_uk, description_uk,
            brand, category_id, min_age, max_age, age_group, material,
            parts_count, assembly_time_mins, difficulty_level, skills_developed,
            cost_price, rrp_price, price, stock_quantity, is_active,
            is_featured, is_new, is_bestseller, images, video_url, specifications, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, new_products_batch)

    log_details = f"Опрацьовано {items_processed} товарів. Оновлено залишків/цін: {items_updated}, додано нових: {items_added}, не в наявності: {out_of_stock_count}."
    cursor.execute("""
    INSERT INTO feed_sync_logs (supplier_id, sync_type, status, items_processed, items_updated, items_added, rrp_violations_count, details)
    VALUES (?, ?, 'SUCCESS', ?, ?, ?, 0, ?)
    """, (supplier_id, sync_type, items_processed, items_updated, items_added, log_details))
    
    conn.commit()
    conn.close()
    
    elapsed = time.time() - t0
    result = {
        "success": True,
        "sync_type": sync_type,
        "items_processed": items_processed,
        "items_updated": items_updated,
        "items_added": items_added,
        "out_of_stock": out_of_stock_count,
        "duration_seconds": round(elapsed, 2),
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "next_sync_in": "4 години"
    }
    print(f"Sync ({sync_type}) finished: {log_details} ({elapsed:.2f}s)")
    return result

def run_fast_sync(supplier_id=1):
    return sync_catalog_from_feed(sync_type='FAST', force_download=True)

def run_full_sync(supplier_id=1):
    return sync_catalog_from_feed(sync_type='FULL', force_download=True)

def validate_and_update_price(product_id, new_price):
    """RRP Enforcement Rule: Price cannot be lower than recommended retail price (РРЦ)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title_uk, rrp_price, cost_price FROM products WHERE id = ?", (product_id,))
    product = cursor.fetchone()
    
    if not product:
        conn.close()
        return {"success": False, "error": "Товар не знайдено."}
        
    rrp = product["rrp_price"]
    if new_price < rrp:
        conn.close()
        return {
            "success": False,
            "error": f"Порушення умов дропшипінгу! Ціна ({new_price} грн) не може бути нижчою за РРЦ ({rrp} грн).",
            "rrp_price": rrp
        }
        
    cursor.execute("UPDATE products SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_price, product_id))
    conn.commit()
    conn.close()
    return {"success": True, "new_price": new_price, "product_title": product["title_uk"]}

if __name__ == '__main__':
    seed_database()
