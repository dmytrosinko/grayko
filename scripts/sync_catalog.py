#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GRAYKO Toys — Automated Toysi Catalog Feed Synchronization
Used by GitHub Actions Cron, local CLI, and background workers.

Usage:
    python scripts/sync_catalog.py
    python scripts/sync_catalog.py --type FULL
    python scripts/sync_catalog.py --skip-supabase
"""

import os
import sys
import argparse
import time
from datetime import datetime

# Configure base paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, 'backend'))

# UTF-8 for console output
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from backend.db import init_db, get_db_connection, DB_PATH
from backend.dropship_feed import sync_catalog_from_feed, seed_database
from backend.supabase_client import (
    is_supabase_configured,
    sync_sqlite_to_supabase,
    load_supabase_credentials
)


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


def run_catalog_sync(sync_type='FAST', sync_supabase=True):
    log("================================================================")
    log(f"🚀 Starting automated catalog sync (Type: {sync_type})...")
    log("================================================================")

    init_db()

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) as cnt FROM products")
    existing_count = c.fetchone()['cnt']
    conn.close()

    feed_result = {}
    if existing_count == 0 or sync_type == 'FULL':
        if existing_count == 0:
            log("📦 Local database is empty. Running full initial database seed from Toysi XML feed...")
            feed_result = seed_database()
        else:
            log("📦 Running FULL sync (categories, descriptions, images, prices, stock)...")
            feed_result = sync_catalog_from_feed(sync_type='FULL', force_download=True)
    else:
        log(f"📦 Database contains {existing_count} existing products. Running FAST sync (prices & stock)...")
        feed_result = sync_catalog_from_feed(sync_type='FAST', force_download=True)

    if not feed_result.get('success'):
        log(f"❌ Feed sync error: {feed_result.get('error')}")
        return False, feed_result, None

    log(f"✅ Feed parsing completed:")
    log(f"   • Items processed:   {feed_result.get('items_processed', feed_result.get('products_count', 0))}")
    log(f"   • Items updated:     {feed_result.get('items_updated', 0)}")
    log(f"   • Items added:       {feed_result.get('items_added', 0)}")
    log(f"   • Items deactivated: {feed_result.get('items_deactivated', 0)}")
    log(f"   • Out of stock:      {feed_result.get('out_of_stock', 0)}")
    log(f"   • Duration:          {feed_result.get('duration_seconds', 0)}s")

    # 2. Supabase Synchronization
    supabase_result = None
    if sync_supabase:
        url, key = load_supabase_credentials()
        if is_supabase_configured():
            log(f"🔄 Syncing updated catalog to Supabase ({url})...")
            try:
                supabase_result = sync_sqlite_to_supabase()
                if supabase_result.get('success'):
                    log(f"✅ Supabase sync succeeded: {supabase_result.get('products_synced', 0)} products synced in {supabase_result.get('duration_seconds', 0)}s.")
                else:
                    log(f"⚠️ Supabase sync returned notice: {supabase_result.get('error')}")
            except Exception as e:
                log(f"⚠️ Supabase sync exception: {e}")
        else:
            log("ℹ️ Supabase credentials not found or unconfigured. Skipping Supabase upload.")

    log("================================================================")
    log("🎉 Catalog synchronization finished successfully!")
    log("================================================================")
    return True, feed_result, supabase_result


def main():
    parser = argparse.ArgumentParser(description="Sync GRAYKO Toys Catalog from Toysi.ua feed")
    parser.add_argument('--type', choices=['FAST', 'FULL'], default='FAST', help="Sync type: FAST (stock/prices) or FULL (categories/details)")
    parser.add_argument('--skip-supabase', action='store_true', help="Skip uploading to Supabase")
    args = parser.parse_args()

    success, feed_res, sb_res = run_catalog_sync(
        sync_type=args.type,
        sync_supabase=not args.skip_supabase
    )

    # Set GitHub Actions step summary if running inside GitHub Actions
    summary_file = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary_file and os.path.exists(os.path.dirname(summary_file)):
        try:
            with open(summary_file, 'a', encoding='utf-8') as f:
                f.write("## 🧸 GRAYKO Toys Catalog Sync Summary\n\n")
                f.write(f"- **Status**: {'✅ Success' if success else '❌ Failed'}\n")
                f.write(f"- **Sync Type**: `{args.type}`\n")
                f.write(f"- **Timestamp**: `{datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}`\n")
                f.write(f"- **Items Processed**: `{feed_res.get('items_processed', feed_res.get('products_count', 0))}`\n")
                f.write(f"- **Items Updated**: `{feed_res.get('items_updated', 0)}`\n")
                f.write(f"- **Items Added**: `{feed_res.get('items_added', 0)}`\n")
                f.write(f"- **Items Deactivated / Removed**: `{feed_res.get('items_deactivated', 0)}`\n")
                f.write(f"- **Out of Stock**: `{feed_res.get('out_of_stock', 0)}`\n")
                f.write(f"- **Duration**: `{feed_res.get('duration_seconds', 0)}s`\n")
                if sb_res:
                    f.write(f"- **Supabase Synced**: `{'✅ ' + str(sb_res.get('products_synced', 0)) + ' products' if sb_res.get('success') else '⚠️ ' + str(sb_res.get('error'))}`\n")
        except Exception as e:
            print(f"Warning writing GITHUB_STEP_SUMMARY: {e}")

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
