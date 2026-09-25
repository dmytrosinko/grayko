-- ==============================================================================
-- GRAYKO E-Commerce: Supabase Production Database Schema
-- Run this script in your Supabase Project -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    warehouse_city TEXT NOT NULL,
    warehouse_address TEXT NOT NULL,
    feed_url TEXT,
    feed_type TEXT DEFAULT 'YML',
    settlement_terms TEXT,
    deposit_balance NUMERIC(12, 2) DEFAULT 0.00,
    free_packing_threshold NUMERIC(10, 2) DEFAULT 0.00,
    packing_fee NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories Table (Hierarchical tree)
CREATE TABLE IF NOT EXISTS public.categories (
    id BIGINT PRIMARY KEY,
    parent_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
    slug TEXT NOT NULL,
    name_uk TEXT NOT NULL,
    name_ru TEXT,
    description_uk TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supabase_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_supabase_categories_slug ON public.categories(slug);

-- 3. Products Table (17,000+ catalog items with JSON specifications & images)
CREATE TABLE IF NOT EXISTS public.products (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_sku TEXT UNIQUE NOT NULL,
    internal_sku TEXT UNIQUE NOT NULL,
    slug TEXT NOT NULL,
    title_uk TEXT NOT NULL,
    description_uk TEXT,
    brand TEXT,
    category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
    min_age INT DEFAULT 3,
    max_age INT DEFAULT 12,
    age_group TEXT,
    material TEXT,
    parts_count INT DEFAULT 0,
    assembly_time_mins INT DEFAULT 0,
    difficulty_level TEXT DEFAULT 'Середній',
    skills_developed JSONB DEFAULT '[]'::jsonb,
    cost_price NUMERIC(10, 2) NOT NULL,
    rrp_price NUMERIC(10, 2) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    is_active SMALLINT DEFAULT 1,
    is_featured SMALLINT DEFAULT 0,
    is_new SMALLINT DEFAULT 1,
    is_bestseller SMALLINT DEFAULT 0,
    images JSONB DEFAULT '[]'::jsonb,
    video_url TEXT,
    specifications JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_supabase_products_supplier_sku ON public.products(supplier_sku);
CREATE INDEX IF NOT EXISTS idx_supabase_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_supabase_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_supabase_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_supabase_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_supabase_products_stock ON public.products(stock_quantity);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_comment TEXT,
    delivery_type TEXT DEFAULT 'NOVA_POSHTA_WAREHOUSE',
    delivery_city TEXT NOT NULL,
    delivery_warehouse TEXT NOT NULL,
    payment_status TEXT DEFAULT 'PENDING_PAYMENT',
    payment_method TEXT NOT NULL,
    total_products_amount NUMERIC(10, 2) NOT NULL,
    total_shipping_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    fiscal_receipt_id TEXT,
    toysi_order_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Order Shipments
CREATE TABLE IF NOT EXISTS public.order_shipments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
    supplier_id BIGINT REFERENCES public.suppliers(id),
    shipment_number TEXT UNIQUE NOT NULL,
    ttn_number TEXT,
    shipping_cost NUMERIC(10, 2) DEFAULT 80.00,
    packing_fee NUMERIC(10, 2) DEFAULT 0.00,
    shipping_status TEXT DEFAULT 'NEW',
    nova_poshta_ref TEXT,
    sticker_pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT REFERENCES public.order_shipments(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    price_per_item NUMERIC(10, 2) NOT NULL,
    cost_price_per_item NUMERIC(10, 2) NOT NULL,
    product_title TEXT NOT NULL,
    product_sku TEXT NOT NULL
);

-- 7. Feed Synchronization Logs Table
CREATE TABLE IF NOT EXISTS public.feed_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT REFERENCES public.suppliers(id),
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL,
    items_processed INT DEFAULT 0,
    items_updated INT DEFAULT 0,
    items_added INT DEFAULT 0,
    rrp_violations_count INT DEFAULT 0,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active products & categories
CREATE POLICY "Public Read Active Products" ON public.products FOR SELECT USING (is_active = 1);
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Suppliers" ON public.suppliers FOR SELECT USING (true);

-- Allow full access to service_role (backend worker)
CREATE POLICY "Service Role Full Products" ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Categories" ON public.categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Suppliers" ON public.suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Shipments" ON public.order_shipments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Order Items" ON public.order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Sync Logs" ON public.feed_sync_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Also allow anon full access if anon key is used with RLS bypass disabled
CREATE POLICY "Anon Full Products" ON public.products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon Full Categories" ON public.categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon Full Suppliers" ON public.suppliers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon Full Orders" ON public.orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon Full Shipments" ON public.order_shipments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon Full Order Items" ON public.order_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon Full Sync Logs" ON public.feed_sync_logs FOR ALL TO anon USING (true) WITH CHECK (true);
