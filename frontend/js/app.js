import { state } from './state.js';
import { api } from './api.js';
import { initHeader } from './components/header.js';
import { renderCategoryPills, renderFiltersSidebar, renderActiveFilterChips } from './components/filters.js';
import { createProductCard } from './components/productCard.js';
import { openProductModal } from './components/productModal.js';
import { renderCartDrawer } from './components/cartDrawer.js';
import { openCheckoutModal } from './components/checkoutModal.js';

class ToysApp {
  constructor() {
    this.pagination = { limit: 48, offset: 0, total: 0, hasMore: false };
    this.isLoadingMore = false;
    this.init();
  }

  async init() {
    initHeader();
    renderFiltersSidebar({});
    renderActiveFilterChips();

    // Backdrop click listener to close all modals and drawers
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeAllModals());
    }

    // Load Categories & Initial Catalog
    await this.loadCategories();
    await this.loadProducts();

    // Listen to reactive state changes
    state.on('filters_changed', () => {
      this.pagination.offset = 0;
      this.loadProducts(false);
      renderActiveFilterChips();
      renderCategoryPills(state.categories);
      this.syncHeroAgePills();
    });
    state.on('cart_updated', () => {
      const drawer = document.getElementById('cart-drawer');
      if (drawer && drawer.classList.contains('open')) {
        renderCartDrawer();
      }
    });

    this.bindEvents();
  }

  syncHeroAgePills() {
    const activeAges = state.filters.age_groups || [];
    document.querySelectorAll('.age-pill').forEach(btn => {
      const age = btn.dataset.age;
      btn.classList.toggle('active', activeAges.includes(age));
    });
  }

  async loadCategories() {
    try {
      const data = await api.getCategories();
      state.setCategories(data.categories || []);
      renderCategoryPills(state.categories);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  async loadProducts(append = false) {
    const grid = document.getElementById('products-grid');
    const emptyState = document.getElementById('empty-state');
    const countLabel = document.getElementById('catalog-count-label');
    const pagContainer = document.getElementById('pagination-container');
    const pagInfo = document.getElementById('pagination-info');

    if (!append) {
      this.pagination.offset = 0;
      grid.innerHTML = `
        <div class="loader-skeleton">
          <div class="spinner"></div>
          <p style="margin-top: 10px; color: #64748B;">Завантажуємо актуальні товари...</p>
        </div>
      `;
      if (pagContainer) pagContainer.style.display = 'none';
    }
    emptyState.classList.add('hidden');

    try {
      const params = {
        q: state.filters.q,
        category: state.filters.category,
        brand: (state.filters.brands || []).join(','),
        material: (state.filters.materials || []).join(','),
        age_group: (state.filters.age_groups || []).join(','),
        skill: state.filters.skill,
        min_price: state.filters.min_price,
        max_price: state.filters.max_price,
        in_stock: state.filters.in_stock ? 1 : null,
        is_bestseller: state.filters.is_bestseller,
        is_new: state.filters.is_new,
        sort: state.filters.sort,
        limit: this.pagination.limit,
        offset: this.pagination.offset
      };

      const data = await api.getCatalog(params);
      const products = data.products || [];

      this.pagination.total = data.total != null ? data.total : products.length;
      this.pagination.hasMore = data.has_more != null ? data.has_more : ((this.pagination.offset + products.length) < this.pagination.total);

      if (!append) {
        state.facets = data.facets || {};
        renderFiltersSidebar(state.facets);
      }

      if (countLabel) {
        countLabel.textContent = `Знайдено: ${this.pagination.total.toLocaleString('uk-UA')} товарів`;
      }

      if (!append && !products.length) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        if (pagContainer) pagContainer.style.display = 'none';
        return;
      }

      if (!append) {
        grid.innerHTML = '';
      }

      products.forEach(prod => {
        const card = createProductCard(prod);
        grid.appendChild(card);
      });

      // Update Pagination UI
      if (pagContainer) {
        if (this.pagination.hasMore) {
          pagContainer.style.display = 'block';
          const displayedCount = Math.min(this.pagination.offset + products.length, this.pagination.total);
          if (pagInfo) {
            pagInfo.textContent = `Показано ${displayedCount.toLocaleString('uk-UA')} з ${this.pagination.total.toLocaleString('uk-UA')} товарів`;
          }
        } else {
          pagContainer.style.display = 'none';
        }
      }
    } catch (err) {
      if (!append) {
        grid.innerHTML = `<div style="color: #DC2626; padding: 20px;">Помилка завантаження каталогу: ${err.message}</div>`;
      }
      console.error("Load products error:", err);
    }
  }

  async loadMoreProducts() {
    if (this.isLoadingMore || !this.pagination.hasMore) return;
    this.isLoadingMore = true;

    const loadMoreBtn = document.getElementById('btn-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.textContent = '⏳ Завантаження...';
      loadMoreBtn.disabled = true;
    }

    this.pagination.offset += this.pagination.limit;
    await this.loadProducts(true);

    if (loadMoreBtn) {
      loadMoreBtn.textContent = 'Завантажити ще товари ▾';
      loadMoreBtn.disabled = false;
    }
    this.isLoadingMore = false;
  }

  bindEvents() {
    // Load More button
    const loadMoreBtn = document.getElementById('btn-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.loadMoreProducts());
    }

    // Age pills in Hero section
    document.querySelectorAll('.age-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const age = e.currentTarget.dataset.age;
        const isCurrentOnlyAge = state.filters.age_groups.length === 1 && state.filters.age_groups[0] === age;

        if (isCurrentOnlyAge) {
          // If already selected, reset/toggle off
          state.setFilter('age_groups', []);
        } else {
          // Reset other age filters and set only the clicked age
          state.setFilter('age_groups', [age]);
        }

        const catalog = document.getElementById('catalog');
        if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Sort Dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.setFilter('sort', e.target.value);
      });
    }

    // Mobile filter toggle
    const mobileFilterBtn = document.getElementById('btn-toggle-mobile-filters');
    if (mobileFilterBtn) {
      mobileFilterBtn.addEventListener('click', () => {
        this.toggleFilters();
      });
    }
  }

  // Global methods accessible from HTML onclick
  toggleFilters() {
    const sidebar = document.getElementById('filters-sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      this.closeFilters();
    } else {
      this.openFilters();
    }
  }

  openFilters() {
    const sidebar = document.getElementById('filters-sidebar');
    const backdrop = document.getElementById('modal-backdrop');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.remove('hidden');
    this.checkBodyModalOpen();
  }

  closeFilters() {
    const sidebar = document.getElementById('filters-sidebar');
    const backdrop = document.getElementById('modal-backdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop && document.querySelectorAll('.modal-container:not(.hidden)').length === 0 && !document.getElementById('cart-drawer')?.classList.contains('open')) {
      backdrop.classList.add('hidden');
    }
    this.checkBodyModalOpen();
  }

  checkBodyModalOpen() {
    const hasOpenModal = document.querySelectorAll('.modal-container:not(.hidden)').length > 0;
    const hasOpenCart = document.getElementById('cart-drawer')?.classList.contains('open');
    const hasOpenFilters = document.getElementById('filters-sidebar')?.classList.contains('mobile-open');
    if (hasOpenModal || hasOpenCart || hasOpenFilters) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }

  filterByCategory(catId) {
    state.setFilter('category', catId);
    document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
  }

  filterByBestsellers() {
    state.setFilter('is_bestseller', 1);
    document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
  }

  clearSkillFilter() {
    state.setFilter('skill', null);
  }

  resetFilters() {
    state.resetFilters();
  }

  openProductModal(productId) {
    openProductModal(productId);
    this.checkBodyModalOpen();
  }

  async addToCartById(productId) {
    const { product } = await api.getProduct(productId);
    if (product) state.addToCart(product, 1);
  }

  updateCartQty(productId, delta) {
    state.updateCartQty(productId, delta);
  }

  removeFromCart(productId) {
    state.removeFromCart(productId);
  }

  clearCart() {
    if (confirm("Ви впевнені, що хочете видалити всі товари та очистити кошик?")) {
      state.clearCart();
    }
  }

  openCart() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('modal-backdrop');
    renderCartDrawer();
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.remove('hidden');
    this.checkBodyModalOpen();
  }

  closeCart() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('modal-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop && document.querySelectorAll('.modal-container:not(.hidden)').length === 0 && !document.getElementById('filters-sidebar')?.classList.contains('mobile-open')) {
      backdrop.classList.add('hidden');
    }
    this.checkBodyModalOpen();
  }

  openCheckout() {
    this.closeCart();
    openCheckoutModal();
    this.checkBodyModalOpen();
  }

  closeModal() {
    document.querySelectorAll('.modal-container').forEach(m => m.classList.add('hidden'));
    const backdrop = document.getElementById('modal-backdrop');
    const drawer = document.getElementById('cart-drawer');
    const filters = document.getElementById('filters-sidebar');
    if ((!drawer || !drawer.classList.contains('open')) && (!filters || !filters.classList.contains('mobile-open')) && backdrop) {
      backdrop.classList.add('hidden');
    }
    this.checkBodyModalOpen();
  }

  closeAllModals() {
    this.closeCart();
    this.closeModal();
    this.closeFilters();
    document.body.classList.remove('modal-open');
  }

  openDeliveryModal() {
    const modal = document.getElementById('info-modal');
    const backdrop = document.getElementById('modal-backdrop');
    if (!modal || !backdrop) return;

    modal.innerHTML = `
      <div class="modal-header">
        <h2 style="font-size: 20px;">🚚 Умови доставки та оплати</h2>
        <button class="btn-close-drawer" onclick="window.app.closeModal()">✕</button>
      </div>
      <div class="modal-body" style="line-height: 1.6; font-size: 14px; color: #334155;">
        <h4 style="color: #0F172A; margin-bottom: 6px;">1. Доставка по Україні</h4>
        <p>Відправлення здійснюється щодня з центрального складу (м. Київ) та партнерських складів через Нову Пошту у відділення, поштомати або кур'єром.</p>
        <p>Термін доставки: <strong>1–2 дні</strong> по всій Україні.</p>

        <h4 style="color: #0F172A; margin: 16px 0 6px;">2. Способи оплати (передоплата)</h4>
        <ul>
          <li><strong>Онлайн-оплата:</strong> Карткою Visa / Mastercard, Apple Pay, Google Pay без жодних додаткових комісій.</li>
          <li><strong>Умови:</strong> Відправка замовлень здійснюється за 100% передоплатою. Миттєве зарахування та формування офіційного фіскального чека.</li>
        </ul>

        <h4 style="color: #0F172A; margin: 16px 0 6px;">3. Гарантія та повернення</h4>
        <p>100% гарантія якості. Повернення та обмін товару належної якості можливе протягом 14 днів відповідно до Закону України «Про захист прав споживачів».</p>
      </div>
    `;
    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    this.checkBodyModalOpen();
  }

  openConditionsModal() {
    const modal = document.getElementById('info-modal');
    const backdrop = document.getElementById('modal-backdrop');
    if (!modal || !backdrop) return;

    modal.innerHTML = `
      <div class="modal-header">
        <h2 style="font-size: 20px;">📜 Політика та правила магазину</h2>
        <button class="btn-close-drawer" onclick="window.app.closeModal()">✕</button>
      </div>
      <div class="modal-body" style="line-height: 1.6; font-size: 14px; color: #334155;">
        <p>Ми дбаємо про безпеку та розвиток дітей, пропонуючи виключно сертифіковані розвиваючі іграшки з екологічно чистих матеріалів.</p>
        <p>Усі розрахунки та формування чеків здійснюються відповідно до чинного податкового законодавства України через програмне РРО.</p>
      </div>
    `;
    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
    this.checkBodyModalOpen();
  }
}

// Bootstrap Application
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ToysApp();
});
