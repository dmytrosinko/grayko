# Product & Technical Specification: E-Commerce Store (Kids Non-Electronic & STEM Toys)

## 1. Project Overview & Business Model
* **Project Type:** Dropshipping / On-Demand e-commerce platform with a custom backend and dynamic modern frontend.
* **Niche:** Дитячі іграшки без складної електроніки (дерев'яні розвиваючі іграшки, 3D-пазли, механічні конструктори, STEM-набори, настільні ігри, сюжетно-рольові набори).
* **Target Audience:** Батьки, родичі та люди, які шукають якісні, безпечні подарунки для дітей від 0 до 12+ років в Україні.
* **Business Logic:**
  * Працює на поточному ФОП 3 групи (додано КВЕДи `47.91`, `46.19`, `47.65`).
  * Товари постачаються від перевірених дистриб'юторів/виробників (Ugears, Wood Trick, Cubika, Toysi B2B тощо).
  * Розрахунки: онлайн-оплата (карти/Apple Pay/Google Pay) або післяплата через сервіс «Контроль оплати» (Нова Пошта / NovaPay).
  * Строгий контроль рекомендованих роздрібних цін (РРЦ / RRP).

---

## 2. Core Functional Requirements

### 2.1. Multi-Supplier & Catalog Architecture
* **Supplier Mapping:** Товари прив'язуються до конкретного `supplier_id`. У кожного постачальника є свої склади, ціни (опт + РРЦ) та правила відвантаження.
* **Feed Parser & Sync Pipeline:**
  * Потоковий парсер (Streaming XML/YML/JSON parser) для завантаження каталогів.
  * **Часті оновлення (Fast Sync):** раз на 1–2 години оновлюються лише `stock_count` (наявність) та `price` (РРЦ / оптова вартість).
  * **Повні оновлення (Full Sync):** раз на добу вночі (описи, нові товари, фотогалереї, специфікації).
* **RRP Enforcement Rule:** Валідація на рівні бекенду — ціна продажу не може бути нижчою за рекомендовану ціну постачальника.

### 2.2. Filtering & Search (Faceted Navigation)
Критично для ніші іграшок:
* **Вікові групи (`age_group`):** `0–1 рік`, `1–3 роки`, `3–5 років`, `6–8 років`, `9–12 років`, `14+ / Підлітки та дорослі`.
* **Матеріали (`material`):** дерево, безпечний харчовий пластик, картон/папір, текстиль.
* **Бренд (`brand`):** Ugears, Cubika, Wood Trick тощо.
* **Розвиваючий фокус (`skills_developed`):** дрібна моторика, логіка, просторове мислення, сенсорика, творчість.
* **SEO-Friendly URLs:** індексовані адреси для популярних фільтрів (наприклад, `/toys/wooden-toys/age-3-5`).

### 2.3. Cart & Multi-Warehouse Checkout
* **Split Orders:** Якщо в кошику товари від різних складів/постачальників, чекаут повинен прозоро відображати це для покупця:
  * Візуальне розділення на відправлення 1 та відправлення 2.
  * Розрахунок доставки для кожного відправлення.
* **Cross-Sell Engine:**
  * Пропозиція супутніх товарів у кошику/картці (наприклад, до дерев'яного конструктора — набір фарб або віск для змащування, до настільної гри — протектори для карт).

### 2.4. Logistics & Fiscalization Integrations
* **Нова Пошта API 2.0:**
  * Вибір міста та відділення / поштомату / кур'єрської адреси.
  * Автоматична генерація ЕН (Експрес-накладної) в кабінеті магазину.
  * Завантаження PDF-стікера для передачі на склад постачальника.
  * Автоматичний трекінг статусу посилки (webhook від НП) $\rightarrow$ переведення замовлення в статус «Виконано» після вручення.
* **Платіжний шлюз:**
  * Інтеграція з українськими еквайрингами (WayForPay / Monobank / LiqPay / RozetkaPay).
* **Фіскалізація (ПРРО):**
  * Інтеграція з Checkbox або Вчасно.Каса через API для автоматичного формування фіскальних чеків при успішній оплаті.

---

## 3. Recommended Database Schema (PostgreSQL / Relational Model)

```sql
-- Suppliers (Склади та Дистриб'ютори)
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    feed_url TEXT,
    feed_type VARCHAR(50) DEFAULT 'YML', -- YML, XML, JSON, CSV
    settlement_terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories with hierarchy
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES categories(id) ON DELETE SET NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    name_uk VARCHAR(255) NOT NULL,
    description_uk TEXT
);

-- Base Products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    supplier_id INT REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_sku VARCHAR(100) NOT NULL,
    internal_sku VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title_uk VARCHAR(255) NOT NULL,
    description_uk TEXT,
    brand VARCHAR(100),
    min_age INT, -- мінімальний рекомендований вік у місяцях або роках
    max_age INT,
    material VARCHAR(100),
    parts_count INT DEFAULT 0, -- кількість деталей (для 3D-пазлів / конструкторів)
    cost_price NUMERIC(10, 2) NOT NULL, -- оптова ціна
    rrp_price NUMERIC(10, 2) NOT NULL,  -- рекомендована роздрібна ціна
    price NUMERIC(10, 2) NOT NULL,      -- фінальна ціна на сайті
    stock_quantity INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    images JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID, COD (післяплата)
    payment_method VARCHAR(50) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipments (Підтримка розділених відправлень)
CREATE TABLE order_shipments (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    supplier_id INT REFERENCES suppliers(id),
    ttn_number VARCHAR(100),
    shipping_status VARCHAR(50) DEFAULT 'NEW',
    nova_poshta_ref VARCHAR(100)
);

-- Order Items
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    shipment_id INT REFERENCES order_shipments(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    quantity INT NOT NULL,
    price_per_item NUMERIC(10, 2) NOT NULL
);