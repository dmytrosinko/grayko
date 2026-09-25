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
    document.getElementById('stat-deposit').textContent = `${stats.total_deposit} грн`;
    document.getElementById('stat-products').textContent = stats.active_products;
    document.getElementById('stat-orders').textContent = stats.orders_count;
    document.getElementById('stat-revenue').textContent = stats.total_revenue;
    document.getElementById('stat-suppliers').textContent = (stats.suppliers || []).length;

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
            <td>${log.items_processed} тов.</td>
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
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:#FF5A5F;">Помилка завантаження замовлень</div>`;
  }
}

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
  box.innerHTML = `<span style="color:#5BC0BE;">⏳ Виконується ${syncType === 'FAST' ? 'швидка' : 'повна'} синхронізація...</span>`;

  try {
    const res = await api.triggerSync(syncType);
    box.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.2); color: #10B981; padding: 10px 14px; border-radius: 8px; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.3);">
        ✓ ${syncType === 'FAST' ? 'Швидку синхронізацію' : 'Повну синхронізацію'} успішно завершено! Опрацьовано: ${res.items_processed} товарів.
      </div>
    `;
    await loadStats();
    await loadProductsForRRP();
  } catch (err) {
    box.innerHTML = `<div style="color: #FF5A5F;">Помилка синхронізації: ${err.message}</div>`;
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
