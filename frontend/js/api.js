/**
 * GRAYKO REST API Client with Automatic Static/Netlify Offline Fallback
 * 
 * Works both with a live Python backend server AND autonomously on static hosts (Netlify / GitHub Pages).
 */

import {
  INITIAL_SUPPLIERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  CITIES_DATA,
  generateTTN
} from './mockData.js';

// Local storage keys
const STORAGE_KEY_PRODUCTS = 'grayko_products_db';
const STORAGE_KEY_ORDERS = 'grayko_orders_db';

// Helper to get or initialize local products store
function getLocalProducts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn("Could not read local products storage:", e);
  }
  return JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
}

function saveLocalProducts(products) {
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.warn("Could not save products storage:", e);
  }
}

function getLocalOrders() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn("Could not read local orders storage:", e);
  }
  return [
    {
      id: 1,
      order_number: "GR-2026-9810",
      customer_name: "Оксана Мельник",
      customer_phone: "+38 (067) 123-45-67",
      customer_email: "oksana.m@gmail.com",
      delivery_city: "Київ",
      delivery_warehouse: "Відділення №35: вул. Алма-Атинська, 39А",
      payment_status: "PAID",
      payment_method: "MONOBANK",
      total_products_amount: 1498.00,
      total_shipping_amount: 80.00,
      total_amount: 1578.00,
      created_at: "2026-09-14 10:15",
      shipments: [
        {
          supplier_name: "Центральний склад (Київ)",
          warehouse_city: "Київ",
          ttn_number: "20450893124578",
          shipping_cost: 80.00,
          packing_fee: 0.00,
          shipping_status: "DISPATCHED_TO_SUPPLIER",
          items: [
            { title: "Всюдихід-дрифт на радіокеруванні 4WD «Monster Stunt Climber»", sku: "GRAY-RC-001", quantity: 1, price: 999.00 },
            { title: "Дерев'яний розвиваючий набір Cubika «Еко-Містечко 55 деталей»", sku: "GRAY-CBK-003", quantity: 1, price: 499.00 }
          ]
        }
      ]
    }
  ];
}

function saveLocalOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.warn("Could not save orders storage:", e);
  }
}

/**
 * Safely executes a fetch request; if it fails or returns non-JSON (like Netlify 404 HTML),
 * executes the fallback function.
 */
async function safeFetch(url, options = {}, fallbackFn) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (err) {
    // Backend offline or running on static host
  }
  return fallbackFn();
}

