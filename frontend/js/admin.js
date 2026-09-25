import { api } from './api.js';

let currentCatalog = [];

async function initAdmin() {
  await loadStats();
  await loadOrders();
  await loadProductsForRRP();
}

async function loadStats() {
  try {
    const stats = await api.getAdminStats();
    if (document.getElementById('stat-products')) {
      document.getElementById('stat-products').textContent = (stats.total_products || stats.active_products || 0).toLocaleString('uk-UA');
    }
    if (document.getElementById('stat-in-stock')) {
      document.getElementById('stat-in-stock').textContent = (stats.in_stock_products || stats.active_products || 0).toLocaleString('uk-UA');
    }
    if (document.getElementById('stat-categories')) {
      document.getElementById('stat-categories').textContent = (stats.total_categories || 203);
    }
    if (document.getElementById('stat-next-sync')) {
      document.getElementById('stat-next-sync').textContent = stats.next_sync_time || 'Через 4 години';
    }
    if (document.getElementById('stat-orders')) {
      document.getElementById('stat-orders').textContent = stats.orders_count || 0;
    }
    if (document.getElementById('stat-revenue')) {
      document.getElementById('stat-revenue').textContent = (stats.total_revenue || 0).toLocaleString('uk-UA');
    }
    if (document.getElementById('feed-url-display')) {
      document.getElementById('feed-url-display').textContent = stats.feed_url || 'https://toysi.ua/feed-products-residue.php?...';
    }

    const tbody = document.getElementById('sync-logs-tbody');
    if (tbody) {
      if (!stats.sync_logs || !stats.sync_logs.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94A3B8;">Історія синхронізацій порожня</td></tr>`;
      } else {
        tbody.innerHTML = stats.sync_logs.map(log => `
          <tr>
            <td>#${log.id}</td>
            <td><span style="font-weight:700; background:rgba(91, 192, 190, 0.2); color:#5BC0BE; padding:2px 8px; border-radius:4px; font-size:11px;">${log.sync_type}</span></td>
            <td><span style="color:#10B981; font-weight:700;">✓ ${log.status}</span></td>
            <td>${(log.items_processed || 0).toLocaleString('uk-UA')} тов. (оновлено: ${log.items_updated || 0}, додано: ${log.items_added || 0})</td>
            <td>${log.rrp_violations_count || 0}</td>
            <td style="color:#94A3B8; font-size:12px;">${log.created_at}</td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

async function loadOrders() {
  const container = document.getElementById('orders-list-container');
  try {
    const data = await api.getOrders();
    const orders = data.orders || [];

    if (!orders.length) {
      container.innerHTML = `<div style="text-align: center; padding: 30px; color: #94A3B8;">Замовлень ще немає. Оформіть тестове замовлення через вітрину магазину.</div>`;
      return;
    }

    container.innerHTML = orders.map(o => `
      <div style="background: #0B132B; border: 1px solid #3A506B; border-radius: 12px; padding: 18px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; border-bottom: 1px solid #3A506B; padding-bottom: 10px;">
          <div>
            <strong style="font-size: 16px; color: white;">Замовлення № ${o.order_number}</strong>
            <span style="font-size: 12px; color: #94A3B8; margin-left: 8px;">${o.created_at}</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="background: rgba(16, 185, 129, 0.2); color: #10B981; font-weight:700; font-size:12px; padding:3px 8px; border-radius:4px;">
              ${o.payment_status === 'PAID' ? 'Оплачено онлайн' : 'Післяплата (NovaPay)'}
            </span>
            <strong style="font-size: 16px; color: #5BC0BE;">${o.total_amount} грн</strong>
          </div>
        </div>

        <div style="font-size: 13px; margin-bottom: 12px; color: #CBD5E1;">
          👤 <b>${o.customer_name}</b> (${o.customer_phone}) | 📍 ${o.delivery_city}, ${o.delivery_warehouse}
        </div>

        <!-- Shipments in Order -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(o.shipments || []).map(sh => `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #1C2541; padding: 12px 16px; border-radius: 8px; border: 1px solid #3A506B;">
              <div>
                <span style="font-weight: 700; font-size: 13px; color: white;">📦 ${sh.shipment_number} (${sh.supplier_name}, м. ${sh.supplier_city})</span>
                <div style="font-size: 13px; color: #FF5A5F; font-family: monospace; font-weight: 800; margin-top: 2px;">
                  ТТН Нової Пошти: ${sh.ttn_number}
                </div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <span style="font-size: 11px; background: rgba(91, 192, 190, 0.2); color: #5BC0BE; font-weight: 700; padding: 3px 8px; border-radius: 4px;">
                  ${sh.items?.length || 0} тов.
                </span>
                <a href="/api/shipments/${sh.id}/sticker" target="_blank" class="btn btn-outline btn-sm" style="border-color: #3A506B; color: #E2E8F0;">
                  📄 Друк стікера ЕН
                </a>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #3A506B; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${o.payment_status !== 'PAID' ? `
              <button class="btn btn-sm btn-admin-primary" onclick="sendOrderToToysi(${o.id}, false)">
                🤖 Оплачено — Створити в Toysi (API)
              </button>
              <button class="btn btn-sm btn-outline" style="border-color:#3A506B; color:#CBD5E1;" onclick="sendOrderToToysi(${o.id}, true)">
                🧪 Тестовий запит в Toysi
              </button>
            ` : `
              <span style="color: #10B981; font-size: 13px; font-weight: 700;">✓ Оплачено та передано на відвантаження</span>
            `}
          </div>
          <span style="font-size: 12px; color: #94A3B8;">ID замовлення: #${o.id}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:#FF5A5F;">Помилка завантаження замовлень</div>`;
  }
}

window.sendOrderToToysi = async function(orderId, isTest = false) {
  const modeText = isTest ? "ТЕСТОВИЙ РЕЖИМ (не передається на збірку)" : "РЕАЛЬНЕ ЗАМОВЛЕННЯ на відвантаження";
  if (!confirm(`Відправити замовлення #${orderId} у систему Toysi (${modeText})?`)) return;

  try {
    const res = await fetch(`/api/admin/orders/${orderId}/send-to-toysi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_test: isTest })
    });
    const data = await res.json();
    if (data.success) {
      alert(`✓ Успішно! Замовлення створено в системі Toysi!\nНомер замовлення Toysi: #${data.toysi_order_id}\nСума зі знижкою: ${data.sum_with_discount || '--'} грн`);
      await loadOrders();
    } else {
      alert(`⛔ Помилка Toysi API: ${data.error || 'Не вдалося створити'}`);
    }
  } catch (e) {
    alert(`Помилка підключення: ${e.message}`);
  }
};

async function loadProductsForRRP() {
  const prodSelect = document.getElementById('rrp-test-product');
  const targetVal = document.getElementById('rrp-target-val');
  const newPrice = document.getElementById('rrp-new-price');

  try {
    const data = await api.getCatalog({ limit: 100 });
    currentCatalog = data.products || [];

    prodSelect.innerHTML = currentCatalog.map(p => `
      <option value="${p.id}" data-rrp="${p.rrp_price}" data-cost="${p.cost_price}" data-price="${p.price}">
        ${p.title_uk} (РРЦ: ${p.rrp_price} грн, Опт: ${p.cost_price} грн)
      </option>
    `).join('');

    if (currentCatalog.length > 0) {
      targetVal.value = `${currentCatalog[0].rrp_price} грн`;
      newPrice.value = currentCatalog[0].price;
    }

    prodSelect.addEventListener('change', () => {
      const opt = prodSelect.options[prodSelect.selectedIndex];
      targetVal.value = `${opt.dataset.rrp} грн`;
      newPrice.value = opt.dataset.price;
    });
  } catch (err) {
    console.error("Error loading catalog for RRP:", err);
  }
}

window.switchTab = function(tabName) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.add('hidden'));

  const btn = document.getElementById(`tab-btn-${tabName}`);
  const pane = document.getElementById(`tab-content-${tabName}`);
  if (btn) btn.classList.add('active');
  if (pane) pane.classList.remove('hidden');
};

window.triggerSync = async function(syncType) {
  const box = document.getElementById('sync-result-box');
  box.innerHTML = `<span style="color:#5BC0BE;">⏳ Завантажуємо XML фід з toysi.ua та виконуємо ${syncType === 'FAST' ? 'швидку' : 'повну'} синхронізацію... Це може зайняти кілька секунд.</span>`;

  try {
    const res = await api.triggerSync(syncType);
    if (res && res.success) {
      box.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.2); color: #10B981; padding: 12px 16px; border-radius: 8px; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.3); line-height: 1.5;">
          ✓ ${syncType === 'FAST' ? 'Швидку синхронізацію' : 'Повну синхронізацію'} успішно виконано за ${res.duration_seconds || '0.5'} с!<br>
          <span style="font-size: 12px; color: #CBD5E1;">
            Опрацьовано у фіді: <b>${(res.items_processed || 0).toLocaleString('uk-UA')}</b> товарів |
            Оновлено залишків/цін: <b>${res.items_updated || 0}</b> |
            Додано нових товарів: <b>${res.items_added || 0}</b> |
            Наступне авто-оновлення за розкладом: <b>${res.next_sync_in || 'кожні 4 години'}</b>.
          </span>
        </div>
      `;
    } else {
      box.innerHTML = `<div style="color: #FF5A5F; padding: 10px;">Помилка синхронізації: ${res?.error || 'невідома помилка'}</div>`;
    }
    await loadStats();
    await loadProductsForRRP();
  } catch (err) {
    box.innerHTML = `<div style="color: #FF5A5F; padding: 10px;">Помилка синхронізації: ${err.message}</div>`;
  }
};

window.testPriceUpdate = async function() {
  const prodSelect = document.getElementById('rrp-test-product');
  const newPriceVal = parseFloat(document.getElementById('rrp-new-price').value);
  const feedback = document.getElementById('rrp-feedback');

  if (!prodSelect || isNaN(newPriceVal)) {
    feedback.innerHTML = `<span style="color: #FF5A5F;">Введіть коректну ціну в грн</span>`;
    return;
  }

  const productId = parseInt(prodSelect.value);

  try {
    const res = await api.updatePriceWithRRP(productId, newPriceVal);
    if (res && res.success) {
      feedback.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.2); color: #10B981; padding: 10px 14px; border-radius: 8px; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.3);">
          ✓ Ціну успішно оновлено до ${res.new_price} грн (відповідає або вище РРЦ).
        </div>
      `;
      await loadProductsForRRP();
    } else {
      feedback.innerHTML = `
        <div style="background: rgba(255, 90, 95, 0.2); color: #FFA5A8; padding: 10px 14px; border-radius: 8px; font-weight: 600; border: 1px solid rgba(255, 90, 95, 0.3);">
          ⛔ Блокування бекендом: ${res?.error || 'ціна нижча за рекомендовану роздрібну ціну (РРЦ)!'}
        </div>
      `;
    }
  } catch (err) {
    feedback.innerHTML = `
      <div style="background: rgba(255, 90, 95, 0.2); color: #FFA5A8; padding: 10px 14px; border-radius: 8px; font-weight: 600; border: 1px solid rgba(255, 90, 95, 0.3);">
        ⛔ Блокування бекендом: ціна не може бути нижчою за рекомендовану роздрібну ціну (РРЦ)!
      </div>
    `;
  }
};

initAdmin();
