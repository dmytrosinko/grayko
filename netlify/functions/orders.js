/**
 * Netlify Serverless Function: /api/orders
 * 
 * Handles order submissions on Netlify production hosting.
 * Executes server-side in Node.js.
 * Credentials are read safely from environment variables (Netlify dashboard)
 * or local env/telegram file, never hardcoded in source control.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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

function getTelegramCredentials() {
  let token = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    const candidatePaths = [
      path.join(__dirname, '..', '..', 'env', 'telegram'),
      path.join(__dirname, '..', 'env', 'telegram'),
      path.join(process.cwd(), 'env', 'telegram')
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const lines = fs.readFileSync(p, 'utf-8').split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('TELEGRAM_BOT_TOKEN:')) {
              token = token || trimmed.split(':', 2)[1].trim();
            } else if (trimmed.startsWith('TELEGRAM_CHAT_ID:')) {
              chatId = chatId || trimmed.split(':', 2)[1].trim();
            }
          }
        } catch (e) {
          console.warn('[Orders Function] Error reading env/telegram:', e.message);
        }
      }
    }
  }

  return { token, chatId };
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
    const { token, chatId } = getTelegramCredentials();

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

    let telegramSent = false;

    if (token && chatId) {
      const postData = JSON.stringify({
        chat_id: chatId,
        text: messageHtml,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });

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
            try {
              const parsed = JSON.parse(data);
              if (parsed.ok) telegramSent = true;
            } catch (e) {}
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
    } else {
      console.warn('[Orders Function] Telegram token or chatId not configured. Skipping telegram send.');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order_number: orderNum,
        total_amount: totalAmount,
        telegram_sent: telegramSent,
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
