import { state } from '../state.js';
import { api } from '../api.js';

export function openProductModal(productId) {
  const modalContainer = document.getElementById('product-modal');
  const backdrop = document.getElementById('modal-backdrop');
  if (!modalContainer || !backdrop) return;

  modalContainer.innerHTML = `
    <div style="padding: 40px; text-align: center;">
      <div class="spinner"></div>
      <p style="margin-top: 12px; color: #64748B;">Завантажуємо деталі товару...</p>
    </div>
  `;
  modalContainer.classList.remove('hidden');
  backdrop.classList.remove('hidden');

  api.getProduct(productId).then(({ product, cross_sells = [] }) => {
    if (!product) {
      modalContainer.innerHTML = `<div style="padding: 24px;">Помилка завантаження товару.</div>`;
      return;
    }

    const images = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : ['https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800'];

    const specs = product.specifications || {};
    const skills = Array.isArray(product.skills_developed) ? product.skills_developed : [];

    modalContainer.innerHTML = `
      <div class="modal-header">
        <div>
          <span style="font-size: 11px; font-weight: 800; color: #0D9488; text-transform: uppercase;">${product.brand} | ${product.internal_sku}</span>
          <h2 style="font-size: 20px; margin-top: 2px;">${product.title_uk}</h2>
        </div>
        <button class="btn-close-drawer" onclick="window.app.closeModal()">✕</button>
      </div>

      <div class="modal-body">
        <div class="product-detail-grid">
          <!-- Gallery -->
          <div class="detail-gallery">
            <img id="detail-active-img" src="${images[0]}" alt="${product.title_uk}" class="detail-main-img">
            ${images.length > 1 ? `
              <div class="detail-thumbs-list">
                ${images.map((img, idx) => `
                  <img src="${img}" class="detail-thumb ${idx === 0 ? 'active' : ''}" onclick="document.getElementById('detail-active-img').src='${img}'; document.querySelectorAll('.detail-thumb').forEach(t=>t.classList.remove('active')); this.classList.add('active');">
                `).join('')}
              </div>
            ` : ''}

            <!-- Warehouse Dispatch Info -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; font-size: 12px; margin-top: 8px;">
              <strong style="color: #0F172A;">🏢 Склад відвантаження:</strong>
              <div style="color: #475569; margin-top: 2px;">
                ${product.supplier_name} (${product.supplier_city})
              </div>
              <div style="color: #10B981; font-weight: 700; margin-top: 4px;">
                ✓ На складі: ${product.stock_quantity} шт. (Готово до відправки)
              </div>
            </div>
          </div>

          <!-- Info & Buy Box -->
          <div>
            <!-- Age & Complexity Indicators -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
              <span class="badge-age" style="font-size: 12px; padding: 4px 10px;">Вік: ${product.age_group}</span>
              ${product.parts_count > 0 ? `
                <span class="skill-tag" style="background:#FEF3C7; color:#92400E; font-size:12px; padding:4px 10px;">
                  ⚙️ ${product.parts_count} деталей
                </span>
              ` : ''}
              ${product.difficulty_level ? `
                <span class="skill-tag" style="background:#E0E7FF; color:#3730A3; font-size:12px; padding:4px 10px;">
                  🎯 Складність: ${product.difficulty_level}
                </span>
              ` : ''}
            </div>

            <!-- Price Box -->
            <div style="background: #FFF1F2; border: 1px solid #FFE4E6; border-radius: 12px; padding: 16px; margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-size: 26px; font-weight: 800; color: #FF5A5F;">${product.price} грн</span>
                  <div style="font-size: 11px; color: #64748B;">Офіційна роздрібна ціна</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div class="qty-control" style="background: white; border: 1px solid #E2E8F0;">
                    <button class="qty-btn" id="modal-qty-minus">-</button>
                    <span class="qty-val" id="modal-qty-val">1</span>
                    <button class="qty-btn" id="modal-qty-plus">+</button>
                  </div>
                  <button id="modal-btn-buy" class="btn btn-primary" style="padding: 10px 20px;">
                    🛒 Купити
                  </button>
                </div>
              </div>
            </div>

            <!-- Skills Developed Radar -->
            <div style="margin-bottom: 16px;">
              <strong style="display: block; font-size: 13px; margin-bottom: 6px;">🧠 Розвиває навички:</strong>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${skills.map(sk => `<span class="skill-tag" style="background:#F1F5F9; color:#0F172A; font-weight:600;">✨ ${sk}</span>`).join('')}
              </div>
            </div>

            <!-- Description -->
            <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
              ${product.description_uk}
            </div>

            <!-- Specifications Table -->
            <strong style="display: block; font-size: 13px; margin-bottom: 6px;">📋 Характеристики:</strong>
            <table class="specs-table">
              <tr><td>Матеріал</td><td>${product.material || 'Дерево'}</td></tr>
              ${product.assembly_time_mins > 0 ? `<tr><td>Орієнтовний час складання</td><td>~${Math.round(product.assembly_time_mins/60)} год.</td></tr>` : ''}
              ${Object.entries(specs).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
            </table>
          </div>
        </div>

        <!-- Cross-Sell Accessories Section -->
        ${cross_sells.length > 0 ? `
          <div class="cross-sell-section">
            <h4 style="font-size: 15px; margin-bottom: 8px;">🧰 Разом дешевше & Супутні товари:</h4>
            <div class="cross-sell-grid">
              ${cross_sells.map(cs => `
                <div class="cross-sell-card">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <img src="${cs.images[0] || ''}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
                    <div style="flex: 1;">
                      <div style="font-weight: 700; font-size: 12px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${cs.title_uk}</div>
                      <div style="color: #FF5A5F; font-weight: 800;">${cs.price} грн</div>
                    </div>
                  </div>
                  <button class="btn btn-outline btn-sm btn-block" style="margin-top: 6px; font-size: 11px;" onclick="window.app.addToCartById(${cs.id})">
                    + Додати аксесуар
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Setup Quantity & Buy Event Listeners
    let currentQty = 1;
    const qtyValEl = document.getElementById('modal-qty-val');
    document.getElementById('modal-qty-minus').addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qtyValEl.textContent = currentQty;
      }
    });
    document.getElementById('modal-qty-plus').addEventListener('click', () => {
      currentQty++;
      qtyValEl.textContent = currentQty;
    });

    document.getElementById('modal-btn-buy').addEventListener('click', () => {
      state.addToCart(product, currentQty);
      window.app.closeModal();
      window.app.openCart();
    });
  });
}
