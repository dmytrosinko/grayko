import os
import re
import json
import time
import threading
import urllib.request
import urllib.parse
from datetime import datetime
from db import get_db_connection
from toysi_client import create_toysi_order

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_TELEGRAM_PATH = os.path.join(BASE_DIR, 'env', 'telegram')

def load_telegram_credentials():
    """Reads bot token and chat_id from env/telegram."""
    token = None
    chat_id = None
    if os.path.exists(ENV_TELEGRAM_PATH):
        try:
            with open(ENV_TELEGRAM_PATH, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('TELEGRAM_BOT_TOKEN:'):
                        token = line.split(':', 1)[1].strip()
                    elif line.startswith('TELEGRAM_CHAT_ID:'):
                        chat_id = line.split(':', 1)[1].strip()
        except Exception as e:
            print(f"Error reading telegram config: {e}")
    return token, chat_id

BOT_TOKEN, ADMIN_CHAT_ID = load_telegram_credentials()

def clean_phone_international(phone_str):
    """Formats phone to +380XXXXXXXXX."""
    digits = re.sub(r'\D', '', str(phone_str))
    if digits.startswith('380'):
        return f"+{digits}"
    elif digits.startswith('0'):
        return f"+38{digits}"
    return f"+{digits}"

def send_telegram_order(order, items):
    """
    Sends structured order notification to the store owner's Telegram
    with direct client contact links and action buttons.
    """
    token, chat_id = load_telegram_credentials()
    if not token or not chat_id:
        print("Telegram credentials not configured. Skipping telegram notification.")
        return False

    phone_clean = clean_phone_international(order.get('customer_phone', ''))
    phone_digits = re.sub(r'\D', '', phone_clean)
    order_num = order.get('order_number', f"GR-{order.get('id', 1)}")
    order_id = order.get('id', 1)

    # Item rows
    items_text = []
    total_cost = 0.0
    for idx, it in enumerate(items, 1):
        title = it.get('product_title') or it.get('title_uk') or 'Товар'
        sku = it.get('product_sku') or it.get('internal_sku') or ''
        qty = it.get('quantity', 1)
        price = it.get('price_per_item') or it.get('price', 0.0)
        cost = it.get('cost_price_per_item') or it.get('cost_price', price * 0.77)
        total_cost += float(cost) * int(qty)

        items_text.append(f"<b>{idx}. {title}</b>\n   └ Арт: <code>{sku}</code> | {qty} шт. × {price:.2f} грн")

    total_amount = float(order.get('total_amount', 0.0))
    profit = max(0.0, total_amount - total_cost)

    message_html = (
        f"🔥 <b>НОВЕ ЗАМОВЛЕННЯ #{order_num}!</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>Покупець:</b> {order.get('customer_name', 'Клієнт')}\n"
        f"📞 <b>Телефон:</b> <code>{phone_clean}</code>\n"
        f"📍 <b>Доставка:</b> Нова Пошта, {order.get('delivery_city', '')}, {order.get('delivery_warehouse', '')}\n"
        f"💳 <b>Статус оплати:</b> ⏳ Очікує реквізитів та оплати\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📦 <b>Склад замовлення:</b>\n"
        + "\n".join(items_text) + "\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"💰 <b>До сплати:</b> {total_amount:.2f} грн\n"
        f"🏷️ <b>Оптова вартість (Toysi):</b> {total_cost:.2f} грн\n"
        f"📈 <b>Очікуваний прибуток:</b> +{profit:.2f} грн\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"<i>Зв'яжіться з клієнтом, надішліть реквізити, а після оплати натисніть кнопку нижче для автозамовлення в Toysi:</i>"
    )

    # Inline Keyboard
    keyboard = {
        "inline_keyboard": [
            [
                {"text": "💬 Написати у Viber", "url": f"viber://chat?number=%2B{phone_digits}"},
                {"text": "✈️ Написати у Telegram", "url": f"https://t.me/+{phone_digits}"}
            ],
            [
                {"text": "✅ Оплачено — Замовити в Toysi", "callback_data": f"pay_{order_id}"}
            ],
            [
                {"text": "🧪 Створити як Тест у Toysi", "callback_data": f"testpay_{order_id}"},
                {"text": "❌ Скасувати", "callback_data": f"cancel_{order_id}"}
            ]
        ]
    }

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message_html,
        "parse_mode": "HTML",
        "reply_markup": json.dumps(keyboard)
    }

    try:
        data = urllib.parse.urlencode(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            res_json = json.loads(resp.read().decode('utf-8'))
            return res_json.get('ok', False)
    except Exception as e:
        print(f"Failed to send telegram notification: {e}")
        return False

def answer_callback_query(token, callback_id, text, show_alert=False):
    """Acknowledges button press in Telegram."""
    try:
        url = f"https://api.telegram.org/bot{token}/answerCallbackQuery"
        payload = urllib.parse.urlencode({'callback_query_id': callback_id, 'text': text, 'show_alert': show_alert}).encode('utf-8')
        req = urllib.request.Request(url, data=payload)
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        print(f"Error answering callback query: {e}")

def edit_message_text(token, chat_id, message_id, new_html, new_reply_markup=None):
    """Edits telegram message text and keyboard after action."""
    try:
        url = f"https://api.telegram.org/bot{token}/editMessageText"
        params = {
            'chat_id': chat_id,
            'message_id': message_id,
            'text': new_html,
            'parse_mode': 'HTML'
        }
        if new_reply_markup is not None:
            params['reply_markup'] = json.dumps(new_reply_markup)
        payload = urllib.parse.urlencode(params).encode('utf-8')
        req = urllib.request.Request(url, data=payload)
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        print(f"Error editing message text: {e}")

def handle_telegram_callback(callback_query):
    """Processes button clicks from admin."""
    token, _ = load_telegram_credentials()
    data = callback_query.get('data', '')
    cb_id = callback_query.get('id')
    message = callback_query.get('message', {})
    chat_id = message.get('chat', {}).get('id')
    message_id = message.get('message_id')
    orig_text = message.get('text', '')

    if data.startswith('pay_') or data.startswith('testpay_'):
        is_test = data.startswith('testpay_')
        order_id = int(data.replace('testpay_', '').replace('pay_', ''))

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
        order_row = cursor.fetchone()
        if not order_row:
            conn.close()
            answer_callback_query(token, cb_id, "Замовлення не знайдено в базі даних!", show_alert=True)
            return

        order = dict(order_row)
        cursor.execute("""
        SELECT oi.*, p.supplier_sku, p.title_uk, p.internal_sku
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.shipment_id IN (SELECT id FROM order_shipments WHERE order_id = ?)
        """, (order_id,))
        items = [dict(r) for r in cursor.fetchall()]

        # Call Toysi API
        answer_callback_query(token, cb_id, "⏳ Створюємо замовлення в системі Toysi...")
        toysi_res = create_toysi_order(order, items, is_test=is_test)

        if toysi_res.get('success'):
            toysi_id = toysi_res.get('toysi_order_id')
            cursor.execute("UPDATE orders SET payment_status = 'PAID' WHERE id = ?", (order_id,))
            cursor.execute("UPDATE order_shipments SET shipping_status = 'SENT_TO_TOYSI' WHERE order_id = ?", (order_id,))
            conn.commit()
            conn.close()

            status_badge = "🧪 ТЕСТОВЕ ЗАМОВЛЕННЯ" if is_test else "✅ ОПЛАЧЕНО ТА СТВОРЕНО В TOYSI"
            updated_text = (
                f"{status_badge}!\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"Замовлення <b>#{order.get('order_number')}</b> успішно передано постачальнику!\n"
                f"🆔 <b>Номер у Toysi:</b> <code>#{toysi_id}</code>\n"
                f"👤 <b>Клієнт:</b> {order.get('customer_name')} ({order.get('customer_phone')})\n"
                f"📍 <b>Доставка:</b> {order.get('delivery_city')}, {order.get('delivery_warehouse')}\n"
                f"💰 <b>Сума в Toysi (зі знижкою):</b> {toysi_res.get('sum_with_discount', '--')} грн\n"
                f"🕒 <b>Час передачі:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"Товар заброньовано на складі постачальника і готується до відправки."
            )
            # Remove action buttons, keep link to toysi if needed
            keyboard = {
                "inline_keyboard": [
                    [{"text": f"📦 Toysi Замовлення #{toysi_id}", "url": "https://toysi.ua/auth/"}]
                ]
            }
            edit_message_text(token, chat_id, message_id, updated_text, keyboard)
        else:
            conn.close()
            err_msg = toysi_res.get('error', 'Помилка Toysi')
            answer_callback_query(token, cb_id, f"Помилка створення в Toysi: {err_msg}", show_alert=True)

    elif data.startswith('cancel_'):
        order_id = int(data.replace('cancel_', ''))
        conn = get_db_connection()
        conn.execute("UPDATE orders SET payment_status = 'CANCELLED' WHERE id = ?", (order_id,))
        conn.commit()
        conn.close()

        answer_callback_query(token, cb_id, "Замовлення скасовано.")
        updated_text = f"❌ <b>ЗАМОВЛЕННЯ СКАСОВАНО</b>\n━━━━━━━━━━━━━━━━━━━━\nЗамовлення #{order_id} скасовано адміністратором."
        edit_message_text(token, chat_id, message_id, updated_text, {"inline_keyboard": []})

def telegram_polling_loop():
    """Long-polling daemon thread that listens for inline button clicks in Telegram."""
    last_update_id = 0
    while True:
        try:
            token, _ = load_telegram_credentials()
            if not token:
                time.sleep(10)
                continue

            url = f"https://api.telegram.org/bot{token}/getUpdates?offset={last_update_id + 1}&timeout=20"
            req = urllib.request.Request(url, headers={'User-Agent': 'GraykoBot/1.0'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                updates = json.loads(resp.read().decode('utf-8'))

            if updates.get('ok') and updates.get('result'):
                for u in updates['result']:
                    last_update_id = max(last_update_id, u.get('update_id', 0))
                    if 'callback_query' in u:
                        handle_telegram_callback(u['callback_query'])
                    elif 'message' in u:
                        msg = u['message']
                        text = msg.get('text', '').strip()
                        c_id = str(msg.get('chat', {}).get('id'))
                        from_user = msg.get('from', {}).get('first_name', '')
                        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 📨 Telegram message from {from_user} (chat_id={c_id}): {text}")

                        # Update env/telegram if chat_id differs
                        with open(ENV_TELEGRAM_PATH, 'w', encoding='utf-8') as f:
                            f.write(f"TELEGRAM_BOT_TOKEN: {token}\nTELEGRAM_CHAT_ID: {c_id}\n")

                        welcome = (
                            "👋 <b>Зв'язок з магазином GRAYKO успішно встановлено!</b>\n\n"
                            f"Ваш Chat ID: <code>{c_id}</code> успішно авторизовано.\n\n"
                            "Тепер ви миттєво отримуватимете всі замовлення з кнопками зв'язку у Viber/Telegram "
                            "та можливістю в один клік відправити замовлення в <b>Toysi</b>!"
                        )
                        send_data = urllib.parse.urlencode({'chat_id': c_id, 'text': welcome, 'parse_mode': 'HTML'}).encode('utf-8')
                        urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", data=send_data, timeout=10)
        except Exception as e:
            time.sleep(3)

def start_telegram_listener():
    """Starts background listener for Telegram buttons and commands."""
    t = threading.Thread(target=telegram_polling_loop, daemon=True, name="TelegramBotPoller")
    t.start()
    print("🤖 Telegram Bot Polling Listener started.")
