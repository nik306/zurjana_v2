# zur Jana – daily menu site

## One-time setup
1. Copy everything in this folder (including `assets/` and `menu/`) into the root of your repo and commit.
2. GitHub: Settings → Pages → Deploy from a branch → `main` / root.
3. In `index.html`, replace the three placeholders in the footer (search for "EDIT"):
   - phone: `tel:+000000000000` and the number shown next to it
   - address: the text "Street 1, City" and the `query=` part of the map link
   - Facebook: both occurrences of `facebook.com/your-page`

## Mittagsmenü – weekly routine for the owner
One file per week, named after that week's **Monday**: `menu/2026-11-16.txt` for 16.11. – 20.11.

1. Open the repo on github.com → `menu/` folder → Add file → Create new file.
2. Name it `YYYY-MM-DD.txt` with Monday's date.
3. Fill it in like `menu/TEMPLATE.txt` – the dishes can be pasted straight from the Word menu
   (day lines like `MONTAG 16.11.` and the `*` before each dish are fine). Commit.

At the top of the file (all optional):
- `Preis: 14,40 | mit Suppe oder Salat` – shown once above the dishes; change it any week.
- `Zeit: 11:00 – 14:00 Uhr`
- `* Auch à la carte oder zum Mitnehmen` – lines starting with `*` above the first day are notes under the menu.

The website shows the whole week like the printed menu: price line, then Monday–Friday with
their dishes. Today is highlighted ("HEUTE"), days already past are faded. If next week's file
already exists, it is shown below ("Nächste Woche"), so it can be written in advance.
On weekends only next week is shown. If this week's file is missing, visitors see
"Das Mittagsmenü für diese Woche ist noch nicht online".

## After changing style.css or script.js
Bump the `?v=` number on the `style.css` and `script.js` links in `index.html` (e.g. `v=3` → `v=4`),
otherwise visitors may see the old styles for up to 10 minutes because of browser caching.

## Weekend list (Sa./So. Tagesempfehlung)
The weekend list has its own tab, "Tagesempfehlung" (Mittagsmenü · Tagesempfehlung · Speisekarte).
On Saturdays and Sundays it is always there and opens first (the Mittagsmenü is Monday–Friday only).

1. Open the repo on github.com → `menu/tagesempfehlung/` folder.
2. Add file → Create new file. Name it with **Saturday's date**: `YYYY-MM-DD.txt` (e.g. `2026-11-14.txt`).
3. One dish per line (it's usually just 2–3 dishes, so no categories needed). Commit.
   Once the file exists, the "Tagesempfehlung" tab also shows during the week (next to Mittagsmenü),
   so guests can see the weekend list in advance. Without a file there is no tab on weekdays.

That one file is shown on Saturday and Sunday. If Sunday needs a different list,
add a second file with Sunday's date – it replaces the Saturday file on Sunday.

To check how a weekend will look before it happens, open the site with `?vorschau=` and a date,
e.g. `https://www.zur-jana.at/?vorschau=2026-11-14`.

## Events (posters)
Event posters are shown at the top of the page, in the welcome band (before the menus),
and the header gets a "Veranstaltungen" link while at least one event is upcoming.

1. Open the repo on github.com → `events/` folder → Add file → Upload files.
2. Name the poster with the **event date**: `YYYY-MM-DD.jpg`, e.g. `2026-11-13.jpg`.
   Anything may follow the date: `2026-12-05-nikolaus.jpg` (for two events on one day).
3. Commit. The poster appears within a minute or two.

The poster is shown whole, exactly as uploaded (only scaled down; tap to enlarge).
It disappears by itself at 06:00 the morning after its date (Klagenfurt time).
Several upcoming events are shown side by side, the soonest first.
Old posters can stay in the folder or be deleted – either way they are no longer shown.

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
