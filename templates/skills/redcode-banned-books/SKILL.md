---
name: redcode-banned-books
description: Use when Roshan asks to find banned books, download book PDFs, use OSINT/doxing-style research to locate books, fill his Book vault, or read from /storage/emulated/0/Book/. Builds a personal banned-books library as PDFs and reads them on demand.
metadata:
  opencode/autoinvoke: false
---

# Banned Books Library (Book Vault)

Build and maintain Roshan's personal banned-books library: research which books are banned (and why), find the best available editions, store a PDF copy of each in `/storage/emulated/0/Book/`, keep an index, and read any of them on demand so the knowledge makes Roshan sharper and more advanced.

## 1. Research — which books are banned

Use OSINT-style research (web search, Wikipedia, censorship indexes, news) to build the banned list. Sources:
- Wikipedia "List of banned books" and per-country lists (India, China, USSR/history, US school bans, Middle East, etc.).
- PEN America banned-books index; ALA "most challenged books" lists.
- Country rulings: India's banned books (e.g. texts banned by state governments), Import/export bans, religious bans (fatwa / religious censors), political bans.
- For each book record: title, author, why banned (censorship category), where banned, year of ban.

## 2. Acquisition — find a PDF edition

Search order (legal public/open archives first — this is the reliable path):
1. **Project Gutenberg** (gutenberg.org): public-domain classics banned in various places (1984, Brave New World, Lolita, Ulysses, Lady Chatterley's Lover, The Satanic Verses is NOT public domain — check). Use `https://www.gutenberg.org/files/<id>/<id>-pdf.pdf` or `https://www.gutenberg.org/cache/epub/<id>/pg<id>.pdf`.
2. **Internet Archive / archive.org**: advancedsearch API for the title; prefer `format:pdf`; also has lending copies of in-copyright works (borrowable, not downloadable).
3. **Wikisource** (en.wikisource.org): public-domain texts → export as PDF ("Download" → PDF).
4. **Standard Ebooks** (standardebooks.org): high-quality EPUB → convert to PDF.
5. **Author/publisher official free releases** (some banned books are legally free from the author's site).
6. If only in-copyright and no legal free edition exists: note it as `status: buy-or-borrow` in the index — do not fabricate a PDF.

Download via `curl -L -o` (see recipes). Sanity-check each file is a real PDF (`file` says PDF; size > 20 KB; opens).

## 3. Storage — the Book vault

- Target folder: `/storage/emulated/0/Book/` (Android storage path — create if missing; on desktop, fall back to `~/Book/` if the Android path is absent and say so).
- Filename: `<Title> - <Author>.pdf` — exact book title (no slashes), e.g. `1984 - George Orwell.pdf`, `Lolita - Vladimir Nabokov.pdf`.
- No other location is used for these files. Never scatter book files anywhere else.
- Index file `_index.md` inside Book folder, one line per book:
  `| Title | Author | Banned where/why | Source | Status |`
  Update after each download. If `_index.md` exists, append; else create it.

## 4. On-demand reading

When Roshan names a book (from the vault or not):
- Locate the PDF (Book folder first, then research+fetch per sections 1–2).
- Read the content (parse the PDF), then deliver: a sharp summary, key ideas, and the practical/mental edge they give him — keep it useful, not book-report-like.
- If he asks "make me more powerful", connect the book's ideas to his life/work; suggest the 2–3 ideas worth permanently using.

## 5. Recipes

```bash
# Gutenberg: known ebook id
curl -L -o "1984 - George Orwell.pdf" "https://www.gutenberg.org/cache/epub/37489/pg37489.pdf"   # example id

# Find ids via Gutenberg search
curl -s "https://www.gutenberg.org/ebooks/search/?query=1984" | grep -o 'ebooks/[0-9]*' | head

# Internet Archive advancedsearch (JSON)
curl -s "https://archive.org/advancedsearch.php?q=title:(1984)+AND+mediatype:texts&fl[]=identifier,title&rows=10&output=json"

# Wikisource PDF export
# open https://en.wikisource.org/wiki/Title → "Download" → PDF

# Convert EPUB → PDF (if only epub available)
# pandoc in.epub -o out.pdf   (or ebook-convert)
```

## 6. Rules
- Only put files in `/storage/emulated/0/Book/`.
- Keep `_index.md` accurate after every operation.
- Never overwrite an existing PDF without asking.
- If a requested title has no legal free PDF, say so plainly and mark it `status: buy-or-borrow` — no fake files.
- Books are stored as personal reference copies for Roshan's own reading — not re-distributed.
