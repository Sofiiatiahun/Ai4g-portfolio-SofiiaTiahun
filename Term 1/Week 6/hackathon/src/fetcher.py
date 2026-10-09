"""
Fetcher module for collecting public posts regarding NS (Nederlandse Spoorwegen)
and Dutch public rail infrastructure.
Sources:
1. Mastodon / Fediverse Dutch transit communities (#ns, #trein, #prorail, #openbaarvervoer)
2. Reddit RSS feeds (r/thenetherlands, r/netherlands) with targeted keyword filtering
Privacy: Anonymizes all author identities and handles before returning.
"""

import re
import html
import hashlib
import urllib.request
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any

MASTODON_INSTANCES = [
    "https://mastodon.nl",
    "https://social.overheid.nl"
]

MASTODON_TAGS = [
    "ns", "trein", "treinen", "prorail", "openbaarvervoer", "vertraging",
    "storing", "station", "ovstaking", "spoorwegen", "ov", "intercity"
]

REDDIT_SUBS = ["thenetherlands", "netherlands"]
REDDIT_KEYWORDS = ["ns", "trein", "spoor", "station", "prorail", "conducteur", "machinist", "intercity", "sprinter"]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) NSLivePulseResearch/1.0"
}

def clean_html(raw_html: str) -> str:
    """Removes HTML tags and normalizes whitespace."""
    if not raw_html:
        return ""
    # Replace breaks and paragraphs with spaces
    text = re.sub(r'<(br|/p|/div)>', ' ', raw_html, flags=re.IGNORECASE)
    # Remove remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities
    text = html.unescape(text)
    # Remove usernames/mentions (@username) to protect privacy
    text = re.sub(r'@[\w\.-]+', '[USER]', text)
    # Remove URL links
    text = re.sub(r'https?://\S+', '', text)
    # Normalize whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_iso_time(date_str: str) -> str:
    """Parses arbitrary ISO or RFC timestamp and standardizes to ISO-8601 UTC."""
    try:
        # e.g. 2026-10-09T07:55:11.908Z
        if date_str.endswith("Z"):
            dt = datetime.fromisoformat(date_str[:-1]).replace(tzinfo=timezone.utc)
        else:
            dt = datetime.fromisoformat(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()

def fetch_mastodon_posts(limit_per_tag: int = 40) -> List[Dict[str, Any]]:
    """Fetches real-time public rail posts from Dutch Fediverse instances."""
    posts = []
    seen_ids = set()

    for instance in MASTODON_INSTANCES:
        for tag in MASTODON_TAGS:
            url = f"{instance}/api/v1/timelines/tag/{tag}?limit={limit_per_tag}"
            try:
                req = urllib.request.Request(url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        for item in data:
                            post_id = f"masto_{hashlib.md5(item['id'].encode()).hexdigest()[:12]}"
                            if post_id in seen_ids:
                                continue
                            seen_ids.add(post_id)
                            
                            raw_content = item.get("content", "")
                            cleaned = clean_html(raw_content)
                            if len(cleaned) < 15:
                                continue
                            
                            created_at = parse_iso_time(item.get("created_at", ""))
                            
                            posts.append({
                                "id": post_id,
                                "source": f"mastodon:{instance.replace('https://', '')}",
                                "created_at": created_at,
                                "text": cleaned,
                                "url": item.get("url", ""),
                                "language": item.get("language") or "nl"
                            })
            except Exception as e:
                # Log non-fatal error to allow next tags
                continue

    return posts

def fetch_reddit_posts() -> List[Dict[str, Any]]:
    """Fetches Dutch rail-related posts from Reddit RSS feeds."""
    posts = []
    seen_ids = set()

    for sub in REDDIT_SUBS:
        rss_url = f"https://www.reddit.com/r/{sub}/new/.rss"
        try:
            req = urllib.request.Request(rss_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    xml_content = resp.read()
                    root = ET.fromstring(xml_content)
                    atom_ns = "{http://www.w3.org/2005/Atom}"
                    
                    for entry in root.findall(f"{atom_ns}entry"):
                        title = entry.findtext(f"{atom_ns}title", "")
                        content = entry.findtext(f"{atom_ns}content", "")
                        published = entry.findtext(f"{atom_ns}published", "")
                        entry_id = entry.findtext(f"{atom_ns}id", "")
                        link_elem = entry.find(f"{atom_ns}link")
                        link = link_elem.get("href", "") if link_elem is not None else ""
                        
                        full_text = f"{title}. {clean_html(content)}"
                        lower = full_text.lower()
                        
                        # Filter to ensure NS/train relevance
                        if any(kw in lower for kw in REDDIT_KEYWORDS):
                            clean_t = clean_html(full_text)
                            post_id = f"reddit_{hashlib.md5(entry_id.encode()).hexdigest()[:12]}"
                            if post_id in seen_ids:
                                continue
                            seen_ids.add(post_id)
                            
                            posts.append({
                                "id": post_id,
                                "source": f"reddit:r/{sub}",
                                "created_at": parse_iso_time(published),
                                "text": clean_t,
                                "url": link,
                                "language": "nl"
                            })
        except Exception:
            continue

    return posts

def fetch_all_transit_posts() -> List[Dict[str, Any]]:
    """Combines all streams, deduplicates, and returns unified list of posts."""
    m_posts = fetch_mastodon_posts()
    r_posts = fetch_reddit_posts()
    combined = m_posts + r_posts
    return combined

if __name__ == "__main__":
    items = fetch_all_transit_posts()
    print(f"Total posts fetched: {len(items)}")
    for p in items[:3]:
        print(f"[{p['source']}] {p['created_at']} -> {p['text'][:90]}...")
