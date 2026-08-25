import { state } from '../state.js';
import { api } from '../api.js';

export function initHeader() {
  const headerEl = document.getElementById('main-header');
  if (!headerEl) return;

  headerEl.innerHTML = `
    <div class="container header-container">
      <a href="/" class="logo-wrapper" onclick="event.preventDefault(); window.app.resetFilters();">
        <span class="logo-icon">🧸</span>
        <span class="logo-text">GRAYKO <span>TOYS</span></span>
      </a>

      <!-- Search with Live Suggest -->
      <div class="header-search">
        <div class="search-input-wrapper">
          <span class="search-icon-btn">🔍</span>
          <input type="text" id="header-search-input" class="search-input" placeholder="Пошук (наприклад: Ugears, сортер, 3D пазл, містечко)..." autocomplete="off">
          <button id="search-clear-btn" class="search-clear-btn hidden">✕</button>
        </div>
        <div id="search-dropdown" class="search-results-dropdown hidden"></div>
      </div>

      <!-- Action Buttons -->
      <div class="header-actions">
        <button class="header-action-btn cart-header-btn" onclick="window.app.openCart()">
          <span>🛒</span>
          <span class="btn-text">Кошик</span>
          <span class="cart-count-badge" id="header-cart-count">0</span>
        </button>
      </div>
    </div>
  `;

  // Search input listeners
  const input = document.getElementById('header-search-input');
  const dropdown = document.getElementById('search-dropdown');
  const clearBtn = document.getElementById('search-clear-btn');

  let debounceTimer;

  input.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    clearBtn.classList.toggle('hidden', !val);

    clearTimeout(debounceTimer);
    if (!val) {
      dropdown.classList.add('hidden');
      state.setFilter('q', '');
      return;
    }

    debounceTimer = setTimeout(async () => {
      state.setFilter('q', val);
      const data = await api.getCatalog({ q: val });
      renderSearchDropdown(data.products || [], dropdown);
    }, 250);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    dropdown.classList.add('hidden');
    state.setFilter('q', '');
  });

  // Close search dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header-search')) {
      dropdown.classList.add('hidden');
    }
  });

  // Sync Cart badge
  const updateCartBadge = () => {
    const count = state.getCartCount();
    const badge = document.getElementById('header-cart-count');
    if (badge) badge.textContent = count;
    document.querySelectorAll('.cart-count-badge').forEach(el => el.textContent = count);
  };

  state.on('cart_updated', updateCartBadge);
  updateCartBadge();
}

function renderSearchDropdown(products, container) {
  if (!products.length) {
    container.innerHTML = `<div style="padding: 12px; font-size: 13px; color: #94A3B8; text-align: center;">Нічого не знайдено за запитом</div>`;
    container.classList.remove('hidden');
    return;
  }

  container.innerHTML = products.slice(0, 5).map(p => `
    <div class="search-item-row" onclick="window.app.openProductModal(${p.id})">
      <img src="${p.images[0] || 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100'}" class="search-thumb" alt="${p.title_uk}">
      <div class="search-info">
        <div class="search-title">${p.title_uk}</div>
        <div style="font-size: 11px; color: #64748B;">${p.brand} | ${p.age_group}</div>
      </div>
      <div class="search-price">${p.price} грн</div>
    </div>
  `).join('') + `
    <div style="padding: 8px; text-align: center; border-top: 1px solid #E2E8F0;">
      <a href="#catalog" style="font-size: 12px; font-weight: 700; color: #FF5A5F;" onclick="document.getElementById('search-dropdown').classList.add('hidden'); document.getElementById('catalog').scrollIntoView({behavior:'smooth'});">Показати всі результати (${products.length}) →</a>
    </div>
  `;

  container.classList.remove('hidden');
}
