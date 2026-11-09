# zur Jana – daily menu site

## One-time setup
1. Copy everything in this folder (including `assets/` and `menu/`) into the root of your repo and commit.
2. GitHub: Settings → Pages → Deploy from a branch → `main` / root.
3. In `index.html`, replace the three placeholders in the footer (search for "EDIT"):
   - phone: `tel:+000000000000` and the number shown next to it
   - address: the text "Street 1, City" and the `query=` part of the map link
   - Facebook: both occurrences of `facebook.com/your-page`

## Daily routine for the owner
1. Open the repo on github.com → `menu/` folder.
2. Add file → Create new file. Name it `YYYY-MM-DD.txt` (today's or a future date).
3. Paste the dishes (see `TEMPLATE.txt`), then Commit changes.
4. The site updates within about a minute.

Menus can be written days ahead. If there is no file for today, visitors see "Today's menu isn't available yet".

## After changing style.css or script.js
Bump the `?v=` number on the `style.css` and `script.js` links in `index.html` (e.g. `v=3` → `v=4`),
otherwise visitors may see the old styles for up to 10 minutes because of browser caching.

## Gallery
1. Open the repo on github.com → `gallery/` folder.
2. Add file → Upload files → drag the photos in → Commit changes.
3. They appear on the site within a minute or two (newest file names first).

Tips:
- Use JPG/PNG/WebP. iPhone HEIC photos don't show in most browsers – export them as JPG.
- Shrink big phone photos first (about 2000 px wide is plenty), so the page stays fast.
- A file name becomes the caption: `Sommerfest-2026.jpg` → "Sommerfest 2026".
  Camera names like `IMG_1234.jpg` get no caption.
- To remove a photo, open it in `gallery/` and delete it.

The photo list is built by GitHub Pages from `gallery.json` – don't delete that file.
Files named `_preview-*` are local test images and are never published.
