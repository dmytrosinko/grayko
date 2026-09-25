import { state } from '../state.js';
import { api } from '../api.js';

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

  const { cities = [] } = await api.searchCities('');
  const defaultCity = cities[0] || { name: 'Київ' };
  const { warehouses = [] } = await api.getWarehouses(defaultCity.name);

  modalContainer.innerHTML = `
    <div class="modal-header">
      <div>
        <h2 style="font-size: 20px;">Оформлення замовлення Новою Поштою</h2>
        <span style="font-size: 12px; color: #64748B;">Швидка доставка по Україні зі складів відвантаження</span>
      </div>
      <button class="btn-close-drawer" onclick="window.app.closeModal()">✕</button>
    </div>

    <div class="modal-body">
      <!-- Order Split Alert if multiple suppliers -->
      ${is_split_order ? `
        <div style="background: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; color: #92400E;">
          <strong>📦 Ваше замовлення буде відправлено ${shipments.length} окремими посилками:</strong>
          <ul style="margin: 6px 0 0 18px;">
            ${shipments.map(s => `<li>${s.supplier_name} (м. ${s.warehouse_city}) — ${s.items.length} тов.</li>`).join('')}
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

        <!-- 2. Доставка Новою Поштою -->
        <h4 style="font-size: 15px; margin: 20px 0 12px; color: #0F172A;">2. Доставка Нова Пошта</h4>
        <div class="form-row-2col">
          <div class="form-group">
            <label class="form-label">Місто одержання *</label>
            <select id="chk-city" class="form-select">
              ${cities.map(c => `<option value="${c.name}">${c.name} (${c.region})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Відділення або поштомат *</label>
            <select id="chk-warehouse" class="form-select">
              ${warehouses.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}
            </select>
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

  const citySelect = document.getElementById('chk-city');
  const whSelect = document.getElementById('chk-warehouse');
  citySelect.addEventListener('change', async (e) => {
    whSelect.innerHTML = `<option>Завантаження відділень...</option>`;
    const data = await api.getWarehouses(e.target.value);
    whSelect.innerHTML = (data.warehouses || []).map(w => `<option value="${w.name}">${w.name}</option>`).join('');
  });

  document.querySelectorAll('.payment-card-option').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.payment-card-option').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input').checked = true;
    });
  });

  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-order');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width:18px; height:18px; border-width:2px;"></div> Оформлення в системі Нової Пошти...`;

    const orderPayload = {
      customer_name: document.getElementById('chk-name').value,
      customer_phone: document.getElementById('chk-phone').value,
      customer_email: document.getElementById('chk-email').value,
      customer_comment: document.getElementById('chk-comment').value,
      delivery_city: document.getElementById('chk-city').value,
      delivery_warehouse: document.getElementById('chk-warehouse').value,
      delivery_type: 'NOVA_POSHTA_WAREHOUSE',
      payment_method: document.querySelector('input[name="payment_method"]:checked').value,
      items: state.cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
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
        ${orderRes.shipments.map(sh => `
          <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 800; font-size: 14px; color: #0F172A;">${sh.shipment_number}</div>
              <div style="font-size: 12px; color: #DC2626; font-family: monospace; font-weight: 700; margin-top: 2px;">
                ТТН: ${sh.ttn_number}
              </div>
            </div>
            <a href="/api/shipments/${sh.shipment_id}/sticker" target="_blank" class="btn btn-outline btn-sm" style="font-size: 11px;">
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
