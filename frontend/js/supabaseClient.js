/**
 * Supabase Client Data Access Layer for GRAYKO Storefront & Admin
 * Queries Supabase REST API directly from the browser (Netlify static hosting).
 */

import { SUPABASE_URL, getSupabaseHeaders, isSupabaseClientConfigured } from './supabaseConfig.js';

let _cachedCategories = null;
let _cachedFacets = null;

function normalizeJson(val, fallback) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

export const supabaseClient = {
  isConfigured() {
    return isSupabaseClientConfigured();
  },

  async getCategories() {
    if (_cachedCategories && _cachedCategories.length > 0) {
      return _cachedCategories;
    }
    const headers = getSupabaseHeaders();
    const endpoint = `${SUPABASE_URL}/rest/v1/categories?select=*&order=id.asc`;
    const res = await fetch(endpoint, { headers });
    if (!res.ok) {
      throw new Error(`Supabase categories error: ${res.statusText}`);
    }
    const data = await res.json();
    _cachedCategories = data;
    return data;
  },

  getDescendantCategoryIds(categoryId, allCategories) {
    const targetId = parseInt(categoryId, 10);
    const result = new Set([targetId]);
    let added = true;
    while (added) {
      added = false;
      for (const cat of allCategories) {
        if (cat.parent_id && result.has(cat.parent_id) && !result.has(cat.id)) {
          result.add(cat.id);
          added = true;
        }
      }
    }
    return Array.from(result);
  },

  async getCatalog(params = {}) {
    const headers = getSupabaseHeaders();
    const queryParams = new URLSearchParams();

    queryParams.set('select', '*,categories(name_uk,slug),suppliers(name,code,warehouse_city)');
    queryParams.set('is_active', 'eq.1');

    // In stock filter
    if (params.in_stock) {
      queryParams.set('stock_quantity', 'gt.0');
    }

    // Category tree filter
    if (params.category) {
      const cats = await this.getCategories().catch(() => []);
      const descendantIds = this.getDescendantCategoryIds(params.category, cats);
      queryParams.set('category_id', `in.(${descendantIds.join(',')})`);
    }

    // Price range
    const minPrice = params.min_price != null && params.min_price !== '' ? parseFloat(params.min_price) : null;
    const maxPrice = params.max_price != null && params.max_price !== '' ? parseFloat(params.max_price) : null;
    if (minPrice != null && maxPrice != null) {
      queryParams.set('and', `(price.gte.${minPrice},price.lte.${maxPrice})`);
    } else if (minPrice != null) {
      queryParams.set('price', `gte.${minPrice}`);
    } else if (maxPrice != null) {
      queryParams.set('price', `lte.${maxPrice}`);
    }

    // Brands
    const brands = Array.isArray(params.brands)
      ? params.brands
      : (params.brand ? params.brand.split(',').filter(Boolean) : []);
    if (brands.length > 0) {
      queryParams.set('brand', `in.(${brands.map(b => `"${b}"`).join(',')})`);
    }

    // Age groups
    const ageGroups = Array.isArray(params.age_groups)
      ? params.age_groups
      : (params.age_group ? params.age_group.split(',').filter(Boolean) : []);
    if (ageGroups.length > 0) {
      queryParams.set('age_group', `in.(${ageGroups.map(a => `"${a}"`).join(',')})`);
    }

    // Search query
    if (params.q && params.q.trim()) {
      const kw = params.q.trim();
      queryParams.set('or', `(title_uk.ilike.*${kw}*,description_uk.ilike.*${kw}*,brand.ilike.*${kw}*,internal_sku.ilike.*${kw}*,supplier_sku.ilike.*${kw}*)`);
    }

    // Sorting
    const sort = params.sort || 'popular';
    if (sort === 'price_asc') {
      queryParams.set('order', 'price.asc');
    } else if (sort === 'price_desc') {
      queryParams.set('order', 'price.desc');
    } else if (sort === 'new') {
      queryParams.set('order', 'is_new.desc,id.desc');
    } else if (sort === 'parts_desc') {
      queryParams.set('order', 'parts_count.desc');
    } else {
      // popular
      queryParams.set('order', 'is_bestseller.desc,id.desc');
    }

    // Pagination
    const limit = Math.min(120, Math.max(1, parseInt(params.limit || 48, 10)));
    const offset = Math.max(0, parseInt(params.offset || 0, 10));
    queryParams.set('limit', limit);
    queryParams.set('offset', offset);

    const endpoint = `${SUPABASE_URL}/rest/v1/products?${queryParams.toString()}`;
    const res = await fetch(endpoint, { headers });

    if (!res.ok) {
      throw new Error(`Supabase query failed (${res.status}): ${res.statusText}`);
    }

    const cr = res.headers.get('content-range') || '';
    const totalCount = cr.includes('/') ? parseInt(cr.split('/')[1], 10) : 0;
    const rawProducts = await res.json();

    const products = rawProducts.map(p => {
      const cat = p.categories || {};
      const sup = p.suppliers || {};
      return {
        ...p,
        category_name: cat.name_uk || '',
        category_slug: cat.slug || '',
        supplier_name: sup.name || '',
        supplier_code: sup.code || '',
        supplier_city: sup.warehouse_city || '',
        images: normalizeJson(p.images, []),
        skills_developed: normalizeJson(p.skills_developed, []),
        specifications: normalizeJson(p.specifications, {})
      };
    });

    const facets = await this.getFacets();

    return {
      products,
      total: totalCount || products.length,
      limit,
      offset,
      has_more: (offset + products.length) < totalCount,
      facets,
      data_source: 'supabase'
    };
  },

  async getFacets() {
    if (_cachedFacets) return _cachedFacets;
    try {
      const headers = getSupabaseHeaders();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=brand,material,age_group&is_active=eq.1&limit=500`, { headers });
      if (res.ok) {
        const rows = await res.json();
        const brands = Array.from(new Set(rows.map(r => r.brand).filter(Boolean))).sort().slice(0, 30);
        const materials = Array.from(new Set(rows.map(r => r.material).filter(Boolean))).sort().slice(0, 20);
        const age_groups = Array.from(new Set(rows.map(r => r.age_group).filter(Boolean))).sort();

        _cachedFacets = {
          brands,
          materials,
          age_groups,
          skills: ["дрібна моторика", "інженерне мислення", "просторова уява", "STEM / фізика", "логіка", "сенсорика", "творчість"],
          min_price: 5,
          max_price: 5000
        };
        return _cachedFacets;
      }
    } catch (e) {
      console.warn("Could not fetch facets from Supabase:", e);
    }

    return {
      brands: [],
      materials: [],
      age_groups: [],
      skills: ["дрібна моторика", "інженерне мислення", "просторова уява", "STEM / фізика", "логіка", "сенсорика", "творчість"],
      min_price: 5,
      max_price: 5000
    };
  },

  async getProduct(slugOrId) {
    const headers = getSupabaseHeaders();
    const filter = String(slugOrId).match(/^\d+$/)
      ? `id=eq.${slugOrId}`
      : `slug=eq.${slugOrId}`;

    const endpoint = `${SUPABASE_URL}/rest/v1/products?${filter}&select=*,categories(name_uk,slug),suppliers(name,code,warehouse_city,warehouse_address)&limit=1`;
    const res = await fetch(endpoint, { headers });
    if (!res.ok) throw new Error("Failed to fetch product from Supabase");

    const items = await res.json();
    if (!items || !items.length) return { product: null, cross_sells: [] };

    const raw = items[0];
    const cat = raw.categories || {};
    const sup = raw.suppliers || {};

    const product = {
      ...raw,
      category_name: cat.name_uk || '',
      category_slug: cat.slug || '',
      supplier_name: sup.name || '',
      supplier_code: sup.code || '',
      supplier_city: sup.warehouse_city || '',
      supplier_address: sup.warehouse_address || '',
      images: normalizeJson(raw.images, []),
      skills_developed: normalizeJson(raw.skills_developed, []),
      specifications: normalizeJson(raw.specifications, {})
    };

    // Cross sells in same category
    let cross_sells = [];
    if (product.category_id) {
      try {
        const crRes = await fetch(`${SUPABASE_URL}/rest/v1/products?category_id=eq.${product.category_id}&id=neq.${product.id}&is_active=eq.1&limit=3&select=*`, { headers });
        if (crRes.ok) {
          const crRows = await crRes.json();
          cross_sells = crRows.map(p => ({
            ...p,
            images: normalizeJson(p.images, [])
          }));
        }
      } catch (e) {}
    }

    return { product, cross_sells, data_source: 'supabase' };
  },

  async getSuppliers() {
    const headers = getSupabaseHeaders();
    const endpoint = `${SUPABASE_URL}/rest/v1/suppliers?select=*&order=id.asc`;
    const res = await fetch(endpoint, { headers });
    if (!res.ok) throw new Error("Failed to fetch suppliers from Supabase");
    return await res.json();
  },

  async createOrder(orderData) {
    const headers = getSupabaseHeaders();
    headers['Prefer'] = 'return=representation';

    const orderPayload = {
      order_number: orderData.order_number,
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone,
      customer_email: orderData.customer_email || '',
      customer_comment: orderData.customer_comment || '',
      delivery_type: orderData.delivery_type || 'NOVA_POSHTA_WAREHOUSE',
      delivery_city: orderData.delivery_city,
      delivery_warehouse: orderData.delivery_warehouse,
      payment_status: orderData.payment_status || 'PAID',
      payment_method: orderData.payment_method || 'MONOBANK',
      total_products_amount: orderData.total_products_amount,
      total_shipping_amount: orderData.total_shipping_amount,
      total_amount: orderData.total_amount,
      fiscal_receipt_id: orderData.fiscal_receipt_id || null
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify([orderPayload])
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Order insertion failed: ${errText}`);
    }

    const created = await res.json();
    const orderId = created[0].id;

    // Create shipments
    for (const sh of (orderData.shipments || [])) {
      const shRes = await fetch(`${SUPABASE_URL}/rest/v1/order_shipments`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{
          order_id: orderId,
          supplier_id: sh.supplier_id || 1,
          shipment_number: sh.shipment_number,
          ttn_number: sh.ttn_number,
          shipping_cost: sh.shipping_cost || 80.0,
          packing_fee: sh.packing_fee || 0.0,
          shipping_status: 'NEW',
          nova_poshta_ref: `NP-REF-${sh.ttn_number}`,
          sticker_pdf_url: `/api/shipments/${orderId}/sticker`
        }])
      });

      if (shRes.ok) {
        const createdSh = await shRes.json();
        const shipmentId = createdSh[0].id;
        const itemsPayload = (sh.items || []).map(it => ({
          shipment_id: shipmentId,
          product_id: it.product_id || it.id,
          quantity: it.quantity || 1,
          price_per_item: it.price,
          cost_price_per_item: it.cost_price || 0.0,
          product_title: it.title || it.title_uk || '',
          product_sku: it.sku || it.internal_sku || ''
        }));
        if (itemsPayload.length) {
          await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
            method: 'POST',
            headers,
            body: JSON.stringify(itemsPayload)
          });
        }
      }
    }

    return {
      success: true,
      order_id: orderId,
      order_number: orderData.order_number,
      total_amount: orderData.total_amount,
      data_source: 'supabase'
    };
  },

  async getOrders() {
    const headers = getSupabaseHeaders();
    const endpoint = `${SUPABASE_URL}/rest/v1/orders?select=*,order_shipments(*,order_items(*))&order=id.desc&limit=50`;
    const res = await fetch(endpoint, { headers });
    if (!res.ok) throw new Error("Failed to fetch orders from Supabase");
    const raw = await res.json();
    return raw.map(o => {
      const shipments = (o.order_shipments || []).map(sh => ({
        ...sh,
        items: sh.order_items || []
      }));
      return {
        ...o,
        shipments
      };
    });
  },

  async getAdminStats() {
    const headers = getSupabaseHeaders();
    headers['Prefer'] = 'count=exact';

    const stats = {
      data_source: 'supabase',
      total_products: 0,
      active_products: 0,
      in_stock_products: 0,
      orders_count: 0,
      total_revenue: '0.00',
      suppliers: []
    };

    try {
      const rProd = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id&is_active=eq.1&limit=1`, { headers });
      const crProd = rProd.headers.get('content-range') || '';
      if (crProd.includes('/')) stats.active_products = parseInt(crProd.split('/')[1], 10);

      const rStock = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id&stock_quantity=gt.0&limit=1`, { headers });
      const crStock = rStock.headers.get('content-range') || '';
      if (crStock.includes('/')) stats.in_stock_products = parseInt(crStock.split('/')[1], 10);

      const rOrd = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id,total_amount`, { headers });
      if (rOrd.ok) {
        const ords = await rOrd.json();
        stats.orders_count = ords.length;
        stats.total_revenue = ords.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0).toFixed(2);
      }

      const rSup = await fetch(`${SUPABASE_URL}/rest/v1/suppliers?select=*`, { headers });
      if (rSup.ok) stats.suppliers = await rSup.json();

      return stats;
    } catch (e) {
      console.warn("Error fetching stats from Supabase:", e);
      return stats;
    }
  }
};
