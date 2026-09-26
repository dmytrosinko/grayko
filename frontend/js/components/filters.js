import { state } from '../state.js';

// Set of category IDs currently expanded in the sidebar accordion
const expandedCategoryIds = new Set();
let categorySearchKeyword = '';

/**
 * Helper: Find ancestral chain of categories up to the root
 */
export function getCategoryPath(catId, categories = []) {
  if (!catId) return [];
  const targetId = parseInt(catId, 10);
  const map = new Map(categories.map(c => [c.id, c]));
  const path = [];
  let curr = map.get(targetId);
  const visited = new Set();
  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    path.unshift(curr);
    curr = curr.parent_id ? map.get(curr.parent_id) : null;
  }
  return path;
}

/**
 * Toggle category accordion branch in sidebar
 */
export function toggleCategoryAccordion(catId, event) {
  if (event) event.stopPropagation();
  const id = parseInt(catId, 10);
  if (expandedCategoryIds.has(id)) {
    expandedCategoryIds.delete(id);
  } else {
    expandedCategoryIds.add(id);
  }
  renderCategoriesSidebar(state.categories);
}

/**
 * Filter categories inside the sidebar by keyword
 */
export function filterCategoriesInSidebar(keyword = '') {
  categorySearchKeyword = keyword.trim().toLowerCase();
  renderCategoriesSidebar(state.categories);
}

/**
 * Render the Categories Navigation in the Left Sidebar
 */
