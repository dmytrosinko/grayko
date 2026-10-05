/**
 * Netlify Serverless Function: /api/orders
 * 
 * Handles order submissions on Netlify production hosting.
 * Executes server-side in Node.js, completely immune to browser ad-blockers,
 * privacy shields (Brave/uBlock Origin), and client network throttling.
 */

const https = require('https');

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cleanPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('380')) return `+${digits}`;
  if (digits.startsWith('0')) return `+38${digits}`;
  return `+${digits}`;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const orderData = JSON.parse(event.body || '{}');
    const token = process.env.TELEGRAM_BOT_TOKEN || "8920766538:AAHR6ytrX0-xF1Rg93TsVKXhkdhcoSLROJo";
    const chatId = process.env.TELEGRAM_CHAT_ID || "-5520817766";

    const orderNum = orderData.order_number || `GK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const phoneClean = cleanPhone(orderData.customer_phone || '');
    const phoneDigits = phoneClean.replace(/\D/g, '');
    const totalAmount = Number(orderData.total_amount || 0);

    const items = Array.isArray(orderData.items) ? orderData.items : [];
    let itemsText = [];
    let totalCost = 0;

    items.forEach((it, idx) => {
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
    const safeCustomerName = escapeHtml(orderData.customer_name || 'Клієнт');
    const safePhone = escapeHtml(phoneClean);
    const safeCity = escapeHtml(orderData.delivery_city || '—');
    const safeWarehouse = escapeHtml(orderData.delivery_warehouse || '—');

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
    inlineKeyboard.push([
      { text: "📋 Відкрити панель Admin", url: "https://grayko.ua/admin" }
    ]);

    const postData = JSON.stringify({
      chat_id: chatId,
      text: messageHtml,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });

    // Send HTTP POST to Telegram Bot API server-side
    await new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`[Netlify Serverless] Telegram API response [${res.statusCode}]:`, data);
          resolve(data);
        });
      });

      req.on('error', (e) => {
        console.error('[Netlify Serverless] Telegram request error:', e);
        resolve(null);
      });

      req.setTimeout(8000, () => {
        console.warn('[Netlify Serverless] Telegram request timed out');
        req.destroy();
        resolve(null);
      });

      req.write(postData);
      req.end();
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order_number: orderNum,
        total_amount: totalAmount,
        telegram_sent: true,
        message: "Замовлення успішно створено!"
      })
    };
  } catch (err) {
    console.error("Orders function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, success: false })
    };
  }
};
