import os
import sys
import requests

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_SUPABASE_PATH = os.path.join(BASE_DIR, 'env', 'supabase')

def load_credentials():
    url = os.environ.get("SUPABASE_URL", "https://nudrrscxzwycykcbzdoq.supabase.co")
    key = os.environ.get("SUPABASE_KEY", "")
    if os.path.exists(ENV_SUPABASE_PATH):
        with open(ENV_SUPABASE_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('SUPABASE_URL:'):
                    url = line.split(':', 1)[1].strip()
                elif line.startswith('SUPABASE_KEY:'):
                    key = line.split(':', 1)[1].strip()
    return url, key

URL, KEY = load_credentials()
HEADERS = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def patch_filter(filter_param, age_group):
    endpoint = f"{URL}/rest/v1/products?{filter_param}"
    try:
        res = requests.patch(endpoint, json={"age_group": age_group}, headers=HEADERS, timeout=30)
        print(f"[{age_group}] PATCH {filter_param[:70]} -> {res.status_code}")
    except Exception as e:
        print(f"Error patching {filter_param}: {e}")

def run():
    print("🚀 Starting intelligent age_group classification in Supabase...")

    # 1. 14+ років (Teens & Adults)
    hype_14 = [
        'румбокс', 'mini house', 'для дорослих', '16+', '18+', 'для компанії',
        'бункер', 'меми', 'мемів', 'хайпові', 'інтерʼєр міні', '1:18', '1:24',
        'колекційна модель', 'кубик рубіка 5х5', 'кубик рубіка 4х4', 'вечірка',
        'квіз', 'мафія люкс', 'покер'
    ]
    for kw in hype_14:
        patch_filter(f"title_uk=ilike.*{kw}*", "14+")

    # 2. 9-12 років (Pre-teens)
    stem_9_12 = [
        'квадрокоптер', 'дрон', 'мікроскоп', 'телескоп', 'дослід', 'експеримент',
        'робототехнік', 'монополія', 'шахи', 'шашки', 'нарди', 'кубик рубік',
        'головоломка', 'пазл 500', 'пазл 1000', 'пазли 500', 'пазли 1000',
        'картина за номерами', 'алмазна мозаїка', 'алмазна вишивка', 'радіокер',
        'на пульті', 'р/к', 'металевий конструктор', 'робот', 'роботи', 'рація',
        'гравюра', 'електронний конструктор', 'науков'
    ]
    for kw in stem_9_12:
        patch_filter(f"title_uk=ilike.*{kw}*", "9-12 років")

    # Categories for 9-12
    for cat_id in [98959, 98960, 99063, 99081]:
        patch_filter(f"category_id=eq.{cat_id}", "9-12 років")

    # 3. 6-8 років (Early School)
    school_6_8 = [
        'конструктор', 'лего', 'cogo', 'бластер', 'автомат', 'зброя', 'пістолет',
        'трансформер', 'трек', 'настільна гра', 'пазл', 'мозаїка', 'фокуси',
        'літак', 'вертоліт', 'машинка метал', 'водна зброя', 'школяр',
        'першоклас', 'рюкзак', 'пенал', 'фарби акварель', 'гуаш', 'пластилін'
    ]
    for kw in school_6_8:
        patch_filter(f"title_uk=ilike.*{kw}*", "6-8 років")

    for cat_id in [99058, 99062, 98961, 99149, 99157, 99163]:
        patch_filter(f"category_id=eq.{cat_id}", "6-8 років")

    # 4. 1-3 роки (Toddlers)
    toddler_1_3 = [
        'сортер', 'пірамідка', 'толокар', 'каталка', 'біговел', 'пасочки',
        'для малюків', 'пальчикові', 'великі кубики', 'вкладиш', 'шнурівка',
        'для купання', 'ванночк', 'пісочн', 'відерце', 'лопатка', 'лійка',
        'бізіборд', 'килимок пазл', 'гумові тваринки', 'качиня', 'малюк'
    ]
    for kw in toddler_1_3:
        patch_filter(f"title_uk=ilike.*{kw}*", "1-3 роки")

    for cat_id in [99024, 98910, 98906, 98907, 98908, 98909, 99086, 99166]:
        patch_filter(f"category_id=eq.{cat_id}", "1-3 роки")

    # 5. 0-1 рік (Infants & Babies)
    infant_0_1 = [
        'брязкальц', 'прорізувач', 'мобіль', 'гризунець', 'немовля', 'пищалка',
        'підвіска на коляску', 'килимок розвиваючий', 'для немовлят', 'новонароджен',
        'соска', 'пляшечка для годування', 'комфортер', 'брязкальце'
    ]
    for kw in infant_0_1:
        patch_filter(f"title_uk=ilike.*{kw}*", "0-1 рік")

    for cat_id in [99037]:
        patch_filter(f"category_id=eq.{cat_id}", "0-1 рік")

    print("✅ Age groups update completed!")

if __name__ == '__main__':
    run()
