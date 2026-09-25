import os
import sys
import json
import time
import sqlite3
import requests
import threading
from datetime import datetime

# Configure utf-8 encoding for stdout on Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_SUPABASE_PATH = os.path.join(BASE_DIR, 'env', 'supabase')
SQLITE_DB_PATH = os.path.join(BASE_DIR, 'data', 'store.db')

def load_supabase_credentials():
    """Reads SUPABASE_URL and SUPABASE_KEY from env/supabase, .env or environment variables."""
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_ANON_KEY')

    for p in [ENV_SUPABASE_PATH, os.path.join(BASE_DIR, '.env')]:
        if os.path.exists(p):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith('#'):
                            continue
                        delim = '=' if '=' in line else (':' if ':' in line else None)
                        if not delim:
                            continue
                        k, v = line.split(delim, 1)
                        k = k.strip().upper()
                        v = v.strip().strip('"\'')
                        if k in ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'] and v:
                            url = v
                        elif k in ['SUPABASE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY'] and v:
                            key = v
            except Exception as e:
                print(f"Error reading {p}: {e}")

    return url, key

def is_supabase_configured():
    url, key = load_supabase_credentials()
    if not url or not key:
        return False
    if 'your-project' in url or 'your-service-role' in key:
        return False
    return url.startswith('http')

def get_headers():
    url, key = load_supabase_credentials()
    return {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
    }

def upsert_to_supabase(table_name, items_list, on_conflict="id", batch_size=500):
    """
    Sends rows to Supabase PostgREST API using merge-duplicates upsert.
    """
    url, key = load_supabase_credentials()
    if not url or not key:
        return {"success": False, "error": "Supabase credentials not configured."}

    endpoint = f"{url.rstrip('/')}/rest/v1/{table_name}?on_conflict={on_conflict}"
    headers = get_headers()

    total = len(items_list)
    success_count = 0

    for i in range(0, total, batch_size):
        batch = items_list[i:i + batch_size]
        try:
            resp = requests.post(endpoint, json=batch, headers=headers, timeout=30)
            if resp.status_code in [200, 201, 204]:
                success_count += len(batch)
                print(f"  ⚡ [{table_name}] Synced {success_count}/{total} rows...")
            else:
                print(f"  ❌ Error syncing batch {i}-{i+len(batch)} to {table_name}: {resp.status_code} - {resp.text[:200]}")
                return {"success": False, "error": resp.text, "synced": success_count}
        except Exception as e:
            print(f"  ❌ Network error syncing to {table_name}: {e}")
            return {"success": False, "error": str(e), "synced": success_count}

    return {"success": True, "synced": success_count, "total": total}

def patch_supabase_product(product_id, update_fields):
    """
    Patches specific fields of an existing product in Supabase.
    """
    if not is_supabase_configured():
        return False
    url, key = load_supabase_credentials()
    endpoint = f"{url.rstrip('/')}/rest/v1/products?id=eq.{product_id}"
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    try:
        resp = requests.patch(endpoint, json=update_fields, headers=headers, timeout=10)
        return resp.status_code in [200, 204]
    except Exception as e:
        print(f"Error patching product {product_id} in Supabase: {e}")
        return False

