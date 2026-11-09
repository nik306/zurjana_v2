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
