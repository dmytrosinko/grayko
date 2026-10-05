/**
 * GRAYKO REST & Supabase API Client
 * 
 * Works seamlessly across environments:
 * 1. Direct Supabase PostgreSQL client (Netlify production static hosting)
 * 2. Live Python backend server (/api/...)
 * 3. Autonomous offline fallback (localStorage & mockData)
 */

import {
  INITIAL_SUPPLIERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  CITIES_DATA,
  generateTTN
} from './mockData.js';

import { supabaseClient } from './supabaseClient.js';
import { sendTelegramOrderNotification } from './telegramNotifier.js';

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

async function safeFetch(url, options = {}, fallbackFn) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (err) {
    // Offline or static host
  }
  return fallbackFn();
}

export const api = {
  // Catalog & Products
  async getCatalog(params = {}) {
    // 1. Direct Supabase Query (Primary in production on Netlify)
    if (supabaseClient.isConfigured()) {
      try {
        return await supabaseClient.getCatalog(params);
      } catch (err) {
        console.warn("Supabase query notice, checking local backend:", err);
      }
    }

    // 2. Local Python Server (http://localhost:8077/api/catalog)
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.sort) query.set('sort', params.sort);
    if (params.q) query.set('q', params.q);
    if (params.in_stock) query.set('in_stock', '1');
    if (params.min_price) query.set('min_price', params.min_price);
    if (params.max_price) query.set('max_price', params.max_price);
    if (params.skill) query.set('skill', params.skill);
    if (params.limit) query.set('limit', params.limit);
    if (params.offset != null) query.set('offset', params.offset);

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

      // Filter by Category (including descendants)
      if (params.category) {
        const catId = parseInt(params.category, 10);
        const allowedCatIds = new Set([catId]);
        if (state.categories && state.categories.length) {
          let added = true;
          while (added) {
            added = false;
            for (const c of state.categories) {
              if (c.parent_id && allowedCatIds.has(c.parent_id) && !allowedCatIds.has(c.id)) {
                allowedCatIds.add(c.id);
                added = true;
              }
            }
          }
        }
        products = products.filter(p => allowedCatIds.has(p.category_id));
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

      // Filter by Price Range
      if (params.min_price != null && params.min_price !== '') {
        const min = parseFloat(params.min_price);
        products = products.filter(p => p.price >= min);
      }
      if (params.max_price != null && params.max_price !== '') {
        const max = parseFloat(params.max_price);
        products = products.filter(p => p.price <= max);
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
        products.sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0) || b.stock_quantity - a.stock_quantity);
      }

      const allActive = getLocalProducts().filter(p => p.is_active !== 0);
      const ageSet = new Set();
      const matSet = new Set();
      const brandSet = new Set();
      const skillSet = new Set();
      let minP = Infinity;
      let maxP = -Infinity;

      allActive.forEach(p => {
        if (p.age_group) ageSet.add(p.age_group);
        if (p.material) p.material.split(',').forEach(m => matSet.add(m.trim()));
        if (p.brand) brandSet.add(p.brand);
        if (p.price < minP) minP = p.price;
        if (p.price > maxP) maxP = p.price;
      });

      return {
        products,
        facets: {
          age_groups: Array.from(ageSet).sort(),
          materials: Array.from(matSet).sort(),
          brands: Array.from(brandSet).sort(),
          skills: ["дрібна моторика", "інженерне мислення", "просторова уява", "STEM / фізика", "логіка", "сенсорика", "творчість"],
          min_price: minP === Infinity ? 0 : Math.floor(minP),
          max_price: maxP === -Infinity ? 2000 : Math.ceil(maxP)
        },
        total: products.length
      };
    });
  },

  async getProduct(slugOrId) {
    if (supabaseClient.isConfigured()) {
      try {
        const res = await supabaseClient.getProduct(slugOrId);
        if (res && res.product) return res;
      } catch (err) {
        console.warn("Supabase product query error:", err);
      }
    }

    return safeFetch(`/api/products/${slugOrId}`, {}, () => {
      const all = getLocalProducts();
      const product = all.find(p => p.id === parseInt(slugOrId, 10) || p.slug === slugOrId);
      if (!product) return { product: null, cross_sells: [] };

      const cross_sells = all
        .filter(p => p.id !== product.id && (p.category_id === product.category_id || p.is_bestseller))
        .slice(0, 3);

      return { product, cross_sells };
    });
  },

  async getCategories() {
    if (supabaseClient.isConfigured()) {
      try {
        const categories = await supabaseClient.getCategories();
        if (categories && categories.length) return { categories, data_source: 'supabase' };
      } catch (err) {
        console.warn("Supabase categories error:", err);
      }
    }

    return safeFetch('/api/categories', {}, () => {
      return { categories: INITIAL_CATEGORIES };
    });
  },

  async getSuppliers() {
    if (supabaseClient.isConfigured()) {
      try {
        const suppliers = await supabaseClient.getSuppliers();
        if (suppliers && suppliers.length) return { suppliers, data_source: 'supabase' };
      } catch (err) {
        console.warn("Supabase suppliers error:", err);
      }
    }

    return safeFetch('/api/suppliers', {}, () => {
      return { suppliers: INITIAL_SUPPLIERS };
    });
  },

  // Logistics & Nova Poshta
  async searchCities(query = '') {
    const q = (query || '').trim();
    if (!q) {
      return { cities: CITIES_DATA };
    }

    // 1. Try local server endpoint if available
    try {
      const res = await fetch(`/api/logistics/cities?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.cities && Array.isArray(data.cities) && data.cities.length) {
          return data;
        }
      }
    } catch (e) {
      // Offline / Netlify static host
    }

    // 2. Direct Nova Poshta API 2.0 (works in browser directly via CORS)
    try {
      const npRes = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: 'Address',
          calledMethod: 'searchSettlements',
          methodProperties: {
            CityName: q,
            Limit: '25',
            Page: '1'
          }
        })
      });
      if (npRes.ok) {
        const npData = await npRes.json();
        if (npData.success && npData.data && npData.data[0] && Array.isArray(npData.data[0].Addresses)) {
          const formattedCities = npData.data[0].Addresses.map(item => ({
            ref: item.DeliveryCity || item.Ref,
            settlementRef: item.Ref,
            name: item.MainDescription || item.Present,
            present: item.Present,
            area: item.Area || item.AreaDescription || '',
            region: item.Region || item.RegionsDescription || '',
            settlementType: item.SettlementTypeCode || ''
          }));
          return { cities: formattedCities };
        }
      }
    } catch (e) {
      console.warn("Direct Nova Poshta cities query failed:", e);
    }

    // 3. Fallback: filter local mock data
    const qLower = q.toLowerCase();
    const filtered = CITIES_DATA.filter(c =>
      c.name.toLowerCase().includes(qLower) || c.region.toLowerCase().includes(qLower)
    );
    return { cities: filtered.length ? filtered : CITIES_DATA };
  },

  async getWarehouses(options = {}) {
    let cityRef = '';
    let cityName = '';
    let q = '';
    let category = '';

    if (typeof options === 'string') {
      cityName = options;
    } else if (options && typeof options === 'object') {
      cityRef = options.cityRef || '';
      cityName = options.cityName || options.city || '';
      q = options.q || '';
      category = options.category || '';
    }

    if (!cityRef && !cityName) {
      return { warehouses: [] };
    }

    // 1. Try local server endpoint if available
    try {
      const params = new URLSearchParams();
      if (cityRef) params.set('cityRef', cityRef);
      if (cityName) params.set('cityName', cityName);
      if (q) params.set('q', q);
      if (category) params.set('category', category);

      const res = await fetch(`/api/logistics/warehouses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.warehouses && Array.isArray(data.warehouses) && data.warehouses.length) {
          return data;
        }
      }
    } catch (e) {
      // Offline / Netlify static host
    }

    // 2. Direct Nova Poshta API 2.0
    try {
      const methodProperties = {
        Limit: '500',
        FindByString: (q || '').trim()
      };
      if (cityRef) {
        methodProperties.CityRef = cityRef;
      } else if (cityName) {
        methodProperties.CityName = cityName;
      }

      const npRes = await fetch('https://api.novaposhta.ua/v2.0/json/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: 'Address',
          calledMethod: 'getWarehouses',
          methodProperties
        })
      });

      if (npRes.ok) {
        const npData = await npRes.json();
        let rawWarehouses = npData.data;

        // Fallback by clean CityName if cityRef query returned 0 warehouses
        if ((!npData.success || !Array.isArray(rawWarehouses) || rawWarehouses.length === 0) && cityName) {
          const cleanCityName = cityName.replace(/^(м|смт|с|село|місто)\.?\s*/i, '').split(',')[0].trim();
          const fallbackProps = {
            Limit: '500',
            FindByString: (q || '').trim(),
            CityName: cleanCityName
          };
          const fbRes = await fetch('https://api.novaposhta.ua/v2.0/json/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              modelName: 'Address',
              calledMethod: 'getWarehouses',
              methodProperties: fallbackProps
            })
          });
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            if (fbData.success && Array.isArray(fbData.data)) {
              rawWarehouses = fbData.data;
            }
          }
        }

        if (Array.isArray(rawWarehouses)) {
          let warehouses = rawWarehouses.map(item => {
            const isPostomat =
              item.CategoryOfWarehouse === 'Postomat' ||
              item.Description?.toLowerCase().includes('поштомат');
            return {
              ref: item.Ref,
              number: item.Number,
              name: item.Description,
              description: item.Description,
              shortAddress: item.ShortAddress,
              category: isPostomat ? 'Postomat' : 'Branch',
              typeOfWarehouse: item.TypeOfWarehouse,
              maxWeight: item.MaxWeightAllowed || item.PlaceMaxWeightAllowed || '30',
              phone: item.Phone || ''
            };
          });

          if (category === 'Branch') {
            warehouses = warehouses.filter(w => w.category === 'Branch');
          } else if (category === 'Postomat') {
            warehouses = warehouses.filter(w => w.category === 'Postomat');
          }

          return { warehouses };
        }
      }
    } catch (e) {
      console.warn("Direct Nova Poshta warehouses query failed:", e);
    }

    // 3. Fallback to mock data
    const found = CITIES_DATA.find(c =>
      (cityRef && c.ref === cityRef) ||
      (cityName && c.name.toLowerCase() === cityName.toLowerCase())
    );
    if (found) {
      let whs = found.warehouses.map(w => ({
        ...w,
        description: w.name,
        category: w.type === 'Postomat' ? 'Postomat' : 'Branch',
        shortAddress: w.name
      }));
      if (category === 'Branch') whs = whs.filter(w => w.category === 'Branch');
      if (category === 'Postomat') whs = whs.filter(w => w.category === 'Postomat');
      return { warehouses: whs };
    }

    return {
      warehouses: [
        { ref: "wh-gen-1", number: "1", name: `Відділення №1 (Вантажне): вул. Центральна, 1`, description: `Відділення №1 (Вантажне): вул. Центральна, 1`, shortAddress: `вул. Центральна, 1`, category: "Branch", maxWeight: 1100 },
        { ref: "wh-gen-2", number: "2", name: `Відділення №2 (до 30 кг): вул. Головна, 25`, description: `Відділення №2 (до 30 кг): вул. Головна, 25`, shortAddress: `вул. Головна, 25`, category: "Branch", maxWeight: 30 },
        { ref: "wh-gen-postomat", number: "1001", name: `Поштомат №1001: просп. Свободи, 10`, description: `Поштомат №1001: просп. Свободи, 10`, shortAddress: `просп. Свободи, 10`, category: "Postomat", maxWeight: 20 }
      ]
    };
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
          const shipping = 80.00;
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
    let orderResult = null;

    if (supabaseClient.isConfigured()) {
      try {
        orderResult = await supabaseClient.createOrder(orderData);
      } catch (err) {
        console.warn("Supabase order error, using local/api:", err);
      }
    }

    if (!orderResult) {
      orderResult = await safeFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      }, () => {
        const orders = getLocalOrders();
        const orderNum = orderData.order_number || `GK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
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
          payment_status: 'PENDING_PAYMENT',
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
          order_id: newOrder.id,
          order_number: orderNum,
          total_amount: newOrder.total_amount,
          shipments: generatedShipments,
          message: "Замовлення успішно створено!"
        };
      });
    }

    // Always dispatch Telegram bot notification for real-time manager alerts
    try {
      const mergedOrder = {
        ...orderData,
        order_number: (orderResult && orderResult.order_number) || orderData.order_number,
        total_amount: (orderResult && orderResult.total_amount) || orderData.total_amount,
        id: (orderResult && (orderResult.order_id || orderResult.id)) || 1
      };
      if (!orderResult || !orderResult.telegram_sent) {
        await sendTelegramOrderNotification(mergedOrder, orderData.items || []);
      }
    } catch (e) {
      console.warn("Telegram notification dispatch error:", e);
    }

    return orderResult;
  },

  async getOrders() {
    if (supabaseClient.isConfigured()) {
      try {
        const orders = await supabaseClient.getOrders();
        if (orders) return { orders, data_source: 'supabase' };
      } catch (err) {
        console.warn("Supabase orders error:", err);
      }
    }

    return safeFetch('/api/orders', {}, () => {
      return { orders: getLocalOrders() };
    });
  },

  // Admin & Dropshipping Hub
  async getAdminStats() {
    if (supabaseClient.isConfigured()) {
      try {
        const stats = await supabaseClient.getAdminStats();
        if (stats) return stats;
      } catch (err) {
        console.warn("Supabase stats error:", err);
      }
    }

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
