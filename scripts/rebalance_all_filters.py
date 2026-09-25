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
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

def patch_product_age(pid, age_group):
    res = requests.patch(f"{URL}/rest/v1/products?id=eq.{pid}", json={"age_group": age_group}, headers=HEADERS, timeout=15)
    return res.status_code

def patch_by_filter(filter_param, age_group):
    endpoint = f"{URL}/rest/v1/products?{filter_param}"
    try:
        res = requests.patch(endpoint, json={"age_group": age_group}, headers=HEADERS, timeout=30)
        print(f"PATCH {filter_param[:75]} -> {age_group} (Status {res.status_code})")
        return res.status_code
    except Exception as e:
        print(f"Error {filter_param}: {e}")
        return 500

def run():
    print("🚀 Rebalancing and cleaning all age group filters across Supabase...")

    # 1. FIX ANOMALIES IN 0-1 РІК
    # Remove weapons, blasters, board games, automobiles from 0-1
    for kw in ['арбалет', 'бластер', 'зброя', 'пістолет', 'помпова', 'монополія', 'автомобіль', 'машина на р/к', 'джип']:
        patch_by_filter(f"age_group=eq.0-1%20рік&title_uk=ilike.*{kw}*", "6-8 років")

    # 2. FIX ANOMALIES IN 1-3 РОКИ
    # Remove adult games, chemistry sets, blasters from 1-3
    for kw in ['мафія', 'покер', 'набір хіміка', 'мікроскоп', 'досліди']:
        patch_by_filter(f"age_group=eq.1-3%20роки&title_uk=ilike.*{kw}*", "9-12 років")

    # 3. FIX ANOMALIES IN 9-12 РОКІВ
    # Move baby strollers (category 99257) from 9-12 to 1-3 or 3-5
    patch_by_filter("category_id=eq.99257", "1-3 роки")
    
    # 4. FIX DETERMINISTIC CATEGORIES
    # 0-1 рік (Infants)
    for cat_id in [99037, 99029, 99030, 99073]: # Rattles, crib mobiles, infant play mats, baby walkers
        patch_by_filter(f"category_id=eq.{cat_id}", "0-1 рік")

    # 1-3 роки (Toddlers)
    for cat_id in [99024, 98910, 98906, 98907, 98908, 98909, 99039, 99041, 99034, 99067, 99175, 99086, 99166, 99133]:
        patch_by_filter(f"category_id=eq.{cat_id}", "1-3 роки")

    # 6-8 років (Early School: Weapons, LEGO-type, Tracks, Transformers)
    for cat_id in [99145, 99146, 99147, 99148, 99149, 99150, 99156, 99058, 99062, 99060, 98957, 98961]:
        patch_by_filter(f"category_id=eq.{cat_id}", "6-8 років")

    # 9-12 років (Pre-teens: STEM, Science, Microscopes, Diamond Mosaics, Paint by numbers, RC drones/quads)
    for cat_id in [99159, 98976, 99210, 99081, 99063, 98965, 98968]:
        patch_by_filter(f"category_id=eq.{cat_id}", "9-12 років")

    # Specific keyword reassignments for accuracy
    patch_by_filter("title_uk=ilike.*брязкальц*", "0-1 рік")
    patch_by_filter("title_uk=ilike.*прорізувач*", "0-1 рік")
    patch_by_filter("title_uk=ilike.*гризунець*", "0-1 рік")
    patch_by_filter("title_uk=ilike.*сортер*", "1-3 роки")
    patch_by_filter("title_uk=ilike.*пірамідка*", "1-3 роки")
    patch_by_filter("title_uk=ilike.*толокар*", "1-3 роки")
    patch_by_filter("title_uk=ilike.*біговел*", "1-3 роки")
    patch_by_filter("title_uk=ilike.*квадрокоптер*", "9-12 років")
    patch_by_filter("title_uk=ilike.*дрон*", "9-12 років")
    patch_by_filter("title_uk=ilike.*мікроскоп*", "9-12 років")
    patch_by_filter("title_uk=ilike.*телескоп*", "9-12 років")
    patch_by_filter("title_uk=ilike.*робототехнік*", "9-12 років")
    patch_by_filter("title_uk=ilike.*пазл 1000*", "9-12 років")
    patch_by_filter("title_uk=ilike.*пазли 1000*", "9-12 років")
    patch_by_filter("title_uk=ilike.*пазл 500*", "9-12 років")
    patch_by_filter("title_uk=ilike.*пазли 500*", "9-12 років")

    print("\n✅ All age filters rebalanced successfully!")

if __name__ == '__main__':
    run()
