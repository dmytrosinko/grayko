import { state } from '../state.js';
import { api } from '../api.js';

const POPULAR_CITIES = [
  { name: 'Київ', ref: '8d5a980d-391c-11dd-90d9-001a92567626', present: 'м. Київ, Київська обл.' },
  { name: 'Дніпро', ref: 'db5c88f0-391c-11dd-90d9-001a92567626', present: 'м. Дніпро, Дніпропетровська обл.' },
  { name: 'Львів', ref: 'db5c88f5-391c-11dd-90d9-001a92567626', present: 'м. Львів, Львівська обл.' },
  { name: 'Харків', ref: 'db5c88e0-391c-11dd-90d9-001a92567626', present: 'м. Харків, Харківська обл.' },
  { name: 'Одеса', ref: 'db5c88d0-391c-11dd-90d9-001a92567626', present: 'м. Одеса, Одеська обл.' },
  { name: 'Запоріжжя', ref: 'db5c88c6-391c-11dd-90d9-001a92567626', present: 'м. Запоріжжя, Запорізька обл.' }
];

export async function openCheckoutModal() {
  const modalContainer = document.getElementById('checkout-modal');
  const backdrop = document.getElementById('modal-backdrop');
  if (!modalContainer || !backdrop) return;

  const cartItems = state.cart;
  if (!cartItems.length) {
    alert("Кошик порожній");
    return;
  }

  modalContainer.innerHTML = `
    <div style="padding: 40px; text-align: center;">
      <div class="spinner"></div>
      <p style="margin-top: 12px; color: #64748B;">Підготовка оформлення замовлення...</p>
    </div>
  `;
  modalContainer.classList.remove('hidden');
  backdrop.classList.remove('hidden');

  const calcData = await api.calculateCart(cartItems);
  const { shipments = [], total_products = 0, total_shipping = 0, total_packing = 0, grand_total = 0, is_split_order = false } = calcData;

  // Initial Nova Poshta state (default Kyiv)
  let selectedCity = 'м. Київ, Київська обл.';
  let selectedCityRef = '8d5a980d-391c-11dd-90d9-001a92567626';
  let allWarehouses = [];
  let filteredWarehouses = [];
  let selectedWarehouse = '';
  let selectedWarehouseRef = '';
  let selectedWarehouseCategory = 'Branch';
  let currentCategoryFilter = 'ALL';
  let currentWhSearch = '';
  let citySearchDebounceTimer = null;

  modalContainer.innerHTML = `
    <div class="modal-header">
      <div>
        <h2 style="font-size: 20px;">Оформлення замовлення Новою Поштою</h2>
        <span style="font-size: 12px; color: #64748B;">Швидка доставка по всій Україні зі складів відвантаження</span>
      </div>
      <button class="btn-close-drawer" onclick="window.app.closeModal()">✕</button>
    </div>

    <div class="modal-body">
      <!-- Order Split Alert if multiple suppliers -->
      ${is_split_order ? `
        <div style="background: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; color: #92400E;">
          <strong>📦 Ваше замовлення буде відправлено ${shipments.length} окремими посилками:</strong>
          <ul style="margin: 6px 0 0 18px;">
            ${shipments.map(s => {
              const clean = (s.supplier_name || 'Центральний склад').replace(/тойсі|toysi/gi, '').trim();
              const name = clean.toLowerCase().includes((s.warehouse_city || '').toLowerCase()) ? clean : `${clean} (м. ${s.warehouse_city})`;
              return `<li>${name} — ${s.items.length} тов.</li>`;
            }).join('')}
          </ul>
          <small>Для кожного відправлення автоматично генерується окрема ТТН Нової Пошти.</small>
        </div>
      ` : ''}

      <form id="checkout-form">
        <!-- 1. Контактні дані -->
        <h4 style="font-size: 15px; margin-bottom: 12px; color: #0F172A;">1. Контактні дані одержувача</h4>
        <div class="form-row-2col">
          <div class="form-group">
            <label class="form-label">Прізвище та Ім'я *</label>
            <input type="text" id="chk-name" class="form-input" placeholder="Коваленко Олена" required>
          </div>
          <div class="form-group">
            <label class="form-label">Телефон *</label>
            <input type="tel" id="chk-phone" class="form-input" placeholder="+38 (067) 123-45-67" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Email (для отримання електронного чека)</label>
          <input type="email" id="chk-email" class="form-input" placeholder="olena@example.com">
        </div>

        <!-- 2. Доставка Новою Поштою (Інтерактивний селектор) -->
        <div class="np-selector-card" id="np-selector-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h4 style="font-size: 15px; margin: 0; color: #0F172A; display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 18px;">📦</span> 2. Доставка Нова Пошта
            </h4>
            <span style="font-size: 11px; background: #fee2e2; color: #b91c1c; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
              Відділення та Поштомати
            </span>
          </div>

          <!-- Пошук населеного пункту -->
          <div class="form-group" style="position: relative; margin-bottom: 12px;">
            <label class="np-field-label">
              <span>📍 Населений пункт *</span>
            </label>
            <div class="np-search-box">
              <span class="np-search-icon-left">🔍</span>
              <input
                type="text"
                id="np-city-input"
                class="np-search-input"
                placeholder="Введіть назву міста чи села (напр. Київ, Львів, Буча...)"
                value="${selectedCity}"
                autocomplete="off"
              />
              <span id="np-city-spinner" class="np-spinner-right" style="display: none;"></span>
              <button type="button" id="np-city-clear" class="np-btn-clear" title="Очистити поле міста">✕</button>
            </div>

            <!-- Швидкі популярні міста -->
            <div class="np-popular-chips">
              <span class="np-popular-label">Популярні:</span>
              ${POPULAR_CITIES.map(pop => `
                <button
                  type="button"
                  class="np-chip-btn ${selectedCityRef === pop.ref ? 'active' : ''}"
                  data-city-name="${pop.name}"
                  data-city-present="${pop.present}"
                  data-city-ref="${pop.ref}"
                >
                  ${pop.name}
                </button>
              `).join('')}
            </div>

            <!-- Випадаючий список автодоповнення населених пунктів -->
            <div id="np-city-dropdown" class="np-autocomplete-dropdown" style="display: none;"></div>
          </div>

          <!-- Блок вибору відділення або поштомату -->
          <div class="np-warehouse-section" id="np-warehouse-section">
            <div class="np-wh-header">
              <label class="np-field-label" style="margin-bottom: 0;">
                <span>🏢 Оберіть відділення або поштомат *</span>
              </label>

              <!-- Вкладки фільтрації: Всі / Відділення / Поштомати -->
              <div class="np-filter-tabs">
                <button type="button" class="np-filter-tab active" data-tab="ALL">Всі</button>
                <button type="button" class="np-filter-tab" data-tab="Branch">🏢 Відділення</button>
                <button type="button" class="np-filter-tab" data-tab="Postomat">📦 Поштомати</button>
              </div>
            </div>

            <!-- Пошук всередині списку відділень (якщо їх більше 8) -->
            <div id="np-wh-search-container" style="display: none; margin-bottom: 8px;">
              <input
                type="text"
                id="np-wh-search-input"
                class="np-wh-search-input"
                placeholder="Пошук за номером або вулицею (напр. 15, Шевченка)..."
              />
            </div>

            <!-- Контейнер для select або статусу завантаження -->
            <div id="np-wh-content">
              <select id="chk-warehouse" class="np-wh-select">
                <option value="">-- Оберіть відділення або поштомат --</option>
              </select>
            </div>

            <!-- Картка-бейдж обраного відділення -->
            <div id="np-selected-badge-wrap" style="display: none;"></div>
          </div>
        </div>

        <!-- 3. Спосіб оплати -->
        <h4 style="font-size: 15px; margin: 20px 0 12px; color: #0F172A;">3. Спосіб оплати</h4>
        <div class="payment-options-grid" style="margin-bottom: 20px;">
          <label class="payment-card-option selected" style="cursor: default;">
            <input type="radio" name="payment_method" value="IBAN_REQUISITES" checked style="display:none;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <div style="font-weight: 800; font-size: 14px; color: #0F172A;">📋 Оплата за реквізитами (IBAN / картка після узгодження)</div>
              <span style="background: #ECFDF5; color: #059669; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">Передоплата</span>
            </div>
            <small style="color: #64748B; display: block; line-height: 1.4;">
              Менеджер зв'яжеться з вами у Viber / Telegram або за телефоном та надішле офіційні банківські реквізити для оплати після перевірки наявності.
            </small>
          </label>
        </div>

        <!-- Коментар -->
        <div class="form-group">
          <label class="form-label">Коментар до замовлення</label>
          <textarea id="chk-comment" class="form-textarea" rows="2" placeholder="Побажання щодо пакування або часу дзвінка..."></textarea>
        </div>

        <!-- Разом & Підтвердження -->
        <div style="background: #F8FAFC; border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0; margin-top: 20px;">
          <div class="summary-row">
            <span>Вартість товарів:</span>
            <strong>${total_products} грн</strong>
          </div>
          <div class="summary-row">
            <span>Доставка Новою Поштою:</span>
            <strong>~${total_shipping} грн</strong>
          </div>
          ${total_packing > 0 ? `
            <div class="summary-row" style="color:#B45309;">
              <span>Збір/пакування:</span>
              <strong>+${total_packing} грн</strong>
            </div>
          ` : ''}
          <div class="summary-row total-row">
            <span>До сплати:</span>
            <strong style="color: #FF5A5F; font-size: 22px;">${grand_total} грн</strong>
          </div>

          <button type="submit" id="btn-submit-order" class="btn btn-primary btn-block btn-lg" style="margin-top: 16px;">
            Підтвердити замовлення (${grand_total} грн) 🚀
          </button>
        </div>
      </form>
    </div>
  `;

  // DOM Elements
  const cityInput = document.getElementById('np-city-input');
  const citySpinner = document.getElementById('np-city-spinner');
  const cityClearBtn = document.getElementById('np-city-clear');
  const cityDropdown = document.getElementById('np-city-dropdown');
  const whContent = document.getElementById('np-wh-content');
  const whSearchContainer = document.getElementById('np-wh-search-container');
  const whSearchInput = document.getElementById('np-wh-search-input');
  const selectedBadgeWrap = document.getElementById('np-selected-badge-wrap');
  const filterTabs = document.querySelectorAll('.np-filter-tab');
  const popularChips = document.querySelectorAll('.np-chip-btn');

  // Helper: Render selected warehouse preview badge
  function renderSelectedWarehouseBadge(wh) {
    if (!wh) {
      selectedBadgeWrap.style.display = 'none';
      selectedBadgeWrap.innerHTML = '';
      return;
    }

    const isPostomat = wh.category === 'Postomat';
    const icon = isPostomat ? '📦' : '🏢';
    const maxWeightText = wh.maxWeight ? `(до ${wh.maxWeight} кг)` : '';

    selectedBadgeWrap.style.display = 'block';
    selectedBadgeWrap.innerHTML = `
      <div class="np-selected-badge">
        <div style="display: flex; gap: 10px; align-items: flex-start;">
          <span style="font-size: 20px; line-height: 1;">${icon}</span>
          <div>
            <div class="np-selected-badge-title">${wh.description}</div>
            <div class="np-selected-badge-desc">
              ${wh.shortAddress ? wh.shortAddress + ' ' : ''}${maxWeightText}
            </div>
          </div>
        </div>
        <span class="np-selected-pill">✓ Обрано</span>
      </div>
    `;
  }

  // Helper: Apply category and search filter to warehouses list
  function applyWarehouseFilter() {
    if (!allWarehouses || allWarehouses.length === 0) {
      whContent.innerHTML = `
        <div class="np-status-box np-status-empty">
          <span>⚠️ У даному населеному пункті не знайдено відділень або спробуйте уточнити назву міста.</span>
        </div>
      `;
      renderSelectedWarehouseBadge(null);
      return;
    }

    // Filter by Category ('ALL', 'Branch', 'Postomat')
    let result = allWarehouses;
    if (currentCategoryFilter === 'Branch') {
      result = result.filter(w => w.category === 'Branch');
    } else if (currentCategoryFilter === 'Postomat') {
      result = result.filter(w => w.category === 'Postomat');
    }

    // Filter by Search text inside warehouses (number or street)
    if (currentWhSearch.trim()) {
      const qLower = currentWhSearch.trim().toLowerCase();
      result = result.filter(w =>
        (w.description && w.description.toLowerCase().includes(qLower)) ||
        (w.number && w.number.toString().includes(qLower)) ||
        (w.shortAddress && w.shortAddress.toLowerCase().includes(qLower))
      );
    }

    filteredWarehouses = result;

    if (filteredWarehouses.length === 0) {
      whContent.innerHTML = `
        <div class="np-status-box np-status-empty">
          <span>🔍 За вашим запитом/фільтром нічого не знайдено. Спробуйте змінити фільтр.</span>
        </div>
      `;
      renderSelectedWarehouseBadge(null);
      return;
    }

    // Render `<select id="chk-warehouse">`
    whContent.innerHTML = `
      <select id="chk-warehouse" class="np-wh-select">
        <option value="">-- Оберіть відділення або поштомат (${filteredWarehouses.length}) --</option>
        ${filteredWarehouses.map(w => {
          const isSelected = selectedWarehouse === w.description ? 'selected' : '';
          return `<option value="${w.description}" ${isSelected}>${w.description}</option>`;
        }).join('')}
      </select>
    `;

    const whSelect = document.getElementById('chk-warehouse');
    whSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      const found = filteredWarehouses.find(w => w.description === val);
      if (found) {
        selectedWarehouse = found.description;
        selectedWarehouseRef = found.ref;
        selectedWarehouseCategory = found.category;
        renderSelectedWarehouseBadge(found);
      } else {
        selectedWarehouse = '';
        selectedWarehouseRef = '';
        renderSelectedWarehouseBadge(null);
      }
    });

    // If previously selected warehouse is in this filtered list, keep badge visible
    const existing = filteredWarehouses.find(w => w.description === selectedWarehouse);
    if (existing) {
      whSelect.value = existing.description;
      renderSelectedWarehouseBadge(existing);
    } else {
      renderSelectedWarehouseBadge(null);
    }
  }

  // Helper: Fetch warehouses for chosen city
  async function loadWarehouses(cityRef, cityName) {
    if (!cityRef && !cityName) {
      allWarehouses = [];
      applyWarehouseFilter();
      return;
    }

    whContent.innerHTML = `
      <div class="np-status-box np-status-loading">
        <div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
        <span>Завантаження списку відділень Нової Пошти...</span>
      </div>
    `;
    selectedWarehouse = '';
    selectedWarehouseRef = '';
    renderSelectedWarehouseBadge(null);

    try {
      const data = await api.getWarehouses({ cityRef, cityName });
      allWarehouses = data.warehouses || [];

      // Update Tab Counts
      const totalCount = allWarehouses.length;
      const branchCount = allWarehouses.filter(w => w.category === 'Branch').length;
      const postomatCount = allWarehouses.filter(w => w.category === 'Postomat').length;

      filterTabs.forEach(tab => {
        const type = tab.getAttribute('data-tab');
        if (type === 'ALL') tab.textContent = `Всі (${totalCount})`;
        if (type === 'Branch') tab.textContent = `🏢 Відділення (${branchCount})`;
        if (type === 'Postomat') tab.textContent = `📦 Поштомати (${postomatCount})`;
      });

      // Show warehouse search bar if > 8 warehouses
      if (allWarehouses.length > 8) {
        whSearchContainer.style.display = 'block';
        if (whSearchInput) whSearchInput.value = '';
        currentWhSearch = '';
      } else {
        whSearchContainer.style.display = 'none';
      }

      applyWarehouseFilter();
    } catch (err) {
      console.error("Error loading warehouses:", err);
      whContent.innerHTML = `
        <div class="np-status-box np-status-empty">
          <span>Помилка завантаження відділень. Будь ласка, спробуйте ще раз.</span>
        </div>
      `;
    }
  }

  // Helper: Select City
  function selectCity(cityName, cityPresent, cityRef) {
    selectedCity = cityPresent || cityName;
    selectedCityRef = cityRef || '';
    cityInput.value = selectedCity;
    cityDropdown.style.display = 'none';
    cityDropdown.innerHTML = '';

    // Update active state on popular city chips
    popularChips.forEach(chip => {
      const chipRef = chip.getAttribute('data-city-ref');
      const chipName = chip.getAttribute('data-city-name');
      if ((cityRef && chipRef === cityRef) || (cityName && chipName.toLowerCase() === cityName.toLowerCase())) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    loadWarehouses(selectedCityRef, selectedCity);
  }

  // City Input: Debounced search settlements
  cityInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (citySearchDebounceTimer) clearTimeout(citySearchDebounceTimer);

    if (val.length < 2) {
      cityDropdown.style.display = 'none';
      cityDropdown.innerHTML = '';
      citySpinner.style.display = 'none';
      return;
    }

    citySpinner.style.display = 'block';
    citySearchDebounceTimer = setTimeout(async () => {
      try {
        const data = await api.searchCities(val);
        citySpinner.style.display = 'none';
        const cities = data.cities || [];

        if (cities.length === 0) {
          cityDropdown.innerHTML = `
            <div style="padding: 12px; font-size: 12.5px; color: #64748B; text-align: center;">
              Населений пункт не знайдено. Перевірте правильність написання.
            </div>
          `;
          cityDropdown.style.display = 'block';
          return;
        }

        cityDropdown.innerHTML = cities.map(c => `
          <div class="np-autocomplete-item" data-city-ref="${c.ref}" data-city-name="${c.name}" data-city-present="${c.present}">
            <div>
              <span class="np-autocomplete-item-main">${c.present || c.name}</span>
            </div>
            ${selectedCityRef === c.ref ? '<span style="color:#10B981; font-weight:800;">✓</span>' : ''}
          </div>
        `).join('');

        cityDropdown.style.display = 'block';

        // Bind clicks on autocomplete items
        cityDropdown.querySelectorAll('.np-autocomplete-item').forEach(item => {
          item.addEventListener('click', () => {
            const ref = item.getAttribute('data-city-ref');
            const name = item.getAttribute('data-city-name');
            const present = item.getAttribute('data-city-present');
            selectCity(name, present, ref);
          });
        });
      } catch (err) {
        console.error("City search error:", err);
        citySpinner.style.display = 'none';
      }
    }, 300);
  });

  // Clear city input button
  cityClearBtn.addEventListener('click', () => {
    cityInput.value = '';
    selectedCity = '';
    selectedCityRef = '';
    cityDropdown.style.display = 'none';
    cityDropdown.innerHTML = '';
    popularChips.forEach(c => c.classList.remove('active'));
    allWarehouses = [];
    applyWarehouseFilter();
    cityInput.focus();
  });

  // Close city autocomplete dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !cityDropdown.contains(e.target)) {
      cityDropdown.style.display = 'none';
    }
  });

  // Popular city chips click
  popularChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.getAttribute('data-city-name');
      const present = chip.getAttribute('data-city-present');
      const ref = chip.getAttribute('data-city-ref');
      selectCity(name, present, ref);
    });
  });

  // Warehouse filter tabs (All / Branch / Postomat)
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategoryFilter = tab.getAttribute('data-tab');
      applyWarehouseFilter();
    });
  });

  // Warehouse internal search input
  if (whSearchInput) {
    whSearchInput.addEventListener('input', (e) => {
      currentWhSearch = e.target.value;
      applyWarehouseFilter();
    });
  }

  // Load initial warehouses for default Kyiv
  loadWarehouses(selectedCityRef, selectedCity);

  // Payment option card click selection
  document.querySelectorAll('.payment-card-option').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.payment-card-option').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input').checked = true;
    });
  });

  // Form submit handler
  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedCity) {
      alert("Будь ласка, вкажіть населений пункт для доставки Новою Поштою.");
      cityInput.focus();
      return;
    }

    if (!selectedWarehouse) {
      alert("Будь ласка, оберіть відділення або поштомат Нової Пошти зі списку.");
      const whSelect = document.getElementById('chk-warehouse');
      if (whSelect) whSelect.focus();
      return;
    }

    const btn = document.getElementById('btn-submit-order');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width:18px; height:18px; border-width:2px;"></div> Оформлення замовлення...`;

    const orderNum = `GK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderPayload = {
      order_number: orderNum,
      customer_name: document.getElementById('chk-name').value.trim(),
      customer_phone: document.getElementById('chk-phone').value.trim(),
      customer_email: document.getElementById('chk-email').value.trim(),
      customer_comment: document.getElementById('chk-comment').value.trim(),
      delivery_city: selectedCity,
      delivery_warehouse: selectedWarehouse,
      delivery_type: selectedWarehouseCategory === 'Postomat' ? 'NOVA_POSHTA_POSTOMAT' : 'NOVA_POSHTA_WAREHOUSE',
      nova_poshta_ref: selectedWarehouseRef,
      payment_method: document.querySelector('input[name="payment_method"]:checked').value,
      payment_status: 'PENDING_PAYMENT',
      total_products_amount: total_products,
      total_shipping_amount: total_shipping,
      total_amount: grand_total,
      shipments: shipments,
      items: state.cart.map(i => ({
        product_id: i.product_id || i.id,
        id: i.product_id || i.id,
        quantity: i.quantity,
        price: i.price,
        title: i.title,
        title_uk: i.title,
        sku: i.sku,
        internal_sku: i.sku,
        supplier_id: i.supplier_id
      }))
    };

    try {
      const res = await api.createOrder(orderPayload);
      if (res.success) {
        state.clearCart();
        renderOrderSuccessModal(res, modalContainer);
      } else {
        alert(res.error || "Помилка створення замовлення");
        btn.disabled = false;
        btn.innerHTML = `Спробувати знову`;
      }
    } catch (err) {
      console.error(err);
      alert("Помилка зв'язку з сервером.");
      btn.disabled = false;
    }
  });
}

function renderOrderSuccessModal(orderRes, container) {
  container.innerHTML = `
    <div class="modal-header">
      <h2 style="color: #10B981; font-size: 20px;">🎉 Замовлення № ${orderRes.order_number} успішно прийнято!</h2>
      <button class="btn-close-drawer" onclick="window.app.closeModal()">✕</button>
    </div>

    <div class="modal-body" style="text-align: center; padding: 32px 20px;">
      <div style="font-size: 54px; margin-bottom: 12px;">📦✨</div>
      <h3 style="font-size: 22px; margin-bottom: 8px;">Дякуємо за замовлення в GRAYKO!</h3>
      <p style="color: #475569; max-width: 480px; margin: 0 auto 20px; font-size: 14px; line-height: 1.5;">
        Ваше замовлення успішно зареєстровано. Наш менеджер уже зв'язується з вами у <b>Viber / Telegram або за телефоном</b> для надання реквізитів на оплату.
      </p>
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 12px 16px; margin: 0 auto 24px; max-width: 500px; font-size: 13px; color: #166534; text-align: left;">
        ℹ️ Одразу після підтвердження оплати замовлення автоматично передається на комплектацію та відправку зі складу Новою Поштою.
      </div>

      <!-- Shipments with Generated TTNs -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; text-align: left; max-width: 520px; margin: 0 auto 24px;">
        <h4 style="font-size: 14px; text-transform: uppercase; color: #64748B; margin-bottom: 12px;">
          Сформовані Експрес-накладні Нової Пошти (ЕН):
        </h4>
        ${(orderRes.shipments || []).map(sh => `
          <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 800; font-size: 14px; color: #0F172A;">${sh.shipment_number}</div>
              <div style="font-size: 12px; color: #DC2626; font-family: monospace; font-weight: 700; margin-top: 2px;">
                ТТН: ${sh.ttn_number}
              </div>
            </div>
            <a href="/api/shipments/${sh.shipment_id || 1}/sticker" target="_blank" class="btn btn-outline btn-sm" style="font-size: 11px;">
              📄 Друк стікера
            </a>
          </div>
        `).join('')}
      </div>

      <div style="display: flex; justify-content: center; gap: 12px;">
        <button class="btn btn-primary" onclick="window.app.closeModal()">Продовжити покупки</button>
      </div>
    </div>
  `;
}
