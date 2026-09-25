import os
import sys
import re
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

# Categories that MUST NEVER be 14+
EXCLUDED_FROM_14 = {
    98989, 98990, 98991, 98993, 98994, 98995, 98996, 98997, 98998, 98999, 99000, 99001, 99003, 99004, 99219, # Soft toys, plush, dolls
    99213, 99214, 99215, 99216, 98981, # Coloring books
    99064, 99065, 99066, 99067, 99068, 99071, 99072, 99073, 99175, 99188, 99189, 99190, # Kids transport, bikes, baby scooters
    99018, 99019, 99020, 99021, 99022, 99024, 99028, 99029, 99030, 99034, 99035, 99037, 99038, 99039, 99040, 99041, # Toddler toys, rattles, bibs, sorters
    99052, 99053, 99054, 99055, 99056, 99057, 99131, # Kitchen, supermarket, housekeeping, doctor
    98887, 98888, 98889, 98891, 98892, 98899, 98906, 98907, 98908, 98909, 98910, 98925, # Sand, buckets, chalk, bubbles, fans, armbands
    98972, 98984, 99208, 99211 # Play-doh, slimes, kids handbags
}

def is_genuine_14(p):
    cid = p.get('category_id')
    if cid in EXCLUDED_FROM_14:
        return False
        
    title = (p.get('title_uk') or '').lower()
    desc = (p.get('description_uk') or '').lower()
    
    # Negative keywords (strictly kids)
    negatives = [
        'розмальовк', 'розфарбовк', 'мʼяк', 'мяк', 'плюш', 'ляльк', 'пупс',
        'велосипед', 'самокат', 'дитяч', 'малюк', 'брязкальц', 'прорізувач',
        'пірамідк', 'сортер', 'кубик', 'пеппа', 'peppa', 'патруль', 'ванночк',
        'каталочк', 'поні', 'вентилятор', 'новорічн', 'кульки', 'крейд', 'тісто',
        'слайм', 'посуд', 'кухня', 'доктор', 'лікар', 'нарукавник', 'надувн',
        'лабубу', 'labubu', 'сумочка', 'гаманець', 'пісочниц', 'пасочк'
    ]
    if any(n in title for n in negatives):
        return False

    # 1. Roomboxes & miniature DIY houses (Rolife, Robotime, Mini House)
    if any(k in title for k in ['румбокс', 'mini house', 'diy house', 'інтерʼєр міні']):
        return True

    # 2. Collector scale models (1:18, 1:24) in metal models
    if cid in [98962, 98958] and any(s in title for s in ['1:18', '1:24', 'bburago']):
        return True

    # 3. Adult & party games / poker / casino
    if any(g in title for g in ['покер', 'набір для покеру', 'бункер', 'гральні карти', 'карти гральні', 'мафія люкс', 'мемологія', 'для дорослих', '18+']):
        return True
    if cid == 99168 and any(g in title for g in ['казино', 'карти', 'sequence', 'bingo']):
        return True

    # 4. Giant / complex adult puzzles (1500, 2000, 3000 elements)
    if any(pz in title for pz in ['1500 ел', '1500 елемент', '2000 ел', '2000 елемент', '3000 ел', '3000 елемент', '4000 ел']):
        return True

    # 5. Metal Hanayama / Cast puzzles
    if any(gp in title for gp in ['cast puzzle', 'hanayama', 'металева головоломка']):
        return True

    # 6. Explicit 14+ in description tag
    m_age = re.search(r'<b>вік:</b>\s*([^\n<]+)', desc, re.I)
    if m_age:
        val = m_age.group(1).lower()
        if any(a in val for a in ['14+', '15+', '16+', '18+', 'від 14', 'от 14']):
            return True

    return False

def determine_proper_fallback_age(p):
    cid = p.get('category_id')
    title = (p.get('title_uk') or '').lower()
    
    # 0-1
    if cid in [99037, 99029, 99030] or any(k in title for k in ['брязкальц', 'прорізувач', 'мобіль', 'немовля']):
        return '0-1 рік'
        
    # 1-3
    if cid in [99024, 98910, 98906, 98907, 98908, 98909, 99039, 99041, 99034, 99067, 99175, 99086, 99166] or any(k in title for k in ['сортер', 'пірамідка', 'толокар', 'каталка', 'біговел', 'пасочки', 'для малюків']):
        return '1-3 роки'
        
    # 6-8
    if cid in [99058, 99062, 98961, 99149, 99157, 99163, 99068, 99071, 99189] or any(k in title for k in ['конструктор', 'лего', 'бластер', 'автомат', 'трансформер', 'трек', 'самокат двоколісний', '18 дюймів', '20 дюймів']):
        return '6-8 років'
        
    # 9-12
    if cid in [98959, 98960, 99063, 99081, 99159, 98976, 99210] or any(k in title for k in ['квадрокоптер', 'дрон', 'мікроскоп', 'телескоп', 'робототехнік', 'кубик рубік', 'головоломка', 'пазл 500', 'пазл 1000']):
        return '9-12 років'
        
    # Default kids
    return '3-5 років'

def patch_product_age(pid, age_group):
    res = requests.patch(f"{URL}/rest/v1/products?id=eq.{pid}", json={"age_group": age_group}, headers=HEADERS, timeout=15)
    return res.status_code

def run():
    print("🚀 Starting cleanup of 14+ age group in Supabase...")
    
    # 1. Fetch all items currently tagged as 14+
    res = requests.get(f"{URL}/rest/v1/products?select=id,category_id,title_uk,description_uk&age_group=eq.14%2B&limit=1000", headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
    current_14 = res.json()
    print(f"Total items currently tagged 14+: {len(current_14)}")
    
    cleaned_count = 0
    kept_count = 0
    
    for p in current_14:
        pid = p['id']
        if is_genuine_14(p):
            kept_count += 1
        else:
            new_age = determine_proper_fallback_age(p)
            patch_product_age(pid, new_age)
            cleaned_count += 1
            print(f"  [Reassigned #{pid}] -> '{new_age}': {p['title_uk'][:70]}")
            
    print(f"\n✅ Cleaned {cleaned_count} mistagged items from 14+.")
    print(f"Retained {kept_count} genuine 14+ items.")
    
    # 2. Find and add ALL genuine 14+ products across the catalog
    print("\n🔍 Scanning catalog for any missing genuine 14+ products...")
    added_count = 0
    candidate_keywords = ['румбокс', 'mini house', '1:18', '1:24', 'bburago', 'покер', 'бункер', 'мафія', '1500 ел', '2000 ел', '3000 ел', 'казино', 'гральні карти', 'cast puzzle', 'hanayama']
    for kw in candidate_keywords:
        res = requests.get(f"{URL}/rest/v1/products?select=id,category_id,title_uk,description_uk,age_group&title_uk=ilike.*{kw}*&limit=100", headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
        for p in res.json():
            if is_genuine_14(p) and p.get('age_group') != '14+':
                patch_product_age(p['id'], '14+')
                added_count += 1
                print(f"  [Added to 14+ #{p['id']}]: {p['title_uk'][:70]}")
                
    print(f"✅ Added {added_count} genuine items to 14+.")
    
    # 3. Final verification of 14+ items
    res = requests.get(f"{URL}/rest/v1/products?select=id,category_id,price,title_uk&age_group=eq.14%2B&limit=200", headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
    final_14 = res.json()
    print(f"\n🎉 Total final 14+ products in catalog: {len(final_14)}")
    for i, p in enumerate(final_14, 1):
        print(f"  {i}. [{p['category_id']}] ({p['price']} грн) {p['title_uk']}")

if __name__ == '__main__':
    run()
