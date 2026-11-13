# AGENTS.md – maintaining www.zur-jana.at

Guide for AI agents helping the owner of **Gasthaus zur Jana** (Klagenfurt) keep the website up to date:
menus, events and photos. Read it fully before changing anything.

---

## 1. What the site is

- One static page: `index.html` + `style.css` + `script.js`. **No framework, no build step, no npm.**
- Hosted on **GitHub Pages** from branch `main` (repo `nik306/zurjana_v2`, domain in `CNAME`).
  A push to `main` is live in about 1 minute.
- GitHub Pages runs **Jekyll** automatically. It is used for exactly two things:
  `gallery.json` and `events.json` list the files in `gallery/` and `events/` on every push.
  **Never delete or rename those two files.**
- Everything visible is **German**. Code comments, README and this file are English.
- All content lives in plain files the owner can edit on github.com:

```
menu/JJJJ-MM-TT.txt              Mittagsmenü, one file per WEEK (named after Monday)
menu/tagesempfehlung/JJJJ-MM-TT.txt   weekend list (named after Saturday)
menu/speisekarte.txt             à la carte menu
menu/TEMPLATE.txt                template for the weekly Mittagsmenü (German instructions)
events/JJJJ-MM-TT[-text].jpg     event posters (named after the event date)
gallery/0010.jpg, 0020.jpg …     photo gallery
assets/                          logos, favicons (32/48/96/192 px), share image
favicon.ico                      16/32/48 px icon at the root (Google's fallback)
README.md                        short owner-facing instructions
```

Page structure (top to bottom): sticky header (links: **Menüs · Galerie · Veranstaltungen · Kontakt**;
folds into a ☰ menu when the links don't fit) → welcome band (logo, greeting, opening hours,
event poster slot) → menu card with tabs **Mittagsmenü · Tagesempfehlung · Speisekarte** →
gallery → footer (address, phone, email, Facebook, hours, live "Jetzt geöffnet" status).

---

## 2. Golden rules

1. **Ask before assuming.** The owner explicitly wants to be asked ("grill me first") when a request
   is ambiguous: placement, wording, what to show, what to hide. Offer 2–4 concrete options.
2. **Commit / push only when asked.** End commit messages with the attribution line the harness gives you.
3. **After any change to `style.css` or `script.js`, bump the `?v=` number** on its link in
   `index.html` (`style.css?v=38` → `v=39`). GitHub Pages caches files for 10 minutes; without the bump
   visitors get old CSS/JS with new HTML. Menu/text files need no bump (they are fetched fresh).
4. **Never publish private material.** Source documents (PDFs, Word files), original photos and
   backups stay outside the repo (`~/zurjana_documents/`, `~/zurjana_photo_originals/`).
   Anything in the repo folder is public once pushed – including `.md` files
   (`zur-jana.at/README.md` and `zur-jana.at/AGENTS.md` are readable), so put nothing secret in them.
5. **Don't invent facts** (prices, hours, dishes, dates). If you must add placeholder content for
   testing, mark it clearly (e.g. a `# BEISPIEL – erfundene Woche` comment) and tell the owner.