def sync_sqlite_to_supabase():
    """
    Migrates all suppliers, categories and products from SQLite (data/store.db) to Supabase.
    """
    if not is_supabase_configured():
        return {
            "success": False,
            "error": "Supabase не налаштовано. Додайте SUPABASE_URL та SUPABASE_KEY у файл env/supabase."
        }

    t0 = time.time()
    print("🚀 Starting full synchronization: SQLite (store.db) -> Supabase PostgreSQL...")

    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Sync Suppliers
    cursor.execute("SELECT * FROM suppliers")
    suppliers = [dict(r) for r in cursor.fetchall()]
    print(f"📦 1/3: Syncing {len(suppliers)} suppliers...")
    res_sup = upsert_to_supabase("suppliers", suppliers, on_conflict="id")
    if not res_sup.get("success"):
        conn.close()
        return res_sup

    # 2. Sync Categories in topological order (parents first)
    cursor.execute("SELECT * FROM categories")
    raw_cats = [dict(r) for r in cursor.fetchall()]
    cat_by_id = {c['id']: c for c in raw_cats}
    ordered_ids = []
    visited = set()

    def visit(cid):
        if cid in visited:
            return
        p_id = cat_by_id[cid].get('parent_id')
        if p_id and p_id in cat_by_id and p_id not in visited:
            visit(p_id)
        visited.add(cid)
        ordered_ids.append(cid)

    for cid in cat_by_id:
        visit(cid)

    categories = []
    for cid in ordered_ids:
        c_dict = dict(cat_by_id[cid])
        c_dict['is_active'] = bool(c_dict.get('is_active', 1))
        categories.append(c_dict)

    print(f"📁 2/3: Syncing {len(categories)} categories (in hierarchical dependency order)...")
    res_cat = upsert_to_supabase("categories", categories, on_conflict="id", batch_size=200)
    if not res_cat.get("success"):
        conn.close()
        return res_cat

    # 3. Sync Products
    cursor.execute("SELECT * FROM products ORDER BY id ASC")
    products_rows = cursor.fetchall()
    print(f"🧸 3/3: Syncing {len(products_rows)} products in batches of 500...")

    products = []
    for r in products_rows:
        p = dict(r)
        # Parse JSON strings for Supabase JSONB columns
        try:
            p['skills_developed'] = json.loads(p.get('skills_developed') or '[]')
        except:
            p['skills_developed'] = []

        try:
            p['images'] = json.loads(p.get('images') or '[]')
        except:
            p['images'] = []

        try:
            p['specifications'] = json.loads(p.get('specifications') or '{}')
        except:
            p['specifications'] = {}

        products.append(p)

    res_prod = upsert_to_supabase("products", products, on_conflict="supplier_sku", batch_size=500)
    conn.close()

    elapsed = round(time.time() - t0, 2)
    print(f"✅ Supabase migration completed in {elapsed}s: {res_prod.get('synced')} products synced.")
    return {
        "success": True,
        "suppliers_synced": len(suppliers),
        "categories_synced": len(categories),
        "products_synced": res_prod.get("synced", 0),
        "duration_seconds": elapsed
    }

def sync_feed_changes_to_supabase(products_batch):
    """
    Called after feed sync to push updated/new products to Supabase.
    """
    if not is_supabase_configured() or not products_batch:
        return

    print(f"🔄 Pushing {len(products_batch)} feed updates to Supabase...")
    upsert_to_supabase("products", products_batch, on_conflict="supplier_sku", batch_size=500)

# ==============================================================================
# SUPABASE PRIMARY DATA ACCESS LAYER
# ==============================================================================

