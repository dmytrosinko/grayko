import os
import sys
import re
import requests
from collections import Counter

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
    'Authorization': f'Bearer {KEY}'
}

# Fetch categories map
cats_res = requests.get(f"{URL}/rest/v1/categories?select=id,name_uk&limit=300", headers=HEADERS)
cats_map = {c['id']: c['name_uk'] for c in cats_res.json()}

age_groups = ['0-1 рік', '1-3 роки', '3-5 років', '6-8 років', '9-12 років', '14+']

# Anomaly detection rules
anomalies_rules = {
    '0-1 рік': ['бластер', 'пістолет', 'зброя', 'квадрокоптер', 'дрон', 'велосипед 18', 'велосипед 20', 'монополія', 'шахи', '1000 ел', 'фокуси'],
    '1-3 роки': ['бластер', 'квадрокоптер', 'дрон', 'мікроскоп', 'телескоп', 'велосипед 18', 'велосипед 20', 'монополія', 'шахи', '1000 ел', 'покер', 'мафія'],
    '6-8 років': ['брязкальц', 'прорізувач', 'мобіль для', 'соска', 'пляшечка для годування'],
    '9-12 років': ['брязкальц', 'прорізувач', 'пірамідка', 'толокар', 'каталочка', 'пасочки', 'для немовлят', 'соска'],
    '14+': ['розмальовк', 'розфарбовк', 'мʼяк', 'мяк', 'плюш', 'ляльк', 'пупс', 'велосипед', 'самокат', 'дитяч', 'малюк', 'брязкальц', 'прорізувач', 'пірамідк', 'сортер']
}

print("==================================================")
print("     COMPREHENSIVE AGE FILTERS AUDIT REPORT      ")
print("==================================================")

for ag in age_groups:
    enc_ag = ag.replace('+', '%2B')
    res = requests.get(f"{URL}/rest/v1/products?select=id,category_id,price,title_uk&age_group=eq.{enc_ag}&limit=5000", headers=HEADERS)
    items = res.json()
    total = len(items)
    print(f"\n====================== {ag.upper()} (Total: {total}) ======================")
    
    # Category distribution
    cat_counts = Counter(p.get('category_id') for p in items)
    top_cats = cat_counts.most_common(5)
    print("Top 5 Categories:")
    for cid, cnt in top_cats:
        cname = cats_map.get(cid, f"Cat #{cid}")
        print(f"  - {cname}: {cnt} items ({cnt/total*100:.1f}%)")
        
    # Anomaly scan
    bad_keywords = anomalies_rules.get(ag, [])
    found_anomalies = []
    for p in items:
        title = (p.get('title_uk') or '').lower()
        for bk in bad_keywords:
            if bk in title:
                found_anomalies.append((bk, p))
                break
                
    if found_anomalies:
        print(f"\n⚠️ Potential Anomalies Detected: {len(found_anomalies)}")
        for bk, p in found_anomalies[:5]:
            print(f"  [Keyword '{bk}'] #{p['id']} - {p['title_uk']}")
    else:
        print(f"\n✅ Anomaly check clean: 0 suspicious keywords found.")
        
    print("\nSample 5 items:")
    for p in items[:5]:
        cname = cats_map.get(p.get('category_id'), 'Unknown')
        print(f"  • [{cname}] ({p.get('price')} грн) {p.get('title_uk')}")