export function renderCategoriesSidebar(categories = []) {
  const sidebar = document.getElementById('categories-sidebar');
  if (!sidebar) return;

  const currentCatId = state.filters.category ? parseInt(state.filters.category, 10) : null;
  const currentPath = getCategoryPath(currentCatId, categories);
  const activeAncestorIds = new Set(currentPath.map(c => c.id));

  // Auto-expand active category ancestors
  activeAncestorIds.forEach(id => expandedCategoryIds.add(id));

  // Separate root and build children map
  const rootCategories = [];
  const childrenMap = new Map();

  categories.forEach(cat => {
    if (!cat.parent_id) {
      rootCategories.push(cat);
    } else {
      if (!childrenMap.has(cat.parent_id)) {
        childrenMap.set(cat.parent_id, []);
      }
      childrenMap.get(cat.parent_id).push(cat);
    }
  });

  // Calculate active facet filters count (excluding category)
  const activeFiltersCount = getActiveFiltersCount();

  // Filter root categories if search keyword exists
  const filteredRoots = categorySearchKeyword
    ? rootCategories.filter(root => {
        const matchesRoot = root.name_uk.toLowerCase().includes(categorySearchKeyword);
        const children = childrenMap.get(root.id) || [];
        const matchesChild = children.some(c => c.name_uk.toLowerCase().includes(categorySearchKeyword));
        return matchesRoot || matchesChild;
      })
    : rootCategories;

  const isAllToysActive = !currentCatId;

  sidebar.innerHTML = `
    <div class="sidebar-sticky-inner">
      <!-- Sidebar Header -->
      <div class="categories-nav-header">
        <div class="categories-nav-title">
          <span class="categories-icon">📁</span>
          <span>Каталог іграшок</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${currentCatId ? `
            <button class="btn-clear-cat-mini" onclick="window.app.filterByCategory(null)" title="Показати всі іграшки">
              Всі ✕
            </button>
          ` : ''}
          <button class="mobile-sidebar-close-btn" onclick="window.app.closeCategoriesDrawer()" aria-label="Закрити меню категорій">✕</button>
        </div>
      </div>

      <!-- Quick Category Search -->
      <div class="category-search-wrapper">
        <input 
          type="text" 
          id="category-sidebar-search" 
          class="category-search-input" 
          placeholder="Швидкий пошук категорії..." 
          value="${categorySearchKeyword}"
          autocomplete="off"
        />
        ${categorySearchKeyword ? `<button class="category-search-clear" onclick="window.app.clearCategorySearch()">✕</button>` : ''}
      </div>

      <!-- Categories Tree List -->
      <div class="category-tree-list">
        <!-- 'All Toys' top entry -->
        <button class="category-tree-item root-item ${isAllToysActive ? 'active' : ''}" onclick="window.app.filterByCategory(null)">
          <span class="cat-icon">🧸</span>
          <span class="cat-label">Усі іграшки</span>
          <span class="cat-pill-tag">Всі</span>
        </button>

        ${filteredRoots.map(root => {
          const children = childrenMap.get(root.id) || [];
          const hasChildren = children.length > 0;
          const isExpanded = expandedCategoryIds.has(root.id) || !!categorySearchKeyword;
          const isDirectActive = currentCatId === root.id;
          const isAncestorActive = activeAncestorIds.has(root.id);

          // If searching, filter children to matching ones
          const visibleChildren = categorySearchKeyword
            ? children.filter(c => c.name_uk.toLowerCase().includes(categorySearchKeyword) || root.name_uk.toLowerCase().includes(categorySearchKeyword))
            : children;

          if (!hasChildren) {
            return `
              <button class="category-tree-item root-item ${isDirectActive ? 'active' : ''}" onclick="window.app.filterByCategory(${root.id})">
                <span class="cat-icon">${root.icon || '📦'}</span>
                <span class="cat-label">${root.name_uk}</span>
              </button>
            `;
          }

          return `
            <div class="category-accordion ${isExpanded ? 'open' : ''} ${isAncestorActive ? 'active-branch' : ''}">
              <div class="category-tree-row ${isDirectActive ? 'active-direct' : ''}">
                <button class="category-tree-link ${isDirectActive ? 'active' : ''}" onclick="window.app.filterByCategory(${root.id})">
                  <span class="cat-icon">${root.icon || '📦'}</span>
                  <span class="cat-label">${root.name_uk}</span>
                </button>
                <button 
                  type="button" 
                  class="category-chevron-btn ${isExpanded ? 'rotated' : ''}" 
                  onclick="window.app.toggleCategoryAccordion(${root.id}, event)"
                  title="${isExpanded ? 'Згорнути' : 'Розгорнути'} підкатегорії"
                  aria-label="Підкатегорії ${root.name_uk}"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>

              <div class="category-sub-menu ${isExpanded ? 'open' : ''}">
                <button class="category-sub-link root-all-link ${isDirectActive ? 'active' : ''}" onclick="window.app.filterByCategory(${root.id})">
                  <span class="sub-dot">•</span> Всі ${root.name_uk}
                </button>
                ${visibleChildren.map(child => {
                  const isChildActive = currentCatId === child.id;
                  return `
                    <button class="category-sub-link ${isChildActive ? 'active' : ''}" onclick="window.app.filterByCategory(${child.id})">
                      <span class="sub-dot">•</span> ${child.name_uk}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Quick trigger for facet filters in sidebar -->
      <div class="sidebar-filters-cta">
        <button class="btn btn-outline btn-block btn-open-filters-sidebar" onclick="window.app.openFilters()">
          <span class="icon">⚡</span>
          <span>Фільтри товарів</span>
          <span class="filter-count-badge ${activeFiltersCount > 0 ? '' : 'hidden'}">${activeFiltersCount}</span>
        </button>
      </div>
    </div>
  `;

  // Attach search listener
  const searchInput = document.getElementById('category-sidebar-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterCategoriesInSidebar(e.target.value);
    });
  }

  updateCatalogHeader();
}

/**
 * Backward compatibility alias for renderCategoryPills
 */
export function renderCategoryPills(categories = []) {
  renderCategoriesSidebar(categories);
}

/**
 * Render the Faceted Filters inside the Slide-Over Drawer
 */
export function renderFiltersDrawer(facets = {}) {
  const drawer = document.getElementById('filters-drawer');
  if (!drawer) return;

  const { age_groups = [], materials = [], brands = [], skills = [], min_price = 0, max_price = 2000 } = facets;
  const activeCount = getActiveFiltersCount();

  drawer.innerHTML = `
    <!-- Drawer Header -->
    <div class="drawer-header">
      <div class="drawer-title-group">
        <span class="drawer-icon">⚡</span>
        <div>
          <h3>Фільтри товарів</h3>
          <span class="drawer-subtitle">${activeCount > 0 ? `Застосовано: ${activeCount}` : 'Швидкий підбір за параметрами'}</span>
        </div>
      </div>
      <div class="drawer-header-actions">
        <button class="btn-reset-filters" onclick="window.app.resetFacetFilters()" title="Скинути всі вибрані фільтри">Скинути</button>
        <button class="drawer-close-btn" onclick="window.app.closeFilters()" aria-label="Закрити фільтри">✕</button>
      </div>
    </div>

    <!-- Drawer Scrollable Content -->
    <div class="drawer-body">
      <!-- In Stock Filter -->
      <div class="filter-group">
        <label class="custom-switch-label">
          <input type="checkbox" id="filter-in-stock" ${state.filters.in_stock ? 'checked' : ''}>
          <span class="switch-ui"></span>
          <span class="switch-text">📦 Тільки товари в наявності</span>
        </label>
      </div>

      <!-- Price Range -->
      <div class="filter-group">
        <div class="filter-group-title">
          <span>Ціна, грн</span>
          ${state.filters.min_price || state.filters.max_price ? `<button class="filter-clear-link" onclick="window.app.clearPriceFilter()">Скинути</button>` : ''}
        </div>
        <div class="price-inputs-row">
          <div class="price-input-col">
            <span class="price-prefix">Від</span>
            <input type="number" id="price-min" class="price-field" placeholder="${min_price || 0}" value="${state.filters.min_price || ''}">
          </div>
          <span class="price-separator">—</span>
          <div class="price-input-col">
            <span class="price-prefix">До</span>
            <input type="number" id="price-max" class="price-field" placeholder="${max_price || 2000}" value="${state.filters.max_price || ''}">
          </div>
        </div>
        <button class="btn btn-outline btn-sm btn-block" style="margin-top: 10px;" id="btn-apply-price">
          Застосувати діапазон ціни
        </button>
      </div>

      <!-- Age Groups -->
      <div class="filter-group">
        <div class="filter-group-title">
          <span>👶 Вікова категорія</span>
          ${state.filters.age_groups.length ? `<span class="filter-selected-count">(${state.filters.age_groups.length})</span>` : ''}
        </div>
        <div class="filter-options-list">
          ${age_groups.map(age => `
            <label class="custom-checkbox">
              <input type="checkbox" class="filter-age-cb" value="${age}" ${state.filters.age_groups.includes(age) ? 'checked' : ''}>
              <span>${age}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Brands with search if many -->
      ${(() => {
        const validBrands = brands.filter(b => b && !/^(тойсі|toysi|країна іграшок|еко-іграшки)$/i.test(b.trim()));
        if (!validBrands.length) return '';
        return `
          <div class="filter-group">
            <div class="filter-group-title">
              <span>🏷️ Бренд</span>
              ${state.filters.brands.length ? `<span class="filter-selected-count">(${state.filters.brands.length})</span>` : ''}
            </div>
            ${validBrands.length > 7 ? `
              <div class="filter-subsearch-wrap">
                <input type="text" id="brand-filter-search" class="filter-subsearch-input" placeholder="Пошук бренду..." autocomplete="off">
              </div>
            ` : ''}
            <div class="filter-options-list" id="brand-options-list">
              ${validBrands.map(brand => `
                <label class="custom-checkbox brand-item" data-brand="${brand.toLowerCase()}">
                  <input type="checkbox" class="filter-brand-cb" value="${brand}" ${state.filters.brands.includes(brand) ? 'checked' : ''}>
                  <span>${brand}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `;
      })()}

    </div>

    <!-- Drawer Sticky Action Footer -->
    <div class="drawer-footer">
      <button class="btn btn-primary btn-block btn-apply-filters" onclick="window.app.closeFilters()">
        Показати товари ✨
      </button>
      <button class="btn btn-glass btn-block btn-reset-drawer" onclick="window.app.resetFacetFilters()">
        Очистити фільтри
      </button>
    </div>
  `;

  // Attach Event Listeners
  const inStockEl = document.getElementById('filter-in-stock');
  if (inStockEl) {
    inStockEl.addEventListener('change', (e) => {
      state.setFilter('in_stock', e.target.checked);
    });
  }

  document.querySelectorAll('.filter-age-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      state.toggleArrayFilter('age_groups', e.target.value);
    });
  });

  document.querySelectorAll('.filter-brand-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      state.toggleArrayFilter('brands', e.target.value);
    });
  });

  const applyPriceBtn = document.getElementById('btn-apply-price');
  if (applyPriceBtn) {
    applyPriceBtn.addEventListener('click', () => {
      const min = document.getElementById('price-min').value;
      const max = document.getElementById('price-max').value;
      state.setFilter('min_price', min ? parseFloat(min) : null);
      state.setFilter('max_price', max ? parseFloat(max) : null);
    });
  }

  // Brand quick search inside drawer
  const brandSearch = document.getElementById('brand-filter-search');
  if (brandSearch) {
    brandSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#brand-options-list .brand-item').forEach(item => {
        const brand = item.dataset.brand || '';
        item.style.display = !q || brand.includes(q) ? 'flex' : 'none';
      });
    });
  }

  updateFilterButtonBadges(activeCount);
}

