# Archive.today Link Detector — Wikipedia Reference Audit Tool

A browser-based tool to detect [archive.today](https://archive.today) references in English Wikipedia articles, find [Wayback Machine](https://web.archive.org) replacements, and fix them directly with one-click editing.

## Why?

Archive.today links in Wikipedia are [discouraged](https://en.wikipedia.org/wiki/Wikipedia:ATODAY). This tool helps editors systematically find and replace these links with Wayback Machine alternatives.

## Features

- **Three scan modes**: Single article, entire category, or topic-based browsing across multiple categories
- **Wikipedia autocomplete**: Live search suggestions for articles and categories powered by Wikipedia's OpenSearch API
- **Wayback Machine lookup**: Automatically checks if an archived version exists on the Wayback Machine for each detected link
- **One-click Fix on Wikipedia**: Opens the Wikipedia source editor with a pre-filled edit summary per [[WP:ATODAY]]
- **Copy old/new URL buttons**: Streamlined Find & Replace workflow for editing article source
- **Archive-date extraction**: Extracts the snapshot date from Wayback URLs for updating `|archive-date=` in citation templates
- **503 auto-retry**: Retries Wayback Machine API requests up to 3 times with exponential backoff to handle Internet Archive's intermittent capacity issues
- **15 predefined topic areas**: Medicine, Biology, Physics, Chemistry, Computer Science, History, Politics, Geography, Law, Economics, Engineering, Media, Environment, Education, Sports
- **Custom categories**: Define your own category lists for targeted scans

## Detected Domains

- `archive.today`
- `archive.ph`
- `archive.is`
- `archive.fo`
- `archive.li`
- `archive.vn`
- `archive.md`

## How It Works

1. Fetches article wikitext via the Wikipedia Parse API
2. Regex-matches archive.today URLs across all detected domains
3. Extracts the embedded original URL from each archive link
4. Queries the Wayback Machine Availability API for alternatives
5. Displays results with one-click editing tools

## Usage

1. Open `index.html` in any modern browser — no server or build step required
2. Choose a scan mode (Article / Category / Topic Browse)
3. Enter a search term or select a topic
4. Review results and click **Fix on Wikipedia** for affected articles
5. Use the **Copy old URL** / **Copy new URL** / **Copy date** buttons with Find & Replace in the Wikipedia editor
6. Publish your changes

## Editing Workflow

1. Click **Fix on Wikipedia** → opens the article editor with pre-filled edit summary
2. In the editor toolbar, click **Advanced** → **Search and replace** (magnifying glass icon)
3. **Copy old URL** → paste in "Find" field
4. **Copy new URL** → paste in "Replace" field → hit Replace
5. **Copy date** → update `|archive-date=` in the citation template
6. Review changes → **Publish changes**

## Limits

- Category/topic scans: up to 500 articles per scan
- Wayback API requests are rate-limited (~300ms between requests)
- Auto-retries 503 errors up to 3 times with backoff

## Note on Wayback Machine 503 Errors

Wayback Machine links may occasionally show "503 Service Unavailable". This is an Internet Archive server-side issue — their servers handle billions of pages and sometimes hit capacity bottlenecks. The tool automatically retries failed requests, but if a Wayback link still shows 503 when you click it, simply refresh the page. The archived content is still there.

## Tech Stack

- **Frontend**: React 18 + Babel (standalone, no build step)
- **Typography**: Source Serif 4, Inter, IBM Plex Mono
- **APIs**: Wikipedia Parse API, Wikipedia OpenSearch API, Wayback Machine Availability API
- **Design**: Claude AI design system (warm cream palette, terracotta accents)

## License

This project is licensed under the [MIT License](LICENSE).

## Author

Created by [Netha Hussain](https://github.com/nethahussain) with Claude AI.