6. **Test locally before saying it works**: `python3 -m http.server 8000` in the repo, open
   `http://localhost:8000`. Use `?vorschau=JJJJ-MM-TT` to see the page as on another date
   (weekend tab, past events, next week's menu…). Say clearly what you could not verify visually.
7. File names in `gallery/` and `events/` must **not start with `_` or `.`** – Jekyll skips them.
   (`gallery/_preview-*` is git-ignored and reserved for local test images.)

---

## 3. Menu file syntax (shared by all menu files)

One entry per line. Rules, in the order the parser applies them:

| Line | Meaning |
|---|---|
| empty, or starting with `#` | ignored (comments) |
| `* Text` | a **note** shown under the menu (e.g. allergen info, "Auch à la carte…") |
| `( Text )` directly under a dish | the dish's **small description**, e.g. `( gefüllt mit Käse und Schinken )`, `( 2 Stück )` |
| `Kategorie \| Gericht \| Preis` | dish with category and price |
| `Kategorie \| Gericht` | dish without price |
| `Gericht \| Preis` | dish without category (2nd part must look like a price) |
| `Gericht` | dish only |

- **Price**: a number like `11,90`, `11.9`, `12`, `10,5 €` is shown as **`€ 11,90`**, `€ 12,00`.
  Any other text (`inkl.`, `€ 5,50 / € 8,50`) is shown exactly as written.
- A dish ending in `(vegetarisch)` or `(vegan)` gets a small label instead of that text.
- Lists with prices are laid out "dish left, price right"; lists without prices are centred.
- Categories appear in the order they first occur in the file.

---

## 4. Mittagsmenü – weekly file (Monday to Friday)

**One file per week, named after that week's Monday**: `menu/2026-11-16.txt` for 16.–20.11.
The owner writes it as a weekly sheet (2 dishes per day, one price for all). Format:

```
# Mittagsmenüs 16.11. – 20.11.
Preis: 14,40 | mit Suppe oder Salat
Zeit: 11:00 – 14:00 Uhr
* Auch à la carte oder zum Mitnehmen
* Warme Küche auch von 17:00 bis 20:00 Uhr

MONTAG 16.11.
*Gebackenes Hühnerschnitzel mit Kartoffelsalat
*Gemüsestrudel mit Kräutersauce

DIENSTAG 17.11.
…
```

- **Header** (everything before the first day line, all optional):
  `Preis: <Betrag> | <was inkludiert ist>` (the price is configurable per week),
  `Zeit: <Uhrzeit>`, and `* notes`. In the header, `*` lines are notes.
- **Day lines**: `Montag` … `Freitag`, any case, may be followed by a date and punctuation
  (`MONTAG 9.11.`, `MITTWOCH, 11.11.`). The date in the line is ignored – the date comes from the file name.
- **Dishes**: every line under a day. A leading `*` is stripped (the owner pastes from Word with
  `*` bullets). Per-dish price (`Gericht | 16,90`) and `( description )` lines also work.
- Display: the whole week like the printed sheet – a framed info block on top
  (**€ 14,40** mit Suppe oder Salat · 11:00 – 14:00 Uhr, then the notes), then Monday–Friday.
  **Today** is highlighted ("HEUTE"), past days are faded. If next week's file already exists it is
  shown below ("Nächste Woche"); its info block only repeats if it differs.
  On Saturday/Sunday only next week is shown, or a "wieder ab Montag" note if it doesn't exist.
- Missing file for the current week → "Das Mittagsmenü für diese Woche ist noch nicht online".

**Converting the owner's Word/PDF sheet**: copy dishes word for word (fix only obvious typos and tell
the owner), take price/included/time into the header, the standard lines
("auch à la Carte oder zum Mitnehmen", "Warme Küche auch ab 17 bis 20 Uhr") become `*` notes.
The printed sheets say "11.30 – 14.00"; **the correct lunch time is 11:00 – 14:00**.

---

## 5. Sa./So. Tagesempfehlung – weekend list

- File `menu/tagesempfehlung/<Saturday's date>.txt`, shown on **Saturday and Sunday**.
  A file with Sunday's own date (optional) replaces it on Sunday.
- Usually only 2–3 dishes: one per line, categories not needed (prices/descriptions allowed).
- Own tab "Tagesempfehlung" (between Mittagsmenü and Speisekarte; on phones labelled
  "Sa./So. Tagesempfehlung"). Mon–Fri the tab appears as soon as the coming weekend's file exists;
  without a file there is no tab. On weekends the tab is always there and opens first.

---

## 6. Speisekarte – à la carte

- `menu/speisekarte.txt`, `Kategorie | Gericht | Preis` with `( description )` lines and a `*` allergen note.
- Source: the owner's PDF "A la Carte Speisekarte" (kept in `~/zurjana_documents/`, not in the repo).
- Owner decisions: **show prices**; **leave out surcharge lines** like "Schwein oder Pute (+1 €)";
  **don't show the card's kitchen times** (Mo–Fr 11–16 / Sa–So 11–18) – the website hours are correct.
  Conventions used: "Suppe" → "Tagessuppe"; the side dishes are one entry "Beilage nach Wahl | 5,50"
  with the sides listed as its description; sizes as `€ 5,50 / € 8,50` + `( klein / groß )`.

---

## 7. Events (Veranstaltungen)

- Upload the poster to `events/`, **named with the event date**: `2026-12-06.jpg`;
  text may follow the date (`2026-12-06-nikolaus.jpg`, needed for two events on one day). JPG/PNG/WebP.
- A poster is visible until **06:00 Klagenfurt time on the morning after its date**, then hides itself.
  Old posters may stay in the folder.
- Shown in the welcome band (right of the hours on desktop, below on phones). Every poster sits
  **whole, never cropped or edited**, in an identical 2:3 frame; leftover space is filled with a blurred
  copy of the poster. Several upcoming events → one slot with ‹ dots ›, swipe, auto-advance every 7 s.
- The header link "Veranstaltungen" (next to Galerie) exists only while an event is upcoming.
  With no events the page renders exactly as without the feature.
- **Never crop, retouch or blur-edit event posters.**

---

## 8. Gallery

- Files in `gallery/`, named with a **4-digit number in steps of 10**: `0010.jpg`, `0020.jpg` …
  Order = number. To insert between `0020` and `0030` use `0025.jpg` (no renaming of others).
  Always 4 digits. Files with any other name come after all numbered ones, alphabetically.
- New files appear automatically. 12 photos at first, "Mehr Fotos anzeigen" loads more;
  photos load only when scrolled near (lazy) and open full screen on tap.
- Captions: a descriptive name becomes a caption (`Sommerfest-2026.jpg` → "Sommerfest 2026");
  numbers and camera/random names (`IMG_1234`, `3wdnlV2O`) get none.
- Use JPG/PNG/WebP (no HEIC). Keep files small: max ~1400–2000 px long side, ~100–250 KB.
- **Food photos are edited before publishing** (section 9). Photos of the place/people
  (e.g. `0200.jpg`, the restaurant) are **not** edited.

