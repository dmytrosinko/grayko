import sqlite3
import json
import os
import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'store.db')

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Suppliers (Склади та Дистриб'ютори)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        warehouse_city TEXT DEFAULT 'Київ',
        warehouse_address TEXT DEFAULT 'вул. Алма-Атинська, 35а',
        feed_url TEXT,
        feed_type TEXT DEFAULT 'YML',
        settlement_terms TEXT,
        deposit_balance REAL DEFAULT 0.0,
        free_packing_threshold REAL DEFAULT 1000.0,
        packing_fee REAL DEFAULT 15.0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Categories
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER,
        slug TEXT UNIQUE NOT NULL,
        name_uk TEXT NOT NULL,
        icon TEXT DEFAULT '🧸',
        description_uk TEXT,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    )
    """)

    # 3. Products
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        supplier_sku TEXT NOT NULL,
        internal_sku TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        title_uk TEXT NOT NULL,
        description_uk TEXT,
        brand TEXT,
        category_id INTEGER,
        min_age INTEGER DEFAULT 3,
        max_age INTEGER DEFAULT 12,
        age_group TEXT, -- '0-1 рік', '1-3 роки', '3-5 років', '6-8 років', '9-12 років', '14+'
        material TEXT, -- 'дерево', 'безпечний пластик', 'картон', 'текстиль', 'метал'
        parts_count INTEGER DEFAULT 0,
        assembly_time_mins INTEGER DEFAULT 0,
        difficulty_level TEXT, -- 'Легкий', 'Середній', 'Складний' (лише для пазлів та конструкторів)
        skills_developed TEXT, -- JSON array of strings e.g. ["дрібна моторика", "просторове мислення"]
        cost_price REAL NOT NULL, -- оптова ціна від постачальника
        rrp_price REAL NOT NULL,  -- рекомендована роздрібна ціна (RRP)
        price REAL NOT NULL,      -- фінальна ціна продажу на сайті (>= rrp_price)
        stock_quantity INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        is_featured INTEGER DEFAULT 0,
        is_new INTEGER DEFAULT 0,
        is_bestseller INTEGER DEFAULT 0,
        images TEXT DEFAULT '[]', -- JSON array of image URLs
        video_url TEXT,
        specifications TEXT DEFAULT '{}', -- JSON key-value
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
    """)

    # 4. Cross-sell accessories (Супутні товари)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cross_sell_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_material TEXT,
        target_category_id INTEGER,
        accessory_product_id INTEGER,
        reason_text TEXT,
        FOREIGN KEY (accessory_product_id) REFERENCES products(id) ON DELETE CASCADE
    )
    """)

    # 5. Orders
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        customer_comment TEXT,
        delivery_type TEXT DEFAULT 'NOVA_POSHTA_WAREHOUSE', -- 'NOVA_POSHTA_WAREHOUSE', 'NOVA_POSHTA_POSTOMAT', 'NOVA_POSHTA_COURIER'
        delivery_city TEXT NOT NULL,
        delivery_warehouse TEXT NOT NULL,
        payment_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PAID', 'COD'
        payment_method TEXT NOT NULL, -- 'MONOBANK', 'WAYFORPAY', 'APPLE_PAY', 'GOOGLE_PAY', 'COD_NOVAPAY'
        total_products_amount REAL NOT NULL,
        total_shipping_amount REAL NOT NULL,
        total_amount REAL NOT NULL,
        fiscal_receipt_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 6. Order Shipments (Підтримка розділених відправлень для дропшипінгу)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_shipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        supplier_id INTEGER NOT NULL,
        shipment_number TEXT NOT NULL,
        ttn_number TEXT,
        shipping_cost REAL DEFAULT 80.0,
        packing_fee REAL DEFAULT 0.0,
        shipping_status TEXT DEFAULT 'NEW', -- 'NEW', 'DISPATCHED_TO_SUPPLIER', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED'
        nova_poshta_ref TEXT,
        sticker_pdf_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
    """)

    # 7. Order Items
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shipment_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price_per_item REAL NOT NULL,
        cost_price_per_item REAL NOT NULL,
        product_title TEXT NOT NULL,
        product_sku TEXT NOT NULL,
        FOREIGN KEY (shipment_id) REFERENCES order_shipments(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
    """)

    # 8. Feed Sync Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feed_sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        sync_type TEXT NOT NULL, -- 'FAST', 'FULL'
        status TEXT NOT NULL, -- 'SUCCESS', 'FAILED', 'WARNING'
        items_processed INTEGER DEFAULT 0,
        items_updated INTEGER DEFAULT 0,
        items_added INTEGER DEFAULT 0,
        rrp_violations_count INTEGER DEFAULT 0,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
    """)

    # 9. Indexes for lightning-fast queries with 17k+ items
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_supplier_sku ON products(supplier_sku);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_age ON products(age_group);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);")

    conn.commit()
    conn.close()
    print("Database tables and indexes initialized successfully.")

if __name__ == '__main__':
    init_db()