export const api = {
  // Catalog & Products
  async getCatalog(params = {}) {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.sort) query.set('sort', params.sort);
    if (params.q) query.set('q', params.q);
    if (params.in_stock) query.set('in_stock', '1');
    if (params.min_price) query.set('min_price', params.min_price);
    if (params.max_price) query.set('max_price', params.max_price);
    if (params.skill) query.set('skill', params.skill);

    if (params.age_groups && params.age_groups.length) {
      params.age_groups.forEach(ag => query.append('age_group', ag));
    }
    if (params.materials && params.materials.length) {
      params.materials.forEach(m => query.append('material', m));
    }
    if (params.brands && params.brands.length) {
      params.brands.forEach(b => query.append('brand', b));
    }

    return safeFetch(`/api/catalog?${query.toString()}`, {}, () => {
      let products = getLocalProducts().filter(p => p.is_active !== 0);

      // Filter by Category
      if (params.category) {
        const catId = parseInt(params.category, 10);
        products = products.filter(p => p.category_id === catId);
      }

      // Filter by Search Query
      if (params.q) {
        const q = params.q.toLowerCase().trim();
        products = products.filter(p =>
          p.title_uk.toLowerCase().includes(q) ||
          (p.description_uk && p.description_uk.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.internal_sku && p.internal_sku.toLowerCase().includes(q))
        );
      }

      // Filter by In Stock
      if (params.in_stock) {
        products = products.filter(p => (p.stock_quantity || 0) > 0);
      }

      // Filter by Age Groups
      const ageGroups = Array.isArray(params.age_groups)
        ? params.age_groups
        : (params.age_group ? params.age_group.split(',').filter(Boolean) : []);
      if (ageGroups.length > 0) {
        products = products.filter(p => ageGroups.includes(p.age_group));
      }

      // Filter by Materials
      const materials = Array.isArray(params.materials)
        ? params.materials
        : (params.material ? params.material.split(',').filter(Boolean) : []);
      if (materials.length > 0) {
        products = products.filter(p => materials.some(m => p.material && p.material.toLowerCase().includes(m.toLowerCase())));
      }

      // Filter by Brands
      const brands = Array.isArray(params.brands)
        ? params.brands
        : (params.brand ? params.brand.split(',').filter(Boolean) : []);
      if (brands.length > 0) {
        products = products.filter(p => brands.includes(p.brand));
      }

      // Filter by Skill
      if (params.skill) {
        products = products.filter(p =>
          Array.isArray(p.skills_developed) && p.skills_developed.includes(params.skill)
        );
      }

      // Filter by Price Range
      if (params.min_price != null && params.min_price !== '') {
        const min = parseFloat(params.min_price);
        products = products.filter(p => p.price >= min);
      }
      if (params.max_price != null && params.max_price !== '') {
        const max = parseFloat(params.max_price);
        products = products.filter(p => p.price <= max);
      }

      // Filter by Bestseller / New
      if (params.is_bestseller) {
        products = products.filter(p => p.is_bestseller);
      }
      if (params.is_new) {
        products = products.filter(p => p.is_new);
      }

      // Sorting
      const sort = params.sort || 'popular';
      if (sort === 'price_asc') {
        products.sort((a, b) => a.price - b.price);
      } else if (sort === 'price_desc') {
        products.sort((a, b) => b.price - a.price);
      } else if (sort === 'new') {
        products.sort((a, b) => (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0) || b.id - a.id);
      } else {
        // popular
        products.sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0) || b.stock_quantity - a.stock_quantity);
      }

      // Calculate Facets from all active products
      const allActive = getLocalProducts().filter(p => p.is_active !== 0);
      const ageSet = new Set();
      const matSet = new Set();
      const brandSet = new Set();
      const skillSet = new Set();
      let minP = Infinity;
      let maxP = -Infinity;

      allActive.forEach(p => {
        if (p.age_group) ageSet.add(p.age_group);
        if (p.material) {
          p.material.split(',').forEach(m => matSet.add(m.trim()));
        }
        if (p.brand) brandSet.add(p.brand);
        if (Array.isArray(p.skills_developed)) {
          p.skills_developed.forEach(s => skillSet.add(s));
        }
        if (p.price < minP) minP = p.price;
        if (p.price > maxP) maxP = p.price;
      });

      const facets = {
        age_groups: Array.from(ageSet).sort(),
        materials: Array.from(matSet).sort(),
        brands: Array.from(brandSet).sort(),
        skills: Array.from(skillSet).sort(),
        min_price: minP === Infinity ? 0 : Math.floor(minP),
        max_price: maxP === -Infinity ? 2000 : Math.ceil(maxP)
      };

      return {
        products,
        facets,
        total: products.length
      };
    });
  },

  async getProduct(slugOrId) {
    return safeFetch(`/api/products/${slugOrId}`, {}, () => {
      const all = getLocalProducts();
      const product = all.find(p => p.id === parseInt(slugOrId, 10) || p.slug === slugOrId);
      if (!product) return { product: null, cross_sells: [] };

      // Find cross-sell recommendations
      const cross_sells = all
        .filter(p => p.id !== product.id && (p.category_id === product.category_id || p.is_bestseller))
        .slice(0, 3);

      return { product, cross_sells };
    });
  },

  async getCategories() {
    return safeFetch('/api/categories', {}, () => {
      return { categories: INITIAL_CATEGORIES };
    });
  },

  async getSuppliers() {
    return safeFetch('/api/suppliers', {}, () => {
      return { suppliers: INITIAL_SUPPLIERS };
    });
  },

  // Logistics & Nova Poshta
  async searchCities(query = '') {
    return safeFetch(`/api/logistics/cities?q=${encodeURIComponent(query)}`, {}, () => {
      const q = query.trim().toLowerCase();
      if (!q) return { cities: CITIES_DATA };
      const filtered = CITIES_DATA.filter(c =>
        c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q)
      );
      return { cities: filtered.length ? filtered : CITIES_DATA };
    });
  },

  async getWarehouses(city = 'Київ') {
    return safeFetch(`/api/logistics/warehouses?city=${encodeURIComponent(city)}`, {}, () => {
      const found = CITIES_DATA.find(c => c.name.toLowerCase() === city.toLowerCase());
      if (found) return { warehouses: found.warehouses };
      return {
        warehouses: [
          { ref: "wh-gen-1", name: `Відділення №1 (Вантажне): вул. Центральна, 1`, type: "Branch", max_weight: 1100 },
          { ref: "wh-gen-2", name: `Відділення №2 (до 30 кг): вул. Головна, 25`, type: "Branch", max_weight: 30 },
          { ref: "wh-gen-postomat", name: `Поштомат №1001: просп. Свободи, 10`, type: "Postomat", max_weight: 20 }
        ]
      };
    });
  },

  // Cart & Orders
  async calculateCart(items = []) {
    return safeFetch('/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    }, () => {
      const allProducts = getLocalProducts();
      const supplierMap = {};

      INITIAL_SUPPLIERS.forEach(s => {
        supplierMap[s.id] = { ...s, items: [], subtotal: 0 };
      });

      items.forEach(cartItem => {
        const prod = allProducts.find(p => p.id === cartItem.id);
        const supplierId = prod?.supplier_id || 1;
        if (!supplierMap[supplierId]) {
          supplierMap[supplierId] = {
            id: supplierId,
            name: prod?.supplier_name || "Склад",
            warehouse_city: prod?.supplier_city || "Київ",
            packing_fee: 15.0,
            free_packing_threshold: 1000.0,
            items: [],
            subtotal: 0
          };
        }

        const price = prod ? prod.price : (cartItem.price || 0);
        const itemTotal = price * cartItem.quantity;
        supplierMap[supplierId].items.push({
          product_id: cartItem.id,
          title: prod ? prod.title_uk : cartItem.title,
          sku: prod ? prod.internal_sku : "SKU",
          price: price,
          quantity: cartItem.quantity,
          image: prod?.images?.[0] || cartItem.image
        });
        supplierMap[supplierId].subtotal += itemTotal;
      });

      const shipments = [];
      let totalProducts = 0;
      let totalShipping = 0;
      let totalPacking = 0;

      Object.values(supplierMap).forEach(sup => {
        if (sup.items.length > 0) {
          const packing = sup.subtotal >= sup.free_packing_threshold ? 0 : sup.packing_fee;
          const shipping = 80.00; // Standard Nova Poshta rate
          shipments.push({
            supplier_id: sup.id,
            supplier_name: sup.name,
            warehouse_city: sup.warehouse_city,
            items: sup.items,
            subtotal: sup.subtotal,
            packing_fee: packing,
            shipping_cost: shipping,
            total: sup.subtotal + packing + shipping
          });

          totalProducts += sup.subtotal;
          totalShipping += shipping;
          totalPacking += packing;
        }
      });

      return {
        shipments,
        total_products: totalProducts,
        total_shipping: totalShipping,
        total_packing: totalPacking,
        grand_total: totalProducts + totalShipping + totalPacking,
        is_split_order: shipments.length > 1
      };
    });
  },

  async createOrder(orderData) {
    return safeFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    }, () => {
      const orders = getLocalOrders();
      const orderNum = `GR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const generatedShipments = (orderData.shipments || []).map(s => ({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        warehouse_city: s.warehouse_city,
        ttn_number: generateTTN(),
        shipping_cost: s.shipping_cost || 80.00,
        packing_fee: s.packing_fee || 0.00,
        shipping_status: 'NEW',
        items: s.items || []
      }));

      const newOrder = {
        id: orders.length + 1,
        order_number: orderNum,
        customer_name: orderData.customer_name || 'Клієнт',
        customer_phone: orderData.customer_phone || '',
        customer_email: orderData.customer_email || '',
        customer_comment: orderData.customer_comment || '',
        delivery_city: orderData.delivery_city || 'Київ',
        delivery_warehouse: orderData.delivery_warehouse || 'Відділення №1',
        payment_status: orderData.payment_method === 'COD_NOVAPAY' ? 'COD' : 'PAID',
        payment_method: orderData.payment_method || 'MONOBANK',
        total_products_amount: orderData.total_products_amount || 0,
        total_shipping_amount: orderData.total_shipping_amount || 0,
        total_amount: orderData.total_amount || 0,
        created_at: dateStr,
        shipments: generatedShipments
      };

      orders.unshift(newOrder);
      saveLocalOrders(orders);

      return {
        success: true,
        order_number: orderNum,
        total_amount: newOrder.total_amount,
        shipments: generatedShipments,
        message: "Замовлення успішно створено!"
      };
    });
  },

  async getOrders() {
    return safeFetch('/api/orders', {}, () => {
      return { orders: getLocalOrders() };
    });
  },

  // Admin & Dropshipping Hub
  async getAdminStats() {
    return safeFetch('/api/admin/stats', {}, () => {
      const orders = getLocalOrders();
      const products = getLocalProducts().filter(p => p.is_active !== 0);
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      return {
        total_deposit: 11600.00,
        active_products: products.length,
        orders_count: orders.length,
        total_revenue: totalRevenue.toFixed(2),
        suppliers: INITIAL_SUPPLIERS,
        sync_logs: [
          { id: 104, sync_type: "FAST", status: "SUCCESS", items_processed: 13, rrp_violations_count: 0, created_at: "2026-09-14 11:00" },
          { id: 103, sync_type: "FULL", status: "SUCCESS", items_processed: 13, rrp_violations_count: 0, created_at: "2026-09-14 03:00" }
        ]
      };
    });
  },

  async triggerSync(syncType = 'FAST', supplierId = 1) {
    return safeFetch('/api/admin/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync_type: syncType, supplier_id: supplierId })
    }, () => {
      return {
        success: true,
        message: `Синхронізацію (${syncType}) зі складом успішно виконано! Залишки та ціни актуалізовано.`,
        items_processed: 13,
        rrp_violations_count: 0
      };
    });
  },

  async updatePriceWithRRP(productId, price) {
    return safeFetch('/api/admin/price-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, price })
    }, () => {
      const products = getLocalProducts();
      const prod = products.find(p => p.id === parseInt(productId, 10));
      if (!prod) throw new Error("Товар не знайдено");

      if (price < prod.rrp_price) {
        throw new Error(`Порушення РРЦ: Мінімальна дозволена ціна постачальника — ${prod.rrp_price} грн.`);
      }

      prod.price = price;
      saveLocalProducts(products);

      return {
        success: true,
        message: `Ціну на «${prod.title_uk}» успішно оновлено до ${price} грн.`,
        product_id: productId,
        price
      };
    });
  }
};