---

## 9. Editing food photos ("plate focus")

Goal (owner's wish): mainly the plate and the food, messy background removed – but natural.
Method: **crop around the plate + soft blur of the remaining background**; the whole plate stays sharp.

1. Find which files are new/unedited: compare with git (`git status gallery/`, `git hash-object`);
   edited photos are ≤ 1400 px on the long side, fresh phone photos are larger (e.g. 946×2048).
   Renumbered files may be already-edited ones – check by hash, don't edit twice.
2. **Back up originals first** to `~/zurjana_photo_originals/<date>/` (never inside the repo).
3. Tools in a throw-away venv (scratchpad): `pip install pillow "rembg[cpu]"`;
   the AI model (`u2net`, ~176 MB) is cached in `~/.u2net/`. Run Python with `-I`.
4. Make a contact sheet with a 10 % grid and **mark each plate by hand** as fractions of the image:
   `{"0010.jpg": {"box": [x0, y0, x1, y1], "shape": "ellipse"}}` – shapes: `ellipse` (plates/bowls),
   `rect` (wooden boards), `none` (plates fill the frame / several plates → crop only, no blur).
   The AI mask alone finds the food but not the plate – crops become too tight. Always mark plates.
5. Processing per photo: crop = plate box + 3 % margin, aspect kept between 3:4 and 4:3;
   sharp area = plate shape (+2 % padding) ∪ AI food mask (dilated); feather with a Gaussian blur
   (radius ≈ 1.8 % of the image size); background = same crop blurred (≈1.2 %) and darkened to 85 %;
   resize to max 1400 px; save JPEG quality 80, progressive.
6. Check a before/after contact sheet (plate complete? no halos? floor/feet gone?) before copying
   the results into `gallery/` under the same names.

Core of the script (Pillow + rembg):

```python
mask = remove(img, session=new_session("u2net"), only_mask=True, post_process_mask=True).convert("L")
crop, mask = img.crop(box), mask.crop(box)            # box from the hand-marked plate
sharp = Image.new("L", crop.size, 0)
ImageDraw.Draw(sharp).ellipse(plate_rect_padded, fill=255)
sharp = ImageChops.lighter(sharp, mask.filter(ImageFilter.MaxFilter(9)))
soft = sharp.filter(ImageFilter.GaussianBlur(r * 1.5))           # r = max(size) * 0.012
bg = ImageEnhance.Brightness(crop.filter(ImageFilter.GaussianBlur(r))).enhance(0.85)
Image.composite(crop, bg, soft).save(out, "JPEG", quality=80, optimize=True, progressive=True)
```

---

## 10. Fixed facts (only change when the owner says so)

- Öffnungszeiten: **Montag bis Sonntag 11:00 – 22:00 Uhr, kein Ruhetag**.
- Warme Küche: **11:00 – 14:00 Uhr und 17:00 – 20:00 Uhr** (welcome band, footer and the
  "Jetzt geöffnet" status in `script.js` must match).
- Address: Auer-von-Welsbach-Strasse 16, 9020 Klagenfurt · Tel. +43 660 1429552 ·
  zur.jana@gmx.at · Facebook profile id 61559318546175.
- Greeting: "Willkommen bei zur Jana – wo guter Geschmack auf gemütliche Atmosphäre trifft.
  Hausgemacht im Geschmack, gemütlich im Herzen."

---

## 11. Owner's design preferences (learned the hard way)

- Calm, connected design; brand colours dark green `#004f3f`, light green `#bcdda6`, accent `#63bb00`.
  Bright green only as a small accent – not for highlighted/selected states.
- **No emojis** and no emoji-like symbols in the UI (use small drawn SVG/CSS shapes).
- Avoid "everything rounded / looks like a button"; prefer text, thin lines, underlines.
- Animations subtle (no bounce, small distances); everything respects `prefers-reduced-motion`.
- Must work well on phones (test ~360–430 px). Nothing may be truncated: no `flex-shrink` on items
  with `overflow: hidden` (that bug truncated nav and tab labels). Long rows wrap deliberately
  (e.g. price line splits into two clean lines on phones).
- Too many fonts/sizes/colours in one block = "too much going on": serif (Young Serif) only for main
  headings, Figtree for everything else.

---

## 12. Pitfalls

- **Stale cache after a push**: for ~10 min a phone may show new menu files with old JS (wrong
  rendering, e.g. descriptions listed as dishes). Pull-to-refresh / wait 10 min. Always bump `?v=`.
- Phone-only CSS for the menu tabs is at the **end** of `style.css` (it must come after the general
  tab rules). Media-query blocks placed earlier get overridden by later rules of equal specificity.
- Some phones force a dark mode on websites (the page then looks dark) – a browser setting, not a bug.
- The local server doesn't run Jekyll: `gallery.json`/`events.json` come back unprocessed and
  `script.js` falls back to the folder listing – expected.
- Locally, menus only load via `http://` (not by opening `index.html` as a file).
