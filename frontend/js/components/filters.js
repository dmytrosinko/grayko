import { state } from '../state.js';

export function renderCategoryPills(categories = []) {
  const container = document.getElementById('category-pills');
  if (!container) return;

  const currentCat = state.filters.category;

  const allPill = `
    <button class="category-nav-pill ${!currentCat ? 'active' : ''}" onclick="window.app.filterByCategory(null)">
      <span>🧸</span> Усі іграшки
    </button>
  `;

  // Show top-level root categories in navigation pills
  const rootCategories = categories.filter(cat => !cat.parent_id);

  const pillsHtml = rootCategories.map(cat => `
    <button class="category-nav-pill ${currentCat == cat.id ? 'active' : ''}" onclick="window.app.filterByCategory(${cat.id})">
      <span>${cat.icon || '📦'}</span> ${cat.name_uk}
    </button>
  `).join('');

  container.innerHTML = allPill + pillsHtml;
}

export function renderFiltersSidebar(facets = {}) {
  const sidebar = document.getElementById('filters-sidebar');
  if (!sidebar) return;

  const { age_groups = [], materials = [], brands = [], skills = [], min_price = 0, max_price = 2000 } = facets;

  sidebar.innerHTML = `
    <div class="filter-header-row">
      <h3>Фільтри</h3>
      <div style="display: flex; align-items: center; gap: 12px;">
        <button class="btn-reset-filters" onclick="window.app.resetFilters()">Скинути</button>
        <button class="mobile-filter-close-btn" onclick="window.app.closeFilters()" aria-label="Закрити фільтри">✕</button>
      </div>
    </div>

    <!-- In Stock Only -->
    <div class="filter-group">
      <label class="custom-checkbox" style="font-weight: 700;">
        <input type="checkbox" id="filter-in-stock" ${state.filters.in_stock ? 'checked' : ''}>
        <span>Тільки в наявності</span>
      </label>
    </div>

    <!-- Age Groups -->
    <div class="filter-group">
      <div class="filter-group-title">
        <span>Вікова категорія</span>
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

    <!-- Materials -->
    <div class="filter-group">
      <div class="filter-group-title">
        <span>Матеріал</span>
      </div>
      <div class="filter-options-list">
        ${materials.map(mat => `
          <label class="custom-checkbox">
            <input type="checkbox" class="filter-mat-cb" value="${mat}" ${state.filters.materials.includes(mat) ? 'checked' : ''}>
            <span>${mat.charAt(0).toUpperCase() + mat.slice(1)}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <!-- Brands -->
    <div class="filter-group">
      <div class="filter-group-title">
        <span>Бренд</span>
      </div>
      <div class="filter-options-list">
        ${brands.map(brand => `
          <label class="custom-checkbox">
            <input type="checkbox" class="filter-brand-cb" value="${brand}" ${state.filters.brands.includes(brand) ? 'checked' : ''}>
            <span>${brand}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <!-- Skills Developed (Faceted) -->
    <div class="filter-group">
      <div class="filter-group-title">
        <span>Розвиток навичок</span>
      </div>
      <div class="filter-options-list">
        ${skills.map(sk => `
          <label class="custom-checkbox">
            <input type="radio" name="skill_filter" value="${sk}" ${state.filters.skill === sk ? 'checked' : ''} class="filter-skill-rb">
            <span>${sk}</span>
          </label>
        `).join('')}
        ${state.filters.skill ? `
          <button style="font-size:11px; color:#FF5A5F; text-align:left; font-weight:700;" onclick="window.app.clearSkillFilter()">✕ Скинути навичку</button>
        ` : ''}
      </div>
    </div>

    <!-- Price Range -->
    <div class="filter-group" style="border-bottom: none;">
      <div class="filter-group-title">
        <span>Ціна, грн</span>
      </div>
      <div class="price-inputs-row">
        <input type="number" id="price-min" class="price-field" placeholder="${min_price}" value="${state.filters.min_price || ''}">
        <span>—</span>
        <input type="number" id="price-max" class="price-field" placeholder="${max_price}" value="${state.filters.max_price || ''}">
      </div>
      <button class="btn btn-outline btn-sm btn-block" style="margin-top: 10px;" id="btn-apply-price">Застосувати ціну</button>
    </div>

    <div class="mobile-filter-apply-wrapper">
      <button class="btn btn-primary btn-block" onclick="window.app.closeFilters()">
        Показати результати ✨
      </button>
    </div>
  `;

  // Attach Event Listeners
  document.getElementById('filter-in-stock').addEventListener('change', (e) => {
    state.setFilter('in_stock', e.target.checked);
  });

  document.querySelectorAll('.filter-age-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      state.toggleArrayFilter('age_groups', e.target.value);
    });
  });

  document.querySelectorAll('.filter-mat-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      state.toggleArrayFilter('materials', e.target.value);
    });
  });

  document.querySelectorAll('.filter-brand-cb').forEach(cb => {
    cb.addEventListener('change', (e) => {
      state.toggleArrayFilter('brands', e.target.value);
    });
  });

  document.querySelectorAll('.filter-skill-rb').forEach(rb => {
    rb.addEventListener('change', (e) => {
      state.setFilter('skill', e.target.value);
    });
  });

  document.getElementById('btn-apply-price').addEventListener('click', () => {
    const min = document.getElementById('price-min').value;
    const max = document.getElementById('price-max').value;
    state.setFilter('min_price', min ? parseFloat(min) : null);
    state.setFilter('max_price', max ? parseFloat(max) : null);
  });
}

export function renderActiveFilterChips() {
  const container = document.getElementById('active-filter-chips');
  const countBadge = document.getElementById('mobile-filter-count');
  if (!container) return;

  const chips = [];
  let totalActive = 0;

  if (state.filters.in_stock) {
    chips.push({ label: 'В наявності', remove: () => state.setFilter('in_stock', false) });
    totalActive++;
  }

  state.filters.age_groups.forEach(ag => {
    chips.push({ label: `Вік: ${ag}`, remove: () => state.toggleArrayFilter('age_groups', ag) });
    totalActive++;
  });

  state.filters.materials.forEach(mat => {
    chips.push({ label: `Матеріал: ${mat}`, remove: () => state.toggleArrayFilter('materials', mat) });
    totalActive++;
  });

  state.filters.brands.forEach(b => {
    chips.push({ label: `Бренд: ${b}`, remove: () => state.toggleArrayFilter('brands', b) });
    totalActive++;
  });

  if (state.filters.skill) {
    chips.push({ label: `Навичка: ${state.filters.skill}`, remove: () => state.setFilter('skill', null) });
    totalActive++;
  }

  if (state.filters.min_price || state.filters.max_price) {
    chips.push({
      label: `Ціна: ${state.filters.min_price || 0} - ${state.filters.max_price || 'max'} грн`,
      remove: () => {
        state.setFilter('min_price', null);
        state.setFilter('max_price', null);
      }
    });
    totalActive++;
  }

  if (countBadge) countBadge.textContent = totalActive;

  if (!chips.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = chips.map((chip, idx) => `
    <div class="filter-chip">
      <span>${chip.label}</span>
      <span class="chip-remove" data-chip-idx="${idx}">✕</span>
    </div>
  `).join('') + `
    <button style="font-size: 12px; font-weight: 700; color: #FF5A5F; margin-left: 4px;" onclick="window.app.resetFilters()">Очистити всі</button>
  `;

  container.querySelectorAll('.chip-remove').forEach((btn, idx) => {
    btn.addEventListener('click', () => chips[idx].remove());
  });
}
