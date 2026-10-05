/**
 * Telegram Notification Module for GRAYKO Storefront
 * Sends order alerts directly to the store manager's Telegram bot (@grayko_admin_bot).
 */

let cachedConfig = null;
async function getTelegramConfig() {
  if (cachedConfig) return cachedConfig;
  let token = "";
  let chatId = "";
  try {
    const mod = await import('./telegramConfig.js').catch(() => ({}));
    token = mod.TELEGRAM_BOT_TOKEN || "";
    chatId = mod.TELEGRAM_CHAT_ID || "";
  } catch (e) {}
  cachedConfig = { token, chatId };
  return cachedConfig;
}

function cleanPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('380')) return `+${digits}`;
  if (digits.startsWith('0')) return `+38${digits}`;
  return `+${digits}`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendTelegramOrderNotification(order, items = []) {
  const cfg = await getTelegramConfig();
  const token = cfg.token || localStorage.getItem('grayko_telegram_bot_token') || '';
  const primaryChatId = cfg.chatId || localStorage.getItem('grayko_telegram_chat_id') || '';

  const localChatId = localStorage.getItem('grayko_telegram_chat_id');

  if (!token || !primaryChatId) {
    // Client-side credentials not configured; server-side Netlify function handles dispatch
    return false;
  }

  try {
    const rawPhone = order.customer_phone || '';
    const phoneClean = cleanPhone(rawPhone);
    const phoneDigits = phoneClean.replace(/\D/g, '');
    const orderNum = order.order_number || `GR-${order.id || Date.now()}`;
    const totalAmount = Number(order.total_amount || 0);

    // Format item lines
    const itemsList = Array.isArray(items) && items.length > 0 ? items : (order.items || []);
    let itemsText = [];
    let totalCost = 0;

    itemsList.forEach((it, idx) => {
      const rawTitle = it.title || it.title_uk || it.product_title || (it.product && it.product.title_uk) || 'Товар';
      const rawSku = it.sku || it.internal_sku || it.product_sku || (it.product && it.product.internal_sku) || '';
      const title = escapeHtml(rawTitle);
      const sku = escapeHtml(rawSku);

      const qty = Number(it.quantity || 1);
      const price = Number(it.price || it.price_per_item || 0);
      const cost = Number(it.cost_price || it.cost_price_per_item || (price * 0.77));
      totalCost += cost * qty;

      itemsText.push(`<b>${idx + 1}. ${title}</b>\n   └ Арт: <code>${sku}</code> | ${qty} шт. × ${price.toFixed(2)} грн`);
    });

    const itemsContent = itemsText.length > 0 ? itemsText.join('\n') : '<i>Деталі товарів у системі</i>';
    const profit = Math.max(0, totalAmount - totalCost);

    const safeOrderNum = escapeHtml(orderNum);
    const safeCustomerName = escapeHtml(order.customer_name || 'Клієнт');
    const safePhone = escapeHtml(phoneClean);
    const safeCity = escapeHtml(order.delivery_city || '—');
    const safeWarehouse = escapeHtml(order.delivery_warehouse || '—');

    const messageHtml = [
      `🔥 <b>НОВЕ ЗАМОВЛЕННЯ #${safeOrderNum}!</b>`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👤 <b>Покупець:</b> ${safeCustomerName}`,
      `📞 <b>Телефон:</b> <code>${safePhone}</code>`,
      `📍 <b>Доставка:</b> Нова Пошта, ${safeCity}, ${safeWarehouse}`,
      `💳 <b>Статус оплати:</b> ⏳ Очікує реквізитів та оплати`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📦 <b>Склад замовлення:</b>`,
      itemsContent,
      `━━━━━━━━━━━━━━━━━━━━`,
      `💰 <b>До сплати:</b> ${totalAmount.toFixed(2)} грн`,
      totalCost > 0 ? `🏷️ <b>Оптова вартість (Toysi):</b> ${totalCost.toFixed(2)} грн` : null,
      profit > 0 ? `📈 <b>Очікуваний прибуток:</b> +${profit.toFixed(2)} грн` : null,
      `━━━━━━━━━━━━━━━━━━━━`,
      `<i>Зв'яжіться з клієнтом у Viber або Telegram для надання реквізитів:</i>`
    ].filter(Boolean).join('\n');

    const inlineKeyboard = [];
    if (phoneDigits && phoneDigits.length >= 9) {
      inlineKeyboard.push([
        { text: "✈️ Написати клієнту в Telegram", url: `https://t.me/+${phoneDigits}` }
      ]);
    }
    const adminUrl = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? `${window.location.origin}/admin`
      : 'https://grayko.ua/admin';

    inlineKeyboard.push([
      { text: "📋 Відкрити панель Admin", url: adminUrl }
    ]);

    const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

    // 1. Primary delivery to store's Telegram group
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: primaryChatId,
        text: messageHtml,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      })
    });

    const resJson = await res.json();
    let sentSuccessfully = false;

    if (resJson.ok) {
      console.log(`✅ [Telegram] Order alert #${orderNum} delivered to primary group (${primaryChatId})`);
      sentSuccessfully = true;
    } else {
      console.error(`❌ [Telegram] Primary send error: [${resJson.error_code}] ${resJson.description}`);
    }

    // 2. Also try secondary personal chatId if stored and different from primary group
    if (localChatId && String(localChatId).trim() !== primaryChatId) {
      try {
        const secRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: String(localChatId).trim(),
            text: messageHtml,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: inlineKeyboard
            }
          })
        });
        const secJson = await secRes.json();
        if (secJson.ok) {
          console.log(`✅ [Telegram] Order alert #${orderNum} also sent to personal chat (${localChatId})`);
          sentSuccessfully = true;
        } else if (secJson.error_code === 403) {
          // User hasn't started the bot in personal chat, clean up invalid stored key
          localStorage.removeItem('grayko_telegram_chat_id');
        }
      } catch (secErr) {
        console.warn("Secondary Telegram dispatch notice:", secErr);
      }
    }

    return sentSuccessfully;
  } catch (err) {
    console.error("❌ Telegram notification network error:", err);
    return false;
  }
}
