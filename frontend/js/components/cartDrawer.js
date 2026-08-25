import { state } from '../state.js';
import { api } from '../api.js';

export async function renderCartDrawer() {
  const drawerEl = document.getElementById('cart-drawer');
  if (!drawerEl) return;

  const items = state.cart;

  if (!items.length) {
    drawerEl.innerHTML = `
      <div class="drawer-header">
        <h3 class="drawer-title">Кошик покупок (0)</h3>
        <button class="btn-close-drawer" onclick="window.app.closeCart()">✕</button>
      </div>
      <div class="drawer-body" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">🛒</div>
        <h3>Ваш кошик порожній</h3>
        <p style="color: #64748B; font-size: 14px; margin-top: 4px;">Додайте розвиваючі дерев'яні іграшки або 3D конструктори з каталогу.</p>
        <button class="btn btn-primary" style="margin-top: 20px;" onclick="window.app.closeCart(); document.getElementById('catalog').scrollIntoView({behavior:'smooth'});">
          Перейти до вибору
        </button>
      </div>
    `;
    return;
  }

  drawerEl.innerHTML = `
    <div class="drawer-header">
      <h3 class="drawer-title">Кошик покупок (${state.getCartCount()})</h3>
      <button class="btn-close-drawer" onclick="window.app.closeCart()">✕</button>
    </div>
    <div class="drawer-body" style="text-align: center; padding: 40px;">
      <div class="spinner"></div>
      <p style="color: #64748B; font-size: 13px; margin-top: 8px;">Розрахунок замовлення...</p>
    </div>
  `;

  try {
    const calcData = await api.calculateCart(items);
    const { shipments = [], total_products = 0, total_shipping = 0, total_packing = 0, grand_total = 0, is_split_order = false } = calcData;

    drawerEl.innerHTML = `
      <div class="drawer-header">
        <div>
          <h3 class="drawer-title">Кошик покупок (${state.getCartCount()})</h3>
          ${is_split_order ? `
            <span style="font-size: 11px; background: #FEF3C7; color: #92400E; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
              📦 Роздільне відправлення (${shipments.length} посилки з різних складів)
            </span>
          ` : ''}
        </div>
        <button class="btn-close-drawer" onclick="window.app.closeCart()">✕</button>
      </div>

      <div class="drawer-body">
        ${shipments.map((sh, idx) => `
          <div class="warehouse-package-box">
            <div class="package-header">
              <span class="package-title">
                📦 Відправлення ${idx + 1}: ${sh.supplier_name}
              </span>
              <span class="package-city-tag">м. ${sh.warehouse_city}</span>
            </div>

            <!-- Items in this shipment -->
            <div class="package-items-list">
              ${sh.items.map(it => `
                <div class="cart-item-row">
                  <img src="${it.image || 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=100'}" class="cart-item-img" alt="${it.title}">
                  <div class="cart-item-info">
                    <div class="cart-item-title">${it.title}</div>
                    <div style="font-size: 11px; color: #64748B;">Арт: ${it.sku}</div>
                    <div class="cart-item-price">${it.price} грн</div>
                  </div>
                  <div class="qty-control">
                    <button class="qty-btn" onclick="window.app.updateCartQty(${it.product_id}, -1)">-</button>
                    <span class="qty-val">${it.quantity}</span>
                    <button class="qty-btn" onclick="window.app.updateCartQty(${it.product_id}, 1)">+</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Shipment Fee Notice -->
            <div style="font-size: 11px; color: #64748B; margin-top: 8px; border-top: 1px dashed #CBD5E1; padding-top: 6px; display: flex; justify-content: space-between;">
              <span>Доставка Новою Поштою:</span>
              <strong>~${sh.shipping_cost} грн</strong>
            </div>

            ${sh.packing_fee > 0 ? `
              <div style="font-size: 11px; color: #B45309; margin-top: 4px; background: #FEF3C7; padding: 4px 8px; border-radius: 4px;">
                ⚠️ Послуга збору та пакування: +${sh.packing_fee} грн (безкоштовно від ${sh.free_packing_threshold} грн).
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <div class="drawer-footer">
        <div class="summary-row">
          <span>Вартість товарів:</span>
          <strong>${total_products} грн</strong>
        </div>
        <div class="summary-row">
          <span>Орієнтовна доставка (${shipments.length} відпр.):</span>
          <strong>${total_shipping} грн</strong>
        </div>
        ${total_packing > 0 ? `
          <div class="summary-row" style="color: #B45309;">
            <span>Збір/пакування:</span>
            <strong>+${total_packing} грн</strong>
          </div>
        ` : ''}
        <div class="summary-row total-row">
          <span>Разом до сплати:</span>
          <strong style="color: #FF5A5F; font-size: 22px;">${grand_total} грн</strong>
        </div>

        <button class="btn btn-primary btn-block btn-lg" style="margin-top: 16px;" onclick="window.app.openCheckout()">
          Оформити замовлення 🚀
        </button>
      </div>
    `;
  } catch (err) {
    console.error("Cart calc error:", err);
  }
}
