import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# On Toolforge, use the tool's persistent home directory for data storage.
# The TOOL_DATA_DIR env var can be set to override (e.g. /data/project/fixarchive/).
# Locally, falls back to the project's data/ subdirectory.
_tool_data = os.environ.get("TOOL_DATA_DIR")
if _tool_data:
    DATA_DIR = Path(_tool_data)
else:
    DATA_DIR = BASE_DIR / "data"

DB_PATH = DATA_DIR / "fixarchive.db"
PYWIKIBOT_DIR = DATA_DIR / "pywikibot"

WIKI_LANG = "en"
WIKI_API = f"https://{WIKI_LANG}.wikipedia.org/w/api.php"
WAYBACK_API = "https://archive.org/wayback/available"

WAYBACK_RETRIES = 3
WAYBACK_BACKOFF_BASE = 1.0
DEADCHECK_TIMEOUT = 10.0
SCAN_DELAY = 0.3

# On Toolforge the tool URL is https://fixarchive.toolforge.org/
TOOL_URL = os.environ.get(
    "TOOL_URL",
    "https://github.com/comaeclipse/WikiArchiveFixer",
)

HTTP_HEADERS = {
    "User-Agent": f"FixArchive/1.0 ({TOOL_URL}; tool for replacing archive.today links)",
}

AT_DOMAINS = [
    "archive.today", "archive.ph", "archive.is",
    "archive.fo", "archive.li", "archive.vn", "archive.md",
]