def supabase_get_categories():
    """Fetches all categories from Supabase."""
    url, key = load_supabase_credentials()
    endpoint = f"{url.rstrip('/')}/rest/v1/categories?select=*&order=id.asc"
    headers = get_headers()
    try:
        r = requests.get(endpoint, headers=headers, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception as e:
        print(f"Error fetching categories from Supabase: {e}")
    return None

def supabase_get_catalog(query):
    """
    Queries catalog products with filters, sorting, and pagination directly from Supabase.
    """
    url, key = load_supabase_credentials()
    headers = get_headers()
    headers['Prefer'] = 'count=exact'

    params = {
        'select': '*,categories(name_uk,slug),suppliers(name,code,warehouse_city)',
        'is_active': 'eq.1'
    }

    # Category filter
    if 'category' in query:
        cat_val = query['category'][0]
        if cat_val.isdigit():
            params['category_id'] = f'eq.{int(cat_val)}'

    # In stock filter
    if query.get('in_stock', ['0'])[0] == '1':
        params['stock_quantity'] = 'gt.0'

    # Price range
    if 'min_price' in query:
        params['price'] = f"gte.{float(query['min_price'][0])}"
    if 'max_price' in query:
        max_p = float(query['max_price'][0])
        if 'price' in params:
            # PostgREST supports multiple filters using and=(price.gte.X,price.lte.Y)
            min_p = float(query['min_price'][0])
            del params['price']
            params['and'] = f"(price.gte.{min_p},price.lte.{max_p})"
        else:
            params['price'] = f"lte.{max_p}"

    # Brand filter
    if 'brand' in query:
        brands = [b for b in query['brand'] if b]
        if brands:
            brand_list = ','.join([f'"{b}"' for b in brands])
            params['brand'] = f"in.({brand_list})"

    # Search keyword
    if 'q' in query and query['q'][0].strip():
        kw = query['q'][0].strip()
        params['or'] = f"(title_uk.ilike.*{kw}*,description_uk.ilike.*{kw}*,brand.ilike.*{kw}*,internal_sku.ilike.*{kw}*,supplier_sku.ilike.*{kw}*)"

    # Sorting
    sort_by = query.get('sort', ['popular'])[0]
    if sort_by == 'price_asc':
        params['order'] = 'price.asc'
    elif sort_by == 'price_desc':
        params['order'] = 'price.desc'
    elif sort_by == 'new':
        params['order'] = 'is_new.desc,id.desc'
    elif sort_by == 'parts_desc':
        params['order'] = 'parts_count.desc'
    else:
        params['order'] = 'is_bestseller.desc,id.desc'

    # Pagination
    try:
        limit = min(120, max(1, int(query.get('limit', [48])[0])))
    except (ValueError, TypeError):
        limit = 48

    try:
        offset = max(0, int(query.get('offset', [0])[0]))
    except (ValueError, TypeError):
        offset = 0

    params['limit'] = limit
    params['offset'] = offset

    endpoint = f"{url.rstrip('/')}/rest/v1/products"
    try:
        r = requests.get(endpoint, headers=headers, params=params, timeout=15)
        if r.status_code in [200, 206]:
            products_raw = r.json()
            # Extract total count from Content-Range header (e.g. 0-47/17237)
            cr = r.headers.get('content-range', '')
            total_count = int(cr.split('/')[-1]) if '/' in cr else len(products_raw)

            # Flatten category and supplier details for frontend compatibility
            products = []
            for p in products_raw:
                p_copy = dict(p)
                cat = p_copy.pop('categories', None) or {}
                sup = p_copy.pop('suppliers', None) or {}
                p_copy['category_name'] = cat.get('name_uk', '')
                p_copy['category_slug'] = cat.get('slug', '')
                p_copy['supplier_name'] = sup.get('name', '')
                p_copy['supplier_code'] = sup.get('code', '')
                p_copy['supplier_city'] = sup.get('warehouse_city', '')
                products.append(p_copy)

            return {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + len(products)) < total_count,
                "products": products,
                "data_source": "supabase",
                "facets": get_supabase_facets()
            }
    except Exception as e:
        print(f"Error querying catalog from Supabase: {e}")
    return None

_FACETS_CACHE = None
_FACETS_CACHE_TIME = 0

def get_supabase_facets():
    """Returns cached facets from Supabase to keep catalog queries fast."""
    global _FACETS_CACHE, _FACETS_CACHE_TIME
    now = time.time()
    if _FACETS_CACHE and (now - _FACETS_CACHE_TIME) < 600:
        return _FACETS_CACHE

    url, key = load_supabase_credentials()
    headers = get_headers()
    try:
        r = requests.get(f"{url.rstrip('/')}/rest/v1/products?select=brand,material,age_group&is_active=eq.1&limit=800", headers=headers, timeout=10)
        if r.status_code == 200:
            rows = r.json()
            brands = sorted(list({r['brand'] for r in rows if r.get('brand')}))[:30]
            materials = sorted(list({r['material'] for r in rows if r.get('material')}))[:20]
            age_groups = sorted(list({r['age_group'] for r in rows if r.get('age_group')}))
            _FACETS_CACHE = {
                "brands": brands,
                "materials": materials,
                "age_groups": age_groups,
                "skills": ["дрібна моторика", "інженерне мислення", "просторова уява", "STEM / фізика", "логіка", "сенсорика", "творчість"],
                "min_price": 5,
                "max_price": 5000
            }
            _FACETS_CACHE_TIME = now
            return _FACETS_CACHE
    except Exception as e:
        print(f"Error getting facets: {e}")

    return {
        "brands": [],
        "materials": [],
        "age_groups": [],
        "skills": ["дрібна моторика", "інженерне мислення", "просторова уява", "STEM / фізика", "логіка", "сенсорика", "творчість"],
        "min_price": 0,
        "max_price": 5000
    }

