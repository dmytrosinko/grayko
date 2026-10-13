/**
 * Central Reactive Application State
 */

class AppState {
  constructor() {
    this.cart = this.loadCart();
    this.filters = {
      category: null,
      age_groups: [],
      materials: [],
      brands: [],
      skill: null,
      min_price: null,
      max_price: null,
      in_stock: false,
      sort: 'popular',
      q: ''
    };
    this.facets = {};
    this.categories = [];
    this.suppliers = [];
    this.listeners = new Map();
  }

  setCategories(categories) {
    this.categories = categories;
  }

  loadCart() {
    try {
      const items = JSON.parse(localStorage.getItem('grayko_cart') || '[]');
      return items.map(item => {
        const id = item.product_id != null ? item.product_id : item.id;
        return {
          ...item,
          id: id,
          product_id: id
        };
      });
    } catch {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem('grayko_cart', JSON.stringify(this.cart));
    this.emit('cart_updated', this.cart);
  }

  addToCart(product, quantity = 1) {
    const prodId = product.id != null ? product.id : product.product_id;
    const existing = this.cart.find(item => String(item.product_id || item.id) === String(prodId));
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cart.push({
        id: prodId,
        product_id: prodId,
        sku: product.internal_sku || product.sku || 'SKU',
        title: product.title_uk || product.title || 'Товар',
        price: product.price,
        image: Array.isArray(product.images) && product.images.length ? product.images[0] : (product.image || ''),
        supplier_id: product.supplier_id,
        supplier_name: product.supplier_name,
        quantity: quantity
      });
    }
    this.saveCart();
    this.showToast(`Додано в кошик: ${product.title_uk || product.title}`);
  }

  updateCartQty(productId, delta) {
    const item = this.cart.find(i => String(i.product_id || i.id) === String(productId));
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.cart = this.cart.filter(i => String(i.product_id || i.id) !== String(productId));
      this.showToast(`Видалено з кошика: ${item.title}`);
    }
    this.saveCart();
  }

  removeFromCart(productId) {
    const item = this.cart.find(i => String(i.product_id || i.id) === String(productId));
    this.cart = this.cart.filter(i => String(i.product_id || i.id) !== String(productId));
    this.saveCart();
    if (item) {
      this.showToast(`Видалено з кошика: ${item.title}`);
    }
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
    this.showToast('Кошик успішно очищено');
  }

  getCartCount() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  setFilter(key, value) {
    this.filters[key] = value;
    this.emit('filters_changed', this.filters);
  }

  toggleArrayFilter(key, value) {
    const current = this.filters[key] || [];
    const idx = current.indexOf(value);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(value);
    }
    this.filters[key] = current;
    this.emit('filters_changed', this.filters);
  }

  resetFilters() {
    this.filters = {
      category: null,
      age_groups: [],
      materials: [],
      brands: [],
      skill: null,
      min_price: null,
      max_price: null,
      in_stock: false,
      sort: 'popular',
      q: ''
    };
    this.emit('filters_changed', this.filters);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  showToast(message, type = 'success') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 74px;
        right: 20px;
        background: #0F172A;
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.25);
        z-index: 10010;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        transform: translateY(100px);
        opacity: 0;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>✨</span> ${message}`;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
    }, 2800);
  }
}

export const state = new AppState();
