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

Menus can be written days ahead. If there is no file for today, visitors see "Das heutige Mittagsmenü ist noch nicht online".

## After changing style.css or script.js
Bump the `?v=` number on the `style.css` and `script.js` links in `index.html` (e.g. `v=3` → `v=4`),
otherwise visitors may see the old styles for up to 10 minutes because of browser caching.

## Gallery
1. Open the repo on github.com → `gallery/` folder.
2. Add file → Upload files → drag the photos in → Commit changes.
3. They appear on the site within a minute or two.

Order: photos are named with a 4-digit number and shown smallest number first –
`0010.jpg`, `0020.jpg`, `0030.jpg` … The numbers go in steps of 10, so there is room in between:
to put a new photo between `0020.jpg` and `0030.jpg`, call it `0025.jpg` – no other photo needs renaming.
Always use 4 digits (`0025`, not `25`) so the files also sort correctly on GitHub.
Photos with any other name (e.g. `Sommerfest.jpg`) are shown after all numbered ones.
New photos are picked up automatically – just upload them.

Tips:
- Use JPG/PNG/WebP. iPhone HEIC photos don't show in most browsers – export them as JPG.
- Shrink big phone photos first (about 2000 px wide is plenty), so the page stays fast.
- A file name becomes the caption: `Sommerfest-2026.jpg` → "Sommerfest 2026".
  Camera or random names like `IMG_1234.jpg` or `3wdnlV2O.jpg` get no caption.
- Don't start a file name with `_` or `.` – GitHub Pages skips those files.
- To remove a photo, open it in `gallery/` and delete it.

The photo list is built by GitHub Pages from `gallery.json` – don't delete that file.
Files named `_preview-*` are local test images and are never published.
