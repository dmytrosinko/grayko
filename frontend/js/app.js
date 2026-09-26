import { state } from './state.js';
import { api } from './api.js';
import { initHeader } from './components/header.js';
import {
  renderCategoriesSidebar,
  renderFiltersDrawer,
  renderActiveFilterChips,
  updateCatalogHeader,
  toggleCategoryAccordion,
  filterCategoriesInSidebar
} from './components/filters.js';
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
    renderCategoriesSidebar(state.categories);
    renderFiltersDrawer({});
    renderActiveFilterChips();
    updateCatalogHeader();

    // Backdrop click listener to close all modals and drawers
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeAllModals());
    }

    // Load Categories & Initial Catalog
    await this.loadCategories();
    await this.loadProducts();
    this.loadHeroShowcase();

    // Listen to reactive state changes
    state.on('filters_changed', () => {
      this.pagination.offset = 0;
      this.loadProducts(false);
      renderActiveFilterChips();
      renderCategoriesSidebar(state.categories);
      renderFiltersDrawer(state.facets || {});
      updateCatalogHeader();
      this.syncHeroAgePills();
      this.syncHeroSeasonalPills();
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
      renderCategoriesSidebar(state.categories);
      this.renderHeroSeasonalPills();
      updateCatalogHeader();
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  renderHeroSeasonalPills() {
    const container = document.getElementById('hero-seasonal-pills');
    if (!container) return;

    const categories = state.categories || [];
    const now = new Date();
    const month = now.getMonth(); // 0 = Jan, 8 = Sep, 9 = Oct, 10 = Nov, 11 = Dec
    const day = now.getDate();

    const findCat = (id, pattern) => {
      return categories.find(c => c.id === id) || 
             categories.find(c => pattern && pattern.test(c.name_uk || ''));
    };

    const pills = [];

    // 1. Halloween (Геловін): Active in Autumn before & around Halloween (Sep 1 - Nov 5)
    const isHalloweenSeason = (month === 8 || month === 9 || (month === 10 && day <= 5));
    if (isHalloweenSeason) {
      const halloweenCat = findCat(99186, /геловін|хелловін|хеловін/i);
      pills.push({
        id: halloweenCat ? halloweenCat.id : 99186,
        name: 'Хелловін',
        icon: '🎃',
        tag: 'Хіт сезону',
        className: 'pill-halloween'
      });
    }

    // 2. Current season category & subcategories:
    // Autumn: September (8), October (9), November (10)
    if (month >= 8 && month <= 10) {
      // Subcategory of seasonal: Parasols & Raincoats (Парасольки та дощовики)
      const umbrellaCat = findCat(98889, /парасольк|дощовик/i);
      if (umbrellaCat) {
        pills.push({
          id: umbrellaCat.id,
          name: 'Парасольки та дощовики',
          icon: '☔',
          tag: 'Осінь',
          className: 'pill-autumn'
        });
      }

      // Root/General Autumn category (Осінь і весна)
      const autumnCat = findCat(99228, /осінь/i) || findCat(98883, /сезонн/i);
      if (autumnCat) {
        pills.push({
          id: autumnCat.id,
          name: 'Осінні сезонні товари',
          icon: '🍂',
          className: 'pill-seasonal'
        });
      }

      // Late autumn (Nov 15+): add New Year preview
      if (month === 10 && day >= 15) {
        const nyCat = findCat(98896, /новорічн/i);
        if (nyCat) {
          pills.push({
            id: nyCat.id,
            name: 'Новорічні свята',
            icon: '🎄',
            tag: 'Скоро',
            className: 'pill-winter'
          });
        }
      }
    }
    // Winter: December (11), January (0), February (1)
    else if (month === 11 || month === 0 || month === 1) {
      const nyCat = findCat(98896, /новорічн/i);
      if (nyCat) {
        pills.push({
          id: nyCat.id,
          name: 'Новорічні товари та декор',
          icon: '🎄',
          tag: 'Зимові свята',
          className: 'pill-winter'
        });
      }
      const winterCat = findCat(99226, /зима/i) || findCat(98883, /сезонн/i);
      if (winterCat) {
        pills.push({
          id: winterCat.id,
          name: 'Зимові товари та розваги',
          icon: '❄️',
          className: 'pill-winter'
        });
      }
    }
    // Spring: March (2), April (3), May (4)
    else if (month >= 2 && month <= 4) {
      const springCat = findCat(99228, /весна/i) || findCat(99064, /транспорт/i);
      if (springCat) {
        pills.push({
          id: springCat.id,
          name: 'Весняні ігри на вулиці',
          icon: '🌱',
          className: 'pill-seasonal'
        });
      }
    }
    // Summer: June (5), July (6), August (7)
    else {
      const summerCat = findCat(99227, /літо/i) || findCat(98883, /сезонн/i);
      if (summerCat) {
        pills.push({
          id: summerCat.id,
          name: 'Літні товари та пляж',
          icon: '☀️',
          className: 'pill-summer'
        });
      }
      const bubbleCat = findCat(98888, /бульбашк/i);
      if (bubbleCat) {
        pills.push({
          id: bubbleCat.id,
          name: 'Мильні бульбашки',
          icon: '🫧',
          className: 'pill-summer'
        });
      }
    }

    const currentCatId = state.filters.category ? parseInt(state.filters.category, 10) : null;

    container.innerHTML = pills.map(p => `
      <button 
        class="seasonal-cat-pill ${p.className || ''} ${currentCatId === p.id ? 'active' : ''}" 
        data-category-id="${p.id}"
        onclick="window.app.toggleSeasonalCategory(${p.id})"
        title="Переглянути категорію: ${p.name}"
      >
        <span class="pill-emoji">${p.icon}</span>
        <span>${p.name}</span>
        ${p.tag ? `<span class="pill-tag">${p.tag}</span>` : ''}
      </button>
    `).join('');
  }

  syncHeroSeasonalPills() {
    const activeCatId = state.filters.category ? parseInt(state.filters.category, 10) : null;
    document.querySelectorAll('.seasonal-cat-pill').forEach(btn => {
      const catId = parseInt(btn.dataset.categoryId, 10);
      btn.classList.toggle('active', activeCatId === catId);
    });
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
        renderFiltersDrawer(state.facets);
        renderCategoriesSidebar(state.categories);
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

    // Filter toggle button
    const filterBtn = document.getElementById('btn-toggle-filters');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => {
        this.toggleFilters();
      });
    }

    // Mobile categories toggle button
    const mobileCatsBtn = document.getElementById('btn-toggle-mobile-categories');
    if (mobileCatsBtn) {
      mobileCatsBtn.addEventListener('click', () => {
        this.toggleCategoriesDrawer();
      });
    }
  }

  // Filters Drawer (Desktop & Mobile)
  toggleFilters() {
    const drawer = document.getElementById('filters-drawer');
    if (drawer && drawer.classList.contains('open')) {
      this.closeFilters();
    } else {
      this.openFilters();
    }
  }

  openFilters() {
    const drawer = document.getElementById('filters-drawer');
    const backdrop = document.getElementById('modal-backdrop');
    // Close mobile categories if open
    this.closeCategoriesDrawer();
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.remove('hidden');
    this.checkBodyModalOpen();
  }

  closeFilters() {
    const drawer = document.getElementById('filters-drawer');
    const backdrop = document.getElementById('modal-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop && !this.hasAnyOtherModalOpen()) {
      backdrop.classList.add('hidden');
    }
    this.checkBodyModalOpen();
  }

  // Categories Drawer (Mobile)
  toggleCategoriesDrawer() {
    const sidebar = document.getElementById('categories-sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      this.closeCategoriesDrawer();
    } else {
      this.openCategoriesDrawer();
    }
  }

  openCategoriesDrawer() {
    const sidebar = document.getElementById('categories-sidebar');
    const backdrop = document.getElementById('modal-backdrop');
    this.closeFilters();
    if (sidebar) sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.remove('hidden');
    this.checkBodyModalOpen();
  }

  closeCategoriesDrawer() {
    const sidebar = document.getElementById('categories-sidebar');
    const backdrop = document.getElementById('modal-backdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop && !this.hasAnyOtherModalOpen()) {
      backdrop.classList.add('hidden');
    }
    this.checkBodyModalOpen();
  }

  toggleCategoryAccordion(catId, event) {
    toggleCategoryAccordion(catId, event);
  }

  clearCategorySearch() {
    filterCategoriesInSidebar('');
  }

  clearPriceFilter() {
    state.setFilter('min_price', null);
    state.setFilter('max_price', null);
  }

  hasAnyOtherModalOpen() {
    const hasModals = document.querySelectorAll('.modal-container:not(.hidden)').length > 0;
    const hasCart = document.getElementById('cart-drawer')?.classList.contains('open');
    const hasFilters = document.getElementById('filters-drawer')?.classList.contains('open');
    const hasMobileCats = document.getElementById('categories-sidebar')?.classList.contains('mobile-open');
    return hasModals || hasCart || hasFilters || hasMobileCats;
  }

  checkBodyModalOpen() {
    if (this.hasAnyOtherModalOpen()) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }

  filterByCategory(catId) {
    state.setFilter('category', catId ? parseInt(catId, 10) : null);
    this.closeCategoriesDrawer();
    const catalog = document.getElementById('catalog');
    if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
  }

  toggleSeasonalCategory(catId) {
    const currentCatId = state.filters.category ? parseInt(state.filters.category, 10) : null;
    const targetId = parseInt(catId, 10);
    if (currentCatId === targetId) {
      this.filterByCategory(null);
    } else {
      this.filterByCategory(targetId);
    }
  }

  filterByBestsellers() {
    state.setFilter('is_bestseller', 1);
    const catalog = document.getElementById('catalog');
    if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
  }

  clearSkillFilter() {
    state.setFilter('skill', null);
  }

  resetFacetFilters() {
    state.setFilter('in_stock', false);
    state.setFilter('age_groups', []);
    state.setFilter('materials', []);
    state.setFilter('brands', []);
    state.setFilter('skill', null);
    state.setFilter('min_price', null);
    state.setFilter('max_price', null);
    state.setFilter('q', '');
    const searchInput = document.getElementById('header-search-input');
    if (searchInput) searchInput.value = '';
    this.closeFilters();
  }

  resetFilters() {
    state.resetFilters();
    this.closeFilters();
    this.closeCategoriesDrawer();
  }

  openProductModal(productId) {
    openProductModal(productId);
    this.checkBodyModalOpen();
  }

  async loadHeroShowcase() {
    try {
      const hypeSkus = ['306141', '306140', '306169', '306392', '278359'];
      let topProduct = null;

      for (const sku of hypeSkus) {
        try {
          const res = await api.getCatalog({ q: sku, in_stock: 1, limit: 1 });
          if (res && res.products && res.products.length) {
            topProduct = res.products[0];
            break;
          }
        } catch (e) {}
      }

      if (!topProduct) {
        try {
          const res = await api.getCatalog({ in_stock: 1, min_price: 150, sort: 'popular', limit: 1 });
          if (res && res.products && res.products.length) {
            topProduct = res.products[0];
          }
        } catch (e) {}
      }

      if (topProduct) {
        const card = document.getElementById('hero-showcase-card');
        const img = document.getElementById('hero-showcase-img');
        const brand = document.getElementById('hero-showcase-brand');
        const title = document.getElementById('hero-showcase-title');
        const price = document.getElementById('hero-showcase-price');
        const chip1 = document.getElementById('hero-showcase-chip1');
        const chip2 = document.getElementById('hero-showcase-chip2');

        if (card) {
          card.onclick = () => window.app.openProductModal(topProduct.id);
        }
        if (img && Array.isArray(topProduct.images) && topProduct.images[0]) {
          img.src = topProduct.images[0];
          img.alt = topProduct.title_uk;
        }
        const rawShowcaseBrand = (topProduct.brand || '').trim();
        const displayShowcaseBrand = (!rawShowcaseBrand || /тойсі|toysi/i.test(rawShowcaseBrand)) ? 'MIC' : rawShowcaseBrand;
        if (brand) brand.textContent = displayShowcaseBrand;
        if (title) title.textContent = topProduct.title_uk;
        if (price) price.textContent = `${topProduct.price} грн`;
        if (chip1) chip1.textContent = topProduct.age_group ? `👶 ${topProduct.age_group}` : '🔥 Хіт';
        if (chip2) chip2.textContent = topProduct.stock_quantity > 0 ? `📦 В наявності (${topProduct.stock_quantity} шт)` : '📦 В наявності';
      }
    } catch (err) {
      console.warn("Could not load dynamic hero showcase:", err);
    }
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
    if (backdrop && !this.hasAnyOtherModalOpen()) {
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
    if (backdrop && !this.hasAnyOtherModalOpen()) {
      backdrop.classList.add('hidden');
    }
    this.checkBodyModalOpen();
  }

  closeAllModals() {
    this.closeCart();
    this.closeModal();
    this.closeFilters();
    this.closeCategoriesDrawer();
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
