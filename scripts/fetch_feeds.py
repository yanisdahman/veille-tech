import feedparser
import json
import os
import hashlib
import html
import re
from datetime import datetime, timezone

FEEDS = [
    {
        "url": "https://www.cert.ssi.gouv.fr/feed/",
        "source": "CERT-FR",
        "category": "cybersecurite"
    },
    {
        "url": "https://feeds.feedburner.com/TheHackersNews",
        "source": "The Hacker News",
        "category": "cybersecurite"
    },
    {
        "url": "https://www.bleepingcomputer.com/feed/",
        "source": "Bleeping Computer",
        "category": "cybersecurite"
    },
    {
        "url": "https://korben.info/feed",
        "source": "Korben",
        "category": "outils"
    },
    {
        "url": "https://www.it-connect.fr/feed/",
        "source": "IT-Connect",
        "category": "reseau"
    },
    {
        "url": "https://www.lemagit.fr/rss/actualites",
        "source": "LeMagIT",
        "category": "actu"
    },
]

MAX_PER_FEED = 10


def clean_html(text):
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return " ".join(text.split())


def parse_date(entry):
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        try:
            return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
        except Exception:
            pass
    return datetime.now(timezone.utc).isoformat()


def get_image(entry):
    if hasattr(entry, "media_content") and entry.media_content:
        for m in entry.media_content:
            if m.get("type", "").startswith("image"):
                return m.get("url", "")
    if hasattr(entry, "enclosures") and entry.enclosures:
        for e in entry.enclosures:
            if "image" in e.get("type", ""):
                return e.get("href", "")
    raw = ""
    if hasattr(entry, "content") and entry.content:
        raw = entry.content[0].value
    elif hasattr(entry, "summary"):
        raw = entry.summary or ""
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', raw)
    if match:
        return match.group(1)
    return ""


articles = []
seen = set()

for feed_cfg in FEEDS:
    try:
        print(f"Fetching {feed_cfg['source']}...")
        feed = feedparser.parse(feed_cfg["url"])

        for entry in feed.entries[:MAX_PER_FEED]:
            link = getattr(entry, "link", "")
            article_id = hashlib.md5(link.encode()).hexdigest()

            if article_id in seen:
                continue
            seen.add(article_id)

            title = clean_html(getattr(entry, "title", "Sans titre"))
            summary = clean_html(getattr(entry, "summary", ""))
            if len(summary) > 220:
                summary = summary[:217] + "..."

            articles.append({
                "id": article_id,
                "title": title,
                "link": link,
                "summary": summary,
                "published": parse_date(entry),
                "source": feed_cfg["source"],
                "category": feed_cfg["category"],
                "image": get_image(entry),
            })

        print(f"  -> {min(len(feed.entries), MAX_PER_FEED)} articles")

    except Exception as e:
        print(f"  ERROR {feed_cfg['source']}: {e}")

articles.sort(key=lambda x: x["published"], reverse=True)

output = {
    "last_updated": datetime.now(timezone.utc).isoformat(),
    "count": len(articles),
    "articles": articles,
}

os.makedirs("data", exist_ok=True)
with open("data/feeds.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\nDone — {len(articles)} articles saved to data/feeds.json")
