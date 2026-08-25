import { state } from '../state.js';

export function createProductCard(product) {
  const imgUrl = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600';

  const supplierShortName = product.supplier_city
    ? `Склад м. ${product.supplier_city}`
    : 'Основний склад';

  const skillsList = Array.isArray(product.skills_developed) ? product.skills_developed : [];

  const card = document.createElement('div');
  card.className = 'product-card';
  card.innerHTML = `
    <div class="card-media" onclick="window.app.openProductModal(${product.id})">
      <img src="${imgUrl}" alt="${product.title_uk}" class="card-img" loading="lazy">
      
      <div class="card-badges">
        <span class="badge-age">${product.age_group || '3+'}</span>
        ${product.is_bestseller ? '<span class="badge-hit">Хіт</span>' : ''}
        ${product.is_new ? '<span class="badge-new">Новинка</span>' : ''}
      </div>

      <div class="card-supplier-pill" style="background:#F1F5F9; color:#475569; border:1px solid #CBD5E1;">
        📦 ${supplierShortName}
      </div>

      <div class="card-quick-view">Швидкий перегляд 👁️</div>
    </div>

    <div class="card-body">
      <div class="card-meta-top">
        <span class="card-brand">${product.brand || 'Еко-іграшки'}</span>
        <span class="card-sku">${product.internal_sku}</span>
      </div>

      <h3 class="card-title" onclick="window.app.openProductModal(${product.id})">
        ${product.title_uk}
      </h3>

      <div class="card-skills-preview">
        ${skillsList.slice(0, 2).map(sk => `<span class="skill-tag">${sk}</span>`).join('')}
        ${product.parts_count > 0 ? `<span class="skill-tag" style="background:#FEF3C7; color:#92400E;">⚙️ ${product.parts_count} дет.</span>` : ''}
      </div>

      <div class="card-footer">
        <div class="price-box">
          <span class="current-price">${product.price} грн</span>
          <span class="rrp-label">Офіційна ціна</span>
        </div>

        <button class="btn-add-cart" data-id="${product.id}" title="Додати в кошик">
          + В кошик
        </button>
      </div>
    </div>
  `;

  // Add to cart click
  const addBtn = card.querySelector('.btn-add-cart');
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.addToCart(product);
  });

  return card;
}
