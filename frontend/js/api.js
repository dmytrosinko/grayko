/**
 * GRAYKO REST API Client
 */

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

    const res = await fetch(`/api/catalog?${query.toString()}`);
    return await res.json();
  },

  async getProduct(slugOrId) {
    const res = await fetch(`/api/products/${slugOrId}`);
    return await res.json();
  },

  async getCategories() {
    const res = await fetch('/api/categories');
    return await res.json();
  },

  async getSuppliers() {
    const res = await fetch('/api/suppliers');
    return await res.json();
  },

  // Logistics & Nova Poshta
  async searchCities(query = '') {
    const res = await fetch(`/api/logistics/cities?q=${encodeURIComponent(query)}`);
    return await res.json();
  },

  async getWarehouses(city = 'Київ') {
    const res = await fetch(`/api/logistics/warehouses?city=${encodeURIComponent(city)}`);
    return await res.json();
  },

  // Cart & Orders
  async calculateCart(items = []) {
    const res = await fetch('/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    return await res.json();
  },

  async createOrder(orderData) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    return await res.json();
  },

  async getOrders() {
    const res = await fetch('/api/orders');
    return await res.json();
  },

  // Admin & Dropshipping Hub
  async getAdminStats() {
    const res = await fetch('/api/admin/stats');
    return await res.json();
  },

  async triggerSync(syncType = 'FAST', supplierId = 1) {
    const res = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync_type: syncType, supplier_id: supplierId })
    });
    return await res.json();
  },

  async updatePriceWithRRP(productId, price) {
    const res = await fetch('/api/admin/price-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, price })
    });
    return await res.json();
  }
};
