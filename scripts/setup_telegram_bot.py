import os
import sys
import json
import time
import urllib.request
import urllib.parse
import urllib.error

# Set UTF-8 encoding for Windows terminal
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import functools
print = functools.partial(print, flush=True)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_TELEGRAM_PATH = os.path.join(BASE_DIR, 'env', 'telegram')
FRONTEND_CONFIG_PATH = os.path.join(BASE_DIR, 'frontend', 'js', 'telegramConfig.js')

def load_credentials():
    token = None
    chat_id = None
    if os.path.exists(ENV_TELEGRAM_PATH):
        with open(ENV_TELEGRAM_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('TELEGRAM_BOT_TOKEN:'):
                    token = line.split(':', 1)[1].strip()
                elif line.startswith('TELEGRAM_CHAT_ID:'):
                    chat_id = line.split(':', 1)[1].strip()
    return token, chat_id

def save_credentials(token, chat_id):
    with open(ENV_TELEGRAM_PATH, 'w', encoding='utf-8') as f:
        f.write(f"TELEGRAM_BOT_TOKEN: {token}\nTELEGRAM_CHAT_ID: {chat_id}\n")
    try:
        with open(FRONTEND_CONFIG_PATH, 'w', encoding='utf-8') as f:
            f.write(f'export const TELEGRAM_BOT_TOKEN = "{token}";\nexport const TELEGRAM_CHAT_ID = "{chat_id}";\n')
    except Exception as e:
        print(f"Warning: could not update frontend config: {e}")

def main():
    print("=" * 60)
    print("🤖 ДІАГНОСТИКА ТА ПІДКЛЮЧЕННЯ TELEGRAM БОТА GRAYKO")
    print("=" * 60)

    token, chat_id = load_credentials()
    if not token:
        print("❌ TELEGRAM_BOT_TOKEN не знайдено у файлі env/telegram!")
        return

    # 1. Verify Bot Token
    try:
        req = urllib.request.Request(f"https://api.telegram.org/bot{token}/getMe")
        with urllib.request.urlopen(req, timeout=10) as resp:
            bot_info = json.loads(resp.read().decode('utf-8')).get('result', {})
            bot_username = bot_info.get('username')
            bot_name = bot_info.get('first_name')
            print(f"✅ Токен бота активний!")
            print(f"   • Бот: {bot_name} (@{bot_username})")
            print(f"   • Посилання: https://t.me/{bot_username}")
    except Exception as e:
        print(f"❌ Недійсний токен бота: {e}")
        return

    # 2. Test sending message to current chat_id
    print(f"\nПеревірка Chat ID: {chat_id or 'НЕ ВСТАНОВЛЕНО'}...")
    chat_ok = False
    if chat_id:
        try:
            test_data = urllib.parse.urlencode({
                'chat_id': chat_id,
                'text': '🔔 <b>GRAYKO</b>: Тестове повідомлення зв\'язку з ботом. Усе працює чудово!',
                'parse_mode': 'HTML'
            }).encode('utf-8')
            req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=test_data)
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                if res.get('ok'):
                    print("✅ Повідомлення успішно доставлено у ваш Telegram!")
                    chat_ok = True
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', errors='replace')
            print(f"⚠️ Telegram відхилив запит (HTTP {e.code}): {err_body}")
        except Exception as e:
            print(f"⚠️ Помилка відправки: {e}")

    if chat_ok:
        print("\n🎉 Бот повністю готовий отримувати сповіщення про замовлення!")
        return

    # 3. If chat_id not working or chat not found, listen for incoming message
    print("\n" + "—" * 60)
    print("⏳ ОЧІКУВАННЯ ПІДКЛЮЧЕННЯ ВАШОГО TELEGRAM ЧАТУ:")
    print(f"1. Відкрийте посилання: https://t.me/{bot_username}")
    print("2. Натисніть кнопку 'START' (або надішліть будь-яке повідомлення)")
    print("—" * 60)
    print("Чекаємо на ваш клік /start (натисніть Ctrl+C для виходу)...")

    last_offset = 0
    start_time = time.time()
    while time.time() - start_time < 300: # 5 minutes timeout
        try:
            url = f"https://api.telegram.org/bot{token}/getUpdates?offset={last_offset + 1}&timeout=15"
            req = urllib.request.Request(url, headers={'User-Agent': 'GraykoSetup/1.0'})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                updates = data.get('result', [])
                for u in updates:
                    last_offset = max(last_offset, u.get('update_id', 0))
                    msg = u.get('message') or u.get('edited_message') or {}
                    if msg:
                        sender_chat_id = str(msg.get('chat', {}).get('id'))
                        sender_name = msg.get('from', {}).get('first_name', '')
                        text = msg.get('text', '')

                        print(f"\n🎉 Отримано повідомлення від: {sender_name} (Chat ID: {sender_chat_id})!")
                        print("Зберігаємо новий Chat ID в env/telegram та frontend/js/telegramConfig.js...")
                        save_credentials(token, sender_chat_id)

                        # Send welcome confirmation
                        welcome = (
                            "👋 <b>Зв'язок з магазином GRAYKO успішно встановлено!</b>\n\n"
                            f"Ваш Chat ID: <code>{sender_chat_id}</code> успішно авторизовано.\n\n"
                            "Тепер ви миттєво отримуватимете всі замовлення з кнопками швидкого зв'язку у Viber/Telegram "
                            "та деталями доставки Нової Пошти!"
                        )
                        s_data = urllib.parse.urlencode({'chat_id': sender_chat_id, 'text': welcome, 'parse_mode': 'HTML'}).encode('utf-8')
                        urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", data=s_data, timeout=10)
                        print("✅ Підтвердження надіслано в Telegram. Налаштування завершено успішно!")
                        return
        except KeyboardInterrupt:
            print("\nЗупинено користувачем.")
            return
        except Exception as e:
            time.sleep(2)

    print("\nЧас очікування вичерпано. Спробуйте запустити скрипт ще раз.")

if __name__ == '__main__':
    main()
