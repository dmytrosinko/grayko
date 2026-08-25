import os
import sys
import json
import random
import traceback
import urllib.parse
import mimetypes
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from datetime import datetime

# Configure utf-8 stdout for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Local imports
from db import get_db_connection, init_db
from dropship_feed import run_fast_sync, run_full_sync, validate_and_update_price, seed_database
from logistics import search_settlements, get_city_warehouses, generate_ttn_number, generate_shipping_sticker_html

PORT = int(os.environ.get('PORT', 8077))
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

class GraykoStoreHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        try:
            sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))
        except Exception:
            pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Length', '0')
        self.send_header('Connection', 'close')
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(body)
        self.wfile.flush()

    def send_html(self, html_content, status=200):
        body = html_content.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(body)
        self.wfile.flush()

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        return json.loads(body.decode('utf-8'))

    def do_GET(self):
        try:
            parsed_url = urllib.parse.urlparse(self.path)
            path = parsed_url.path
            query = urllib.parse.parse_qs(parsed_url.query)

            # 1. API: Catalog Products & Facets
            if path == '/api/catalog':
                self.handle_get_catalog(query)
                return

            # 2. API: Product by ID or Slug
            elif path.startswith('/api/products/'):
                slug_or_id = path.replace('/api/products/', '')
                self.handle_get_product(slug_or_id)
                return

            # 3. API: Categories
            elif path == '/api/categories':
                conn = get_db_connection()
                categories = [dict(r) for r in conn.execute("SELECT * FROM categories ORDER BY id ASC").fetchall()]
                conn.close()
                self.send_json({"categories": categories})
                return

            # 4. API: Suppliers & Dropshipping Hubs
            elif path == '/api/suppliers':
                conn = get_db_connection()
                suppliers = [dict(r) for r in conn.execute("SELECT * FROM suppliers ORDER BY id ASC").fetchall()]
                conn.close()
                self.send_json({"suppliers": suppliers})
                return

            # 5. API: Nova Poshta Logistics
            elif path == '/api/logistics/cities':
                q = query.get('q', [''])[0]
                results = search_settlements(q)
                self.send_json({"cities": results})
                return

            elif path == '/api/logistics/warehouses':
                city = query.get('city', ['Київ'])[0]
                warehouses = get_city_warehouses(city)
                self.send_json({"warehouses": warehouses})
                return

            # 6. API: Orders List
            elif path == '/api/orders':
                self.handle_get_orders()
                return

            # 7. API: Shipping Sticker HTML/Print
            elif path.startswith('/api/shipments/') and path.endswith('/sticker'):
                shipment_id = path.split('/')[3]
                self.handle_get_shipping_sticker(shipment_id)
                return

            # 8. API: Admin Stats & Sync Logs
            elif path == '/api/admin/stats':
                self.handle_get_admin_stats()
                return

            # Dedicated Admin Route
            elif path in ['/admin', '/admin/']:
                admin_file = os.path.join(FRONTEND_DIR, 'admin.html')
                with open(admin_file, 'r', encoding='utf-8') as f:
                    self.send_html(f.read())
                return

            # Dedicated B2B XML Feed Route
            elif path in ['/data/b2b_feed.xml', '/data/toysi_feed.xml']:
                feed_f = os.path.join(BASE_DIR, 'data', 'b2b_feed.xml')
                if os.path.exists(feed_f):
                    with open(feed_f, 'r', encoding='utf-8') as f:
                        body = f.read().encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/xml; charset=utf-8')
                    self.send_header('Content-Length', str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return

            # Root Storefront or static frontend files
            rel_path = path.lstrip('/')
            if not rel_path or rel_path == 'index.html':
                rel_path = 'index.html'

            target_file = os.path.join(FRONTEND_DIR, rel_path)
            if os.path.isfile(target_file):
                mime_type, _ = mimetypes.guess_type(target_file)
                if not mime_type:
                    mime_type = 'application/octet-stream'
                with open(target_file, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                if 'text' in mime_type or 'javascript' in mime_type or 'json' in mime_type or 'css' in mime_type:
                    self.send_header('Content-Type', f'{mime_type}; charset=utf-8')
                else:
                    self.send_header('Content-Type', mime_type)
                self.send_header('Content-Length', str(len(content)))
                self.send_header('Connection', 'close')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(content)
                self.wfile.flush()
                return

            self.send_json({"error": "File not found"}, status=404)
        except Exception as e:
            traceback.print_exc()
            self.send_json({"error": str(e)}, status=500)

    def do_POST(self):
        try:
            parsed_url = urllib.parse.urlparse(self.path)
            path = parsed_url.path

            # 1. API: Cart Calculation with Multi-Warehouse Split
            if path == '/api/cart/calculate':
                data = self.read_json_body()
                self.handle_cart_calculate(data)
                return

            # 2. API: Create Order
            elif path == '/api/orders':
                data = self.read_json_body()
                self.handle_create_order(data)
                return

            # 3. API: Admin Trigger Feed Sync
            elif path == '/api/admin/sync':
                data = self.read_json_body()
                sync_type = data.get('sync_type', 'FAST')
                supplier_id = int(data.get('supplier_id', 1))
                if sync_type == 'FULL':
                    result = run_full_sync(supplier_id)
                else:
                    result = run_fast_sync(supplier_id)
                self.send_json(result)
                return

            # 4. API: Admin Update Price with RRP Check
            elif path == '/api/admin/price-update':
                data = self.read_json_body()
                product_id = int(data.get('product_id'))
                new_price = float(data.get('price'))
                res = validate_and_update_price(product_id, new_price)
                if res.get('success'):
                    self.send_json(res)
                else:
                    self.send_json(res, status=400)
                return

            # 5. API: Reset / Re-seed Catalog
            elif path == '/api/admin/reseed':
                seed_database()
                self.send_json({"success": True, "message": "Каталог успішно переініціалізовано з оригінальними даними Toysi."})
                return

            self.send_json({"error": "Endpoint not found"}, status=404)
        except Exception as e:
            traceback.print_exc()
            self.send_json({"error": str(e)}, status=500)

    # ---------------- HANDLERS ---------------- #

    def handle_get_catalog(self, query):
        conn = get_db_connection()
        cursor = conn.cursor()

        where_clauses = ["p.is_active = 1"]
        params = []

        # Category filter
        if 'category' in query:
            cat_val = query['category'][0]
            if cat_val.isdigit():
                where_clauses.append("p.category_id = ?")
                params.append(int(cat_val))
            else:
                cursor.execute("SELECT id FROM categories WHERE slug = ?", (cat_val,))
                cat_row = cursor.fetchone()
                if cat_row:
                    where_clauses.append("p.category_id = ?")
                    params.append(cat_row["id"])

        # Age group filter
        if 'age_group' in query:
            ages = query['age_group']
            placeholders = ','.join(['?'] * len(ages))
            where_clauses.append(f"p.age_group IN ({placeholders})")
            params.extend(ages)

        # Material filter
        if 'material' in query:
            materials = query['material']
            placeholders = ','.join(['?'] * len(materials))
            where_clauses.append(f"p.material IN ({placeholders})")
            params.extend(materials)

        # Brand filter
        if 'brand' in query:
            brands = query['brand']
            placeholders = ','.join(['?'] * len(brands))
            where_clauses.append(f"p.brand IN ({placeholders})")
            params.extend(brands)

        # Skill filter
        if 'skill' in query:
            skill = query['skill'][0]
            where_clauses.append("p.skills_developed LIKE ?")
            params.append(f"%{skill}%")

        # In stock only
        if query.get('in_stock', ['0'])[0] == '1':
            where_clauses.append("p.stock_quantity > 0")

        # Price range
        if 'min_price' in query:
            where_clauses.append("p.price >= ?")
            params.append(float(query['min_price'][0]))
        if 'max_price' in query:
            where_clauses.append("p.price <= ?")
            params.append(float(query['max_price'][0]))

        # Search keyword
        if 'q' in query and query['q'][0].strip():
            kw = f"%{query['q'][0].strip()}%"
            where_clauses.append("(p.title_uk LIKE ? OR p.description_uk LIKE ? OR p.brand LIKE ? OR p.internal_sku LIKE ?)")
            params.extend([kw, kw, kw, kw])

        where_sql = " AND ".join(where_clauses)

        # Sorting
        sort_by = query.get('sort', ['popular'])[0]
        order_sql = "p.is_bestseller DESC, p.id DESC"
        if sort_by == 'price_asc':
            order_sql = "p.price ASC"
        elif sort_by == 'price_desc':
            order_sql = "p.price DESC"
        elif sort_by == 'new':
            order_sql = "p.is_new DESC, p.id DESC"
        elif sort_by == 'parts_desc':
            order_sql = "p.parts_count DESC"

        query_sql = f"""
        SELECT p.*, s.name as supplier_name, s.code as supplier_code, s.warehouse_city as supplier_city, c.name_uk as category_name, c.slug as category_slug
        FROM products p
        JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE {where_sql}
        ORDER BY {order_sql}
        """

        cursor.execute(query_sql, params)
        rows = cursor.fetchall()

        products = []
        for r in rows:
            p_dict = dict(r)
            p_dict['images'] = json.loads(p_dict['images'] or '[]')
            p_dict['skills_developed'] = json.loads(p_dict['skills_developed'] or '[]')
            p_dict['specifications'] = json.loads(p_dict['specifications'] or '{}')
            products.append(p_dict)

        # Extract facets
        cursor.execute("SELECT DISTINCT brand FROM products WHERE is_active = 1 AND brand IS NOT NULL")
        all_brands = [r['brand'] for r in cursor.fetchall()]

        cursor.execute("SELECT DISTINCT material FROM products WHERE is_active = 1 AND material IS NOT NULL")
        all_materials = [r['material'] for r in cursor.fetchall()]

        cursor.execute("SELECT DISTINCT age_group FROM products WHERE is_active = 1 AND age_group IS NOT NULL")
        all_age_groups = [r['age_group'] for r in cursor.fetchall()]

        cursor.execute("SELECT MIN(price) as min_p, MAX(price) as max_p FROM products WHERE is_active = 1")
        price_stat = cursor.fetchone()

        conn.close()
        self.send_json({
            "total": len(products),
            "products": products,
            "facets": {
                "brands": all_brands,
                "materials": all_materials,
                "age_groups": all_age_groups,
                "skills": ["дрібна моторика", "інженерне мислення", "просторова уява", "STEM / фізика", "логіка", "сенсорика", "творчість"],
                "min_price": price_stat["min_p"] or 0,
                "max_price": price_stat["max_p"] or 2000
            }
        })

    def handle_get_product(self, slug_or_id):
        conn = get_db_connection()
        cursor = conn.cursor()

        if slug_or_id.isdigit():
            cursor.execute("""
            SELECT p.*, s.name as supplier_name, s.code as supplier_code, s.warehouse_city as supplier_city, s.warehouse_address as supplier_address, c.name_uk as category_name, c.slug as category_slug
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
            """, (int(slug_or_id),))
        else:
            cursor.execute("""
            SELECT p.*, s.name as supplier_name, s.code as supplier_code, s.warehouse_city as supplier_city, s.warehouse_address as supplier_address, c.name_uk as category_name, c.slug as category_slug
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.slug = ?
            """, (slug_or_id,))

        row = cursor.fetchone()
        if not row:
            conn.close()
            self.send_json({"error": "Product not found"}, status=404)
            return

        product = dict(row)
        product['images'] = json.loads(product['images'] or '[]')
        product['skills_developed'] = json.loads(product['skills_developed'] or '[]')
        product['specifications'] = json.loads(product['specifications'] or '{}')

        # Find Cross-sell accessories (e.g. wax for wooden models, paint sets, etc.)
        cursor.execute("""
        SELECT p.*, s.name as supplier_name
        FROM products p
        JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.category_id = 6 OR (p.material = ? AND p.id != ?)
        LIMIT 3
        """, (product['material'], product['id']))
        cross_sells = []
        for cr in cursor.fetchall():
            cr_dict = dict(cr)
            cr_dict['images'] = json.loads(cr_dict['images'] or '[]')
            cross_sells.append(cr_dict)

        conn.close()
        self.send_json({"product": product, "cross_sells": cross_sells})

    def handle_cart_calculate(self, data):
        """
        Calculates Cart totals with Split Warehouse Shipments:
        - Groups items by supplier_id (Warehouse).
        - Computes packing fees and shipping per shipment.
        """
        items_req = data.get('items', [])
        if not items_req:
            self.send_json({"shipments": [], "total_products": 0, "total_shipping": 0, "total_packing": 0, "grand_total": 0})
            return

        conn = get_db_connection()
        cursor = conn.cursor()

        shipments_map = {}
        total_products_cost = 0.0

        for it in items_req:
            p_id = it.get('product_id')
            qty = max(1, int(it.get('quantity', 1)))

            cursor.execute("""
            SELECT p.*, s.name as supplier_name, s.code as supplier_code, s.warehouse_city as supplier_city, s.free_packing_threshold, s.packing_fee
            FROM products p
            JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = ?
            """, (p_id,))
            p_row = cursor.fetchone()
            if not p_row:
                continue

            sup_id = p_row["supplier_id"]
            if sup_id not in shipments_map:
                shipments_map[sup_id] = {
                    "supplier_id": sup_id,
                    "supplier_name": p_row["supplier_name"],
                    "supplier_code": p_row["supplier_code"],
                    "warehouse_city": p_row["supplier_city"],
                    "free_packing_threshold": p_row["free_packing_threshold"],
                    "packing_fee_rate": p_row["packing_fee"],
                    "items": [],
                    "subtotal": 0.0,
                    "shipping_cost": 80.0, # Standard Nova Poshta estimated rate
                    "packing_fee": 0.0
                }

            item_total = p_row["price"] * qty
            total_products_cost += item_total
            shipments_map[sup_id]["subtotal"] += item_total
            shipments_map[sup_id]["items"].append({
                "product_id": p_row["id"],
                "sku": p_row["internal_sku"],
                "title": p_row["title_uk"],
                "price": p_row["price"],
                "cost_price": p_row["cost_price"],
                "quantity": qty,
                "item_total": item_total,
                "image": json.loads(p_row["images"] or '[]')[0] if p_row["images"] else ""
            })

        shipments_list = []
        total_shipping = 0.0
        total_packing = 0.0

        for sup_id, sh in shipments_map.items():
            # Check packing fee threshold (e.g. Toysi charges 15 грн if under 1000 грн)
            if sh["free_packing_threshold"] > 0 and sh["subtotal"] < sh["free_packing_threshold"]:
                sh["packing_fee"] = sh["packing_fee_rate"]
            else:
                sh["packing_fee"] = 0.0

            total_shipping += sh["shipping_cost"]
            total_packing += sh["packing_fee"]
            shipments_list.append(sh)

        conn.close()
        grand_total = total_products_cost + total_shipping + total_packing

        self.send_json({
            "is_split_order": len(shipments_list) > 1,
            "shipments_count": len(shipments_list),
            "shipments": shipments_list,
            "total_products": round(total_products_cost, 2),
            "total_shipping": round(total_shipping, 2),
            "total_packing": round(total_packing, 2),
            "grand_total": round(grand_total, 2)
        })

    def handle_create_order(self, data):
        """
        Creates an Order with Split Shipments and auto-generated Nova Poshta TTNs.
        """
        customer_name = data.get('customer_name', '').strip()
        customer_phone = data.get('customer_phone', '').strip()
        customer_email = data.get('customer_email', '').strip()
        customer_comment = data.get('customer_comment', '').strip()
        delivery_type = data.get('delivery_type', 'NOVA_POSHTA_WAREHOUSE')
        delivery_city = data.get('delivery_city', 'Київ').strip()
        delivery_warehouse = data.get('delivery_warehouse', 'Відділення №1').strip()
        payment_method = data.get('payment_method', 'MONOBANK')
        items = data.get('items', [])

        if not customer_name or not customer_phone or not items:
            self.send_json({"error": "Вкажіть ім'я, телефон та додайте товари до кошика."}, status=400)
            return

        order_number = f"GK-{datetime.now().strftime('%y%m%d')}-{random.randint(1000, 9999)}"

        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Group items by supplier for split shipments
        items_by_supplier = {}
        for it in items:
            cursor.execute("SELECT * FROM products WHERE id = ?", (it['product_id'],))
            p = cursor.fetchone()
            if not p:
                continue
            sup_id = p['supplier_id']
            if sup_id not in items_by_supplier:
                items_by_supplier[sup_id] = []
            items_by_supplier[sup_id].append({
                "product": p,
                "quantity": max(1, int(it.get('quantity', 1))),
                "price": p['price'],
                "cost_price": p['cost_price']
            })

        total_products_amount = 0.0
        total_shipping_amount = 0.0
        total_packing_amount = 0.0

        for sup_id, s_items in items_by_supplier.items():
            subtotal = sum(i['price'] * i['quantity'] for i in s_items)
            total_products_amount += subtotal
            total_shipping_amount += 80.0
            # Check packing fee
            cursor.execute("SELECT free_packing_threshold, packing_fee FROM suppliers WHERE id = ?", (sup_id,))
            sup = cursor.fetchone()
            if sup and sup['free_packing_threshold'] > 0 and subtotal < sup['free_packing_threshold']:
                total_packing_amount += sup['packing_fee']

        total_amount = total_products_amount + total_shipping_amount + total_packing_amount
        payment_status = 'PAID' if payment_method in ['MONOBANK', 'WAYFORPAY', 'APPLE_PAY', 'GOOGLE_PAY'] else 'COD'
        fiscal_receipt_id = f"CHECKBOX-{random.randint(1000000, 9999999)}"

        # 2. Insert Order
        cursor.execute("""
        INSERT INTO orders (order_number, customer_name, customer_phone, customer_email, customer_comment, delivery_type, delivery_city, delivery_warehouse, payment_status, payment_method, total_products_amount, total_shipping_amount, total_amount, fiscal_receipt_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (order_number, customer_name, customer_phone, customer_email, customer_comment, delivery_type, delivery_city, delivery_warehouse, payment_status, payment_method, total_products_amount, total_shipping_amount, total_amount, fiscal_receipt_id))
        order_id = cursor.lastrowid

        # 3. Create Shipments & Items
        shipment_records = []
        shipment_idx = 1
        for sup_id, s_items in items_by_supplier.items():
            shipment_number = f"{order_number}-SH{shipment_idx}"
            ttn = generate_ttn_number()
            shipment_subtotal = sum(i['price'] * i['quantity'] for i in s_items)
            cursor.execute("SELECT name, free_packing_threshold, packing_fee FROM suppliers WHERE id = ?", (sup_id,))
            sup = cursor.fetchone()
            sup_name = sup['name'] if sup else "Основний склад"
            packing = sup['packing_fee'] if (sup and sup['free_packing_threshold'] > 0 and shipment_subtotal < sup['free_packing_threshold']) else 0.0

            cursor.execute("""
            INSERT INTO order_shipments (order_id, supplier_id, shipment_number, ttn_number, shipping_cost, packing_fee, shipping_status, nova_poshta_ref, sticker_pdf_url)
            VALUES (?, ?, ?, ?, 80.0, ?, 'NEW', ?, ?)
            """, (order_id, sup_id, shipment_number, ttn, packing, f"NP-REF-{ttn}", f"/api/shipments/{order_id}/sticker"))
            shipment_id = cursor.lastrowid

            for it in s_items:
                cursor.execute("""
                INSERT INTO order_items (shipment_id, product_id, quantity, price_per_item, cost_price_per_item, product_title, product_sku)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (shipment_id, it['product']['id'], it['quantity'], it['price'], it['cost_price'], it['product']['title_uk'], it['product']['internal_sku']))

                # Update stock
                cursor.execute("UPDATE products SET stock_quantity = MAX(0, stock_quantity - ?) WHERE id = ?", (it['quantity'], it['product']['id']))

            shipment_records.append({
                "shipment_id": shipment_id,
                "shipment_number": shipment_number,
                "ttn_number": ttn,
                "supplier_id": sup_id,
                "supplier_name": sup_name,
                "items_count": len(s_items)
            })
            shipment_idx += 1

        conn.commit()
        conn.close()

        self.send_json({
            "success": True,
            "order_number": order_number,
            "order_id": order_id,
            "payment_status": payment_status,
            "fiscal_receipt_id": fiscal_receipt_id,
            "total_amount": round(total_amount, 2),
            "shipments": shipment_records
        })

    def handle_get_orders(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders ORDER BY id DESC LIMIT 50")
        orders = []
        for ord_row in cursor.fetchall():
            o = dict(ord_row)
            cursor.execute("""
            SELECT s.*, sup.name as supplier_name, sup.warehouse_city as supplier_city
            FROM order_shipments s
            JOIN suppliers sup ON s.supplier_id = sup.id
            WHERE s.order_id = ?
            """, (o['id'],))
            shipments = []
            for sh_row in cursor.fetchall():
                sh = dict(sh_row)
                cursor.execute("SELECT * FROM order_items WHERE shipment_id = ?", (sh['id'],))
                sh['items'] = [dict(it) for it in cursor.fetchall()]
                shipments.append(sh)
            o['shipments'] = shipments
            orders.append(o)
        conn.close()
        self.send_json({"orders": orders})

    def handle_get_shipping_sticker(self, shipment_id):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT sh.*, o.customer_name, o.customer_phone, o.delivery_city, o.delivery_warehouse, o.payment_method, o.payment_status, sup.name as supplier_name, sup.warehouse_city, sup.warehouse_address
        FROM order_shipments sh
        JOIN orders o ON sh.order_id = o.id
        JOIN suppliers sup ON sh.supplier_id = sup.id
        WHERE sh.id = ?
        """, (shipment_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            self.send_html("<h1>Відправлення не знайдено</h1>", status=404)
            return

        cursor.execute("SELECT * FROM order_items WHERE shipment_id = ?", (shipment_id,))
        items = [dict(it) for it in cursor.fetchall()]
        conn.close()

        shipment_data = dict(row)
        supplier_data = {
            "name": row["supplier_name"],
            "warehouse_city": row["warehouse_city"],
            "warehouse_address": row["warehouse_address"]
        }
        order_data = {
            "customer_name": row["customer_name"],
            "customer_phone": row["customer_phone"],
            "delivery_city": row["delivery_city"],
            "delivery_warehouse": row["delivery_warehouse"],
            "payment_method": row["payment_method"],
            "payment_status": row["payment_status"]
        }

        html = generate_shipping_sticker_html(order_data, shipment_data, items, supplier_data)
        self.send_html(html)

    def handle_get_admin_stats(self):
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as cnt FROM products WHERE is_active = 1")
        active_products = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt, SUM(total_amount) as total_revenue FROM orders")
        orders_stat = cursor.fetchone()

        cursor.execute("SELECT SUM(deposit_balance) as total_deposit FROM suppliers")
        total_deposit = cursor.fetchone()['total_deposit'] or 0.0

        cursor.execute("SELECT * FROM feed_sync_logs ORDER BY id DESC LIMIT 10")
        sync_logs = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT * FROM suppliers ORDER BY id ASC")
        suppliers = [dict(r) for r in cursor.fetchall()]

        conn.close()
        self.send_json({
            "active_products": active_products,
            "orders_count": orders_stat['cnt'] or 0,
            "total_revenue": round(orders_stat['total_revenue'] or 0.0, 2),
            "total_deposit": round(total_deposit, 2),
            "suppliers": suppliers,
            "sync_logs": sync_logs
        })

def run_server():
    init_db()
    seed_database()
    server_address = ('127.0.0.1', PORT)
    httpd = ThreadingHTTPServer(server_address, GraykoStoreHandler)
    print(f"==================================================")
    print(f" 🚀 GRAYKO Kids STEM Toys Store is running at:")
    print(f" 👉 Storefront: http://localhost:{PORT}")
    print(f" 👉 Admin Panel: http://localhost:{PORT}/admin")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