def supabase_get_product(slug_or_id):
    """Fetches a single product by ID or slug from Supabase."""
    url, key = load_supabase_credentials()
    headers = get_headers()
    params = {
        'select': '*,categories(name_uk,slug),suppliers(name,code,warehouse_city,warehouse_address)'
    }
    if str(slug_or_id).isdigit():
        params['id'] = f'eq.{int(slug_or_id)}'
    else:
        params['slug'] = f'eq.{slug_or_id}'

    endpoint = f"{url.rstrip('/')}/rest/v1/products"
    try:
        r = requests.get(endpoint, headers=headers, params=params, timeout=10)
        if r.status_code == 200:
            items = r.json()
            if items:
                p = items[0]
                cat = p.pop('categories', None) or {}
                sup = p.pop('suppliers', None) or {}
                p['category_name'] = cat.get('name_uk', '')
                p['category_slug'] = cat.get('slug', '')
                p['supplier_name'] = sup.get('name', '')
                p['supplier_code'] = sup.get('code', '')
                p['supplier_city'] = sup.get('warehouse_city', '')
                p['supplier_address'] = sup.get('warehouse_address', '')
                return p
    except Exception as e:
        print(f"Error fetching product from Supabase: {e}")
    return None

def supabase_create_order(order_data, shipments_list):
    """
    Creates an order with its shipments and items in Supabase.
    """
    url, key = load_supabase_credentials()
    headers = get_headers()
    headers['Prefer'] = 'return=representation'

    try:
        # 1. Insert order
        r_ord = requests.post(f"{url.rstrip('/')}/rest/v1/orders", json=[order_data], headers=headers, timeout=15)
        if r_ord.status_code not in [200, 201]:
            print(f"Error inserting order in Supabase: {r_ord.text}")
            return None

        created_order = r_ord.json()[0]
        order_id = created_order['id']

        # 2. Insert shipments & items
        for sh in shipments_list:
            sh_data = {
                "order_id": order_id,
                "supplier_id": sh.get("supplier_id", 1),
                "shipment_number": sh.get("shipment_number"),
                "ttn_number": sh.get("ttn_number"),
                "shipping_cost": sh.get("shipping_cost", 80.0),
                "packing_fee": sh.get("packing_fee", 0.0),
                "shipping_status": sh.get("shipping_status", "NEW"),
                "nova_poshta_ref": sh.get("nova_poshta_ref"),
                "sticker_pdf_url": sh.get("sticker_pdf_url")
            }
            r_sh = requests.post(f"{url.rstrip('/')}/rest/v1/order_shipments", json=[sh_data], headers=headers, timeout=15)
            if r_sh.status_code in [200, 201]:
                created_sh = r_sh.json()[0]
                shipment_id = created_sh['id']

                # Insert items
                items_payload = []
                for it in sh.get("items", []):
                    items_payload.append({
                        "shipment_id": shipment_id,
                        "product_id": it.get("product_id"),
                        "quantity": it.get("quantity", 1),
                        "price_per_item": it.get("price"),
                        "cost_price_per_item": it.get("cost_price", 0.0),
                        "product_title": it.get("title", ""),
                        "product_sku": it.get("sku", "")
                    })
                if items_payload:
                    requests.post(f"{url.rstrip('/')}/rest/v1/order_items", json=items_payload, headers=headers, timeout=15)

        return created_order
    except Exception as e:
        print(f"Error creating order in Supabase: {e}")
    return None

