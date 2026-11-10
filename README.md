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

Menus can be written days ahead: every upcoming weekday that already has a file appears as a day button (Heute · Morgen · Do 12.11. …) in the Mittagsmenü, and so does the coming weekend's Tagesempfehlung. The categories (`Suppen | …`) are optional – a line with just the dish works too. If there is no file for today, visitors see "Das heutige Mittagsmenü ist noch nicht online".

## After changing style.css or script.js
Bump the `?v=` number on the `style.css` and `script.js` links in `index.html` (e.g. `v=3` → `v=4`),
otherwise visitors may see the old styles for up to 10 minutes because of browser caching.

## Weekend list (Sa./So. Tagesempfehlung)
On Saturdays and Sundays the menu card gets an extra tab, "Tagesempfehlung", which opens first
(the Mittagsmenü is Monday–Friday only). On weekdays the tab is not shown.

1. Open the repo on github.com → `menu/tagesempfehlung/` folder.
2. Add file → Create new file. Name it with **Saturday's date**: `YYYY-MM-DD.txt` (e.g. `2026-11-14.txt`).
3. One dish per line (it's usually just 2–3 dishes, so no categories needed). Commit.
   Once the file exists it also shows during the week, as a "Sa./So." button between Friday and Monday in the day buttons.

That one file is shown on Saturday and Sunday. If Sunday needs a different list,
add a second file with Sunday's date – it replaces the Saturday file on Sunday.

To check how a weekend will look before it happens, open the site with `?vorschau=` and a date,
e.g. `https://www.zur-jana.at/?vorschau=2026-11-14`.

## Events (posters)
Event posters are shown at the top of the page, in the welcome band (before the menus),
and the header gets an "Events" link while at least one event is upcoming.

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