/**
 * Backward compatibility alias for renderFiltersSidebar
 */
export function renderFiltersSidebar(facets = {}) {
  renderFiltersDrawer(facets);
}

/**
 * Calculate active facet filters count (excluding category)
 */
export function getActiveFiltersCount() {
  let count = 0;
  if (state.filters.in_stock) count++;
  if (state.filters.age_groups && state.filters.age_groups.length) count += state.filters.age_groups.length;
  if (state.filters.brands && state.filters.brands.length) count += state.filters.brands.length;
  if (state.filters.min_price != null || state.filters.max_price != null) count++;
  return count;
}

/**
 * Update Filter Badges across the UI
 */
export function updateFilterButtonBadges(count = getActiveFiltersCount()) {
  document.querySelectorAll('.filter-count-badge').forEach(badge => {
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  });
  const filterTriggerBtn = document.getElementById('btn-toggle-filters');
  if (filterTriggerBtn) {
    filterTriggerBtn.classList.toggle('has-active-filters', count > 0);
  }
}

/**
 * Render Active Filter Chips above Products Grid
 */
export function renderActiveFilterChips() {
  const container = document.getElementById('active-filter-chips');
  if (!container) return;

  const chips = [];

  // Active Category Chip
  if (state.filters.category) {
    const currentCatId = parseInt(state.filters.category, 10);
    const cat = (state.categories || []).find(c => c.id === currentCatId);
    if (cat) {
      chips.push({
        label: `📁 ${cat.name_uk}`,
        remove: () => state.setFilter('category', null)
      });
    }
  }

  // Active Search Query Chip
  if (state.filters.q) {
    chips.push({
      label: `🔍 "${state.filters.q}"`,
      remove: () => {
        state.setFilter('q', '');
        const searchInput = document.getElementById('header-search-input');
        if (searchInput) searchInput.value = '';
      }
    });
  }

  // In Stock Chip
  if (state.filters.in_stock) {
    chips.push({
      label: '📦 В наявності',
      remove: () => state.setFilter('in_stock', false)
    });
  }

  // Age Groups
  (state.filters.age_groups || []).forEach(ag => {
    chips.push({
      label: `👶 ${ag}`,
      remove: () => state.toggleArrayFilter('age_groups', ag)
    });
  });

  // Brands
  (state.filters.brands || []).forEach(b => {
    chips.push({
      label: `🏷️ ${b}`,
      remove: () => state.toggleArrayFilter('brands', b)
    });
  });

  // Price Range
  if (state.filters.min_price != null || state.filters.max_price != null) {
    chips.push({
      label: `💰 ${state.filters.min_price || 0} - ${state.filters.max_price || 'max'} грн`,
      remove: () => {
        state.setFilter('min_price', null);
        state.setFilter('max_price', null);
      }
    });
  }

  updateFilterButtonBadges();

  if (!chips.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = chips.map((chip, idx) => `
    <div class="filter-chip">
      <span>${chip.label}</span>
      <span class="chip-remove" data-chip-idx="${idx}" title="Видалити фільтр">✕</span>
    </div>
  `).join('') + `
    <button class="btn-clear-all-chips" onclick="window.app.resetFilters()">Очистити всі</button>
  `;

  container.querySelectorAll('.chip-remove').forEach((btn, idx) => {
    btn.addEventListener('click', () => chips[idx].remove());
  });
}

/**
 * Update Catalog Title and Breadcrumbs according to current category
 */
export function updateCatalogHeader() {
  const breadcrumbsEl = document.getElementById('catalog-breadcrumbs');
  const titleEl = document.getElementById('catalog-title');

  const currentCatId = state.filters.category ? parseInt(state.filters.category, 10) : null;
  const path = getCategoryPath(currentCatId, state.categories || []);

  if (breadcrumbsEl) {
    if (!path.length) {
      breadcrumbsEl.innerHTML = `
        <span class="crumb-item active">Головна</span>
        <span class="crumb-sep">/</span>
        <span class="crumb-item current">Каталог іграшок</span>
      `;
    } else {
      const crumbsHtml = path.map((cat, idx) => {
        const isLast = idx === path.length - 1;
        if (isLast) {
          return `<span class="crumb-item current">${cat.name_uk}</span>`;
        }
        return `
          <button class="crumb-link" onclick="window.app.filterByCategory(${cat.id})">${cat.name_uk}</button>
          <span class="crumb-sep">/</span>
        `;
      }).join('');

      breadcrumbsEl.innerHTML = `
        <button class="crumb-link" onclick="window.app.filterByCategory(null)">Каталог</button>
        <span class="crumb-sep">/</span>
        ${crumbsHtml}
      `;
    }
  }

  if (titleEl) {
    if (!path.length) {
      titleEl.innerHTML = `Каталог дитячих іграшок`;
    } else {
      const currentCat = path[path.length - 1];
      titleEl.innerHTML = `<span>${currentCat.icon || '📦'}</span> ${currentCat.name_uk}`;
    }
  }

  // Check if a modal is currently open (product modal has precedence)
  const productModal = document.getElementById('product-modal');
  const isProductModalOpen = productModal && !productModal.classList.contains('hidden');

  if (!isProductModalOpen) {
    const descMeta = document.querySelector('meta[name="description"]');
    const canonicalLink = document.getElementById('canonical-url');

    if (path.length > 0) {
      const activeCat = path[path.length - 1];
      document.title = `${activeCat.name_uk} — купити в інтернет-магазині GRAYKO TOYS`;
      if (descMeta) {
        descMeta.setAttribute('content', `Купити ${activeCat.name_uk.toLowerCase()} в інтернет-магазині GRAYKO. Великий вибір якісних дитячих іграшок, швидка доставка Новою Поштою за 1-2 дні по всій Україні, гарантія якості.`);
      }
      if (canonicalLink) {
        canonicalLink.setAttribute('href', `https://grayko.ua/?category=${activeCat.id}`);
      }
      if (window.location.search !== `?category=${activeCat.id}`) {
        window.history.replaceState({ category: activeCat.id }, '', `${window.location.pathname}?category=${activeCat.id}`);
      }
    } else if (state.filters.q) {
      document.title = `Пошук "${state.filters.q}" — інтернет-магазин дитячих іграшок GRAYKO`;
      if (descMeta) {
        descMeta.setAttribute('content', `Результати пошуку за запитом "${state.filters.q}" в інтернет-магазині GRAYKO TOYS. Швидка доставка Новою Поштою по всій Україні.`);
      }
      window.history.replaceState({ q: state.filters.q }, '', `${window.location.pathname}?q=${encodeURIComponent(state.filters.q)}`);
    } else {
      document.title = `GRAYKO | Інтернет-магазин дитячих іграшок в Україні — купити іграшки за найкращими цінами`;
      if (descMeta) {
        descMeta.setAttribute('content', `Купити якісні дитячі іграшки в інтернет-магазині GRAYKO з швидкою доставкою по всій Україні: радіокеровані машинки, розвиваючі набори Монтессорі, ляльки, конструктори, настільні ігри та творчість. Офіційні ціни, гарантія якості.`);
      }
      if (canonicalLink) {
        canonicalLink.setAttribute('href', `https://grayko.ua/`);
      }
      if (window.location.search && !window.location.search.includes('product=')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    // Update Schema.org BreadcrumbList
    const breadcrumbSchemaEl = document.getElementById('breadcrumb-schema');
    if (breadcrumbSchemaEl) {
      const listElements = [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Головна",
          "item": "https://grayko.ua/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Каталог іграшок",
          "item": "https://grayko.ua/#catalog"
        }
      ];
      path.forEach((cat, idx) => {
        listElements.push({
          "@type": "ListItem",
          "position": 3 + idx,
          "name": cat.name_uk,
          "item": `https://grayko.ua/?category=${cat.id}`
        });
      });
      breadcrumbSchemaEl.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": listElements
      }, null, 2);
    }
  }
}
