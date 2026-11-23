---
name: redcode-banned-books
description: Use when Roshan asks to find banned books, download book PDFs, locate a book file on the web, or fill his Book vault at /storage/emulated/0/Book/. Uses web search and doxxing-style OSINT to hunt the file down, then stores and reads it on demand.
metadata:
  opencode/autoinvoke: false
---

# Banned Books Library (Book Vault)

Find banned books by hunting the web like an investigator — web search plus doxxing-grade OSINT — then store a PDF copy of each in `/storage/emulated/0/Book/`, keep an index, and read any book on demand so Roshan grows sharper and more advanced.

## 1. Research — which books are banned

Use web search + crowd/lists sources:
- Search: `list of banned books <country>`, `censored books <country> <year>`, `banned books <country> list PDF`.
- Sources: Wikipedia "List of banned books", PEN America index, ALA most-challenged books, country rulings (India, China, US school bans, Middle East, USSR history), religious bans, fatwas.
- For each book: title, author, why banned (category), where banned, year.

## 2. Hunt — doxxing-style OSINT to find the PDF

Never ask the user for a link. Hunt it down yourself:

**2.1 Web search dorks** (run with websearch tool):
- `"<title>" filetype:pdf`
- `"<title>" pdf download`
- `"<title>" epub pdf`
- `"<author>" "<title>" pdf`
- `"<title>" -site:amazon.com -site:goodreads.com`
- `<title> pdf archive.org`
- `<title> pdf gutenberg`
- `"<title>" "full text" pdf`

**2.2 Dig into likely hosts:**
- archive.org: `site:archive.org <title> pdf` (or use the advancedsearch API if allowed).
- gutenberg.org: `site:gutenberg.org <title>` (ebook ids).
- wikisource: `site:wikisource.org <title>`.
- Scribd / Academia / Slideshare mirrors: `site:scribd.com <title>`, `site:academia.edu <title>`.
- Publisher/author official sites: `site:*.org <title> pdf`.

**2.3 Doxxing-grade recon (locate the exact file):**
- Once you find a host page, inspect it: fetch the page, find the real download link (view-source / headers / redirect chain).
- Enumerate dir listings: if you see `files.something.com/books/`, try common filenames: `<title>.pdf`, `<title> - <author>.pdf`, `<title>_ebook.pdf`, `<title>_full.pdf`.
- Follow CDN links: check for S3/bucket patterns, `dl.` subdomains, `mirror` paths.
- If the site blocks direct hotlinks, fetch with the right Referer/User-Agent headers.
- GitHub search for repos that host book collections: `"<title>" pdf site:github.com` (raw.githubusercontent links).

**2.4 Verify the file before storing:**
- Download to a temp file, then check: bytes start with `%PDF`, size > 20 KB, opens as a PDF.
- If the first hit is fake (HTML error page, login wall), rotate to the next candidate.

## 3. Store — the Book vault

- Target: `/storage/emulated/0/Book/` (create if missing; on non-Android machines fall back to `~/Book/` and say so).
- Filename: `<Title> - <Author>.pdf` — exact title, e.g. `1984 - George Orwell.pdf`.
- Only book PDFs go in this folder. Never scatter book files anywhere else.
- Index `_index.md` inside the folder, one row per book:
  `| Title | Author | Banned where/why | Found via | Status |`
  Append after each addition (create the file if missing).

## 4. On-demand reading

When Roshan names a book:
- If it's in the vault, read it directly. If not, hunt it (section 2), store it, then read it.
- Deliver: sharp summary, key ideas, and the practical edge they give him. Connect ideas to his life/work; name the 2–3 ideas worth permanently using.

## 5. Testing gate — after every 3 books

After three books from the vault have been read, test Roshan before recommending more:
- **Yadhyas (memory):** key ideas and facts from each book.
- **Application:** which ideas he would actually use, and how.
- **Edge:** what the book gives him that he didn't have before.

Pass = clear recall + at least one real application per book. On fail, re-read/re-digest the weak books together, then retest. Only then move on. Add a `Test` row to `_index.md` for the trio (e.g. `passed 8/10`).

## 6. Rules
- Only store into `/storage/emulated/0/Book/`.
- Keep `_index.md` accurate after every operation.
- Never overwrite an existing PDF without asking.
- Do not fabricate a file: if every lead is dead, say so plainly and mark `status: keep-hunting` — and keep a short note of the best next lead.
- Books are stored as Roshan's personal reference copies for his own reading.