def supabase_get_orders(limit=50):
    """
    Fetches all orders with nested shipments and items from Supabase.
    """
    url, key = load_supabase_credentials()
    headers = get_headers()
    endpoint = f"{url.rstrip('/')}/rest/v1/orders?select=*,order_shipments(*,order_items(*))&order=id.desc&limit={limit}"
    try:
        r = requests.get(endpoint, headers=headers, timeout=15)
        if r.status_code == 200:
            raw_orders = r.json()
            orders = []
            for o in raw_orders:
                o_dict = dict(o)
                # Map order_shipments to shipments
                o_dict['shipments'] = []
                for sh in o_dict.pop('order_shipments', []) or []:
                    sh_dict = dict(sh)
                    sh_dict['items'] = sh_dict.pop('order_items', []) or []
                    o_dict['shipments'].append(sh_dict)
                orders.append(o_dict)
            return orders
    except Exception as e:
        print(f"Error fetching orders from Supabase: {e}")
    return None

def supabase_update_order(order_id, update_fields):
    """Updates order columns in Supabase."""
    url, key = load_supabase_credentials()
    headers = get_headers()
    headers['Prefer'] = 'return=minimal'
    try:
        endpoint = f"{url.rstrip('/')}/rest/v1/orders?id=eq.{order_id}"
        r = requests.patch(endpoint, json=update_fields, headers=headers, timeout=10)
        return r.status_code in [200, 204]
    except Exception as e:
        print(f"Error updating order in Supabase: {e}")
        return False

def supabase_get_admin_stats():
    """Fetches high-level store stats directly from Supabase."""
    url, key = load_supabase_credentials()
    headers = get_headers()
    headers['Prefer'] = 'count=exact'

    stats = {
        "data_source": "supabase",
        "total_products": 0,
        "active_products": 0,
        "in_stock_products": 0,
        "out_of_stock_products": 0,
        "total_categories": 0,
        "orders_count": 0,
        "total_revenue": 0.0,
        "suppliers": []
    }
    try:
        # Total products count
        r = requests.get(f"{url.rstrip('/')}/rest/v1/products?select=id&limit=1", headers=headers, timeout=10)
        cr = r.headers.get('content-range', '')
        if '/' in cr:
            stats["total_products"] = int(cr.split('/')[-1])

        # Active products
        r_act = requests.get(f"{url.rstrip('/')}/rest/v1/products?select=id&is_active=eq.1&limit=1", headers=headers, timeout=10)
        cr_act = r_act.headers.get('content-range', '')
        if '/' in cr_act:
            stats["active_products"] = int(cr_act.split('/')[-1])

        # In stock products
        r_stock = requests.get(f"{url.rstrip('/')}/rest/v1/products?select=id&stock_quantity=gt.0&limit=1", headers=headers, timeout=10)
        cr_stock = r_stock.headers.get('content-range', '')
        if '/' in cr_stock:
            stats["in_stock_products"] = int(cr_stock.split('/')[-1])
        stats["out_of_stock_products"] = max(0, stats["total_products"] - stats["in_stock_products"])

        # Categories count
        r_cat = requests.get(f"{url.rstrip('/')}/rest/v1/categories?select=id&limit=1", headers=headers, timeout=10)
        cr_cat = r_cat.headers.get('content-range', '')
        if '/' in cr_cat:
            stats["total_categories"] = int(cr_cat.split('/')[-1])

        # Orders count & revenue
        r_ord = requests.get(f"{url.rstrip('/')}/rest/v1/orders?select=id,total_amount", headers=headers, timeout=10)
        if r_ord.status_code == 200:
            ords = r_ord.json()
            stats["orders_count"] = len(ords)
            stats["total_revenue"] = round(sum(float(o.get('total_amount', 0.0)) for o in ords), 2)

        # Suppliers
        r_sup = requests.get(f"{url.rstrip('/')}/rest/v1/suppliers?select=*&order=id.asc", headers=headers, timeout=10)
        if r_sup.status_code == 200:
            stats["suppliers"] = r_sup.json()

        return stats
    except Exception as e:
        print(f"Error fetching admin stats from Supabase: {e}")
    return None

if __name__ == '__main__':
    res = sync_sqlite_to_supabase()
    print(res)

