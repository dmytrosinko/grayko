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

  loadCart() {
    try {
      return JSON.parse(localStorage.getItem('grayko_cart') || '[]');
    } catch {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem('grayko_cart', JSON.stringify(this.cart));
    this.emit('cart_updated', this.cart);
  }

  addToCart(product, quantity = 1) {
    const existing = this.cart.find(item => item.product_id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cart.push({
        product_id: product.id,
        sku: product.internal_sku,
        title: product.title_uk,
        price: product.price,
        image: Array.isArray(product.images) && product.images.length ? product.images[0] : '',
        supplier_id: product.supplier_id,
        supplier_name: product.supplier_name,
        quantity: quantity
      });
    }
    this.saveCart();
    this.showToast(`Додано в кошик: ${product.title_uk}`);
  }

  updateCartQty(productId, delta) {
    const item = this.cart.find(i => i.product_id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.cart = this.cart.filter(i => i.product_id !== productId);
    }
    this.saveCart();
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(i => i.product_id !== productId);
    this.saveCart();
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
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
        z-index: 9999;
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
