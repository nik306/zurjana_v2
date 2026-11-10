// Animations are switched off for visitors who ask their device for reduced motion
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js");

// Today's date in the visitor's local time, formatted YYYY-MM-DD.
// Preview another day with ?vorschau=2026-11-14 in the address bar (handy for checking weekend lists).
const preview = new URLSearchParams(location.search).get("vorschau") ?? "";
const now = /^\d{4}-\d{2}-\d{2}$/.test(preview) ? new Date(`${preview}T12:00`) : new Date();
const today = now.toLocaleDateString("sv-SE");

const menuEl = document.getElementById("menu");
const dateEl = document.getElementById("date");
document.getElementById("year").textContent = now.getFullYear();

dateEl.textContent = now.toLocaleDateString("de-AT", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
});

// "Jetzt geöffnet" line in the footer, based on Klagenfurt time (same hours every day)
showOpenStatus();
setInterval(showOpenStatus, 60 * 1000);

function showOpenStatus() {
  const el = document.getElementById("open-status");
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vienna", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).format(new Date()).split(":").map(Number);
  const t = h * 60 + m;
  const between = (from, to) => t >= from * 60 && t < to * 60;

  const open = between(11, 22);
  const kitchen = between(11, 14) || between(17, 20);
  let text;
  if (!open) text = "Jetzt geschlossen · öffnet um 11:00 Uhr";
  else if (kitchen) text = "Jetzt geöffnet · Küche offen";
  else if (t < 17 * 60) text = "Jetzt geöffnet · warme Küche wieder ab 17:00 Uhr";
  else text = "Jetzt geöffnet · Küche geschlossen";

  el.textContent = text;
  el.classList.toggle("is-open", open);
  el.hidden = false;
}

// ---------- Menus ----------
// The Mittagsmenü is served Monday to Friday only. On Saturday and Sunday there is a
// separate list instead – the "Sa./So. Tagesempfehlung" – shown in its own tab, which opens first.
// On weekdays that tab is removed entirely.
const isWeekend = now.getDay() === 0 || now.getDay() === 6;
const LOOK_AHEAD_DAYS = 14;    // how far ahead to look for menu files

const iso = d => d.toLocaleDateString("sv-SE");
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const longDate = (d, withYear = false) => d.toLocaleDateString("de-AT", {
  weekday: "long", day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {})
});
const weekendDates = saturday => `${longDate(saturday)} und ${longDate(addDays(saturday, 1))}`;

showWeekendList();
setupLunchMenus();

function fetchText(url) {
  return fetch(`${url}?v=${Date.now()}`)
    .then(r => (r.ok ? r.text() : null))
    .catch(() => null);
}

// Mittagsmenü – one file per WEEK, named after that week's Monday: menu/2026-11-09.txt
//
//   Preis: 14,40 | mit Suppe oder Salat      ← shown once above the dishes (optional)
//   Zeit: 11:00 – 14:00 Uhr                 ← optional
//   * auch à la carte oder zum Mitnehmen     ← notes under the menu (optional)
//
//   Montag                                   ← a day line (may also read "MONTAG 9.11.")
//   Gebratener Leberkäse mit Püree           ← dishes; a leading "*" is ignored
//   Gebackene Champignons mit Sauce Tatar
//
//   Dienstag
//   …
// The page shows today plus every upcoming weekday that has dishes, as day buttons.
// On weekends there is no "today" – the row shows next week's menu, if it exists yet.
const DAY_NAMES = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];

function parseWeek(text) {
  const week = { price: "", priceNote: "", time: "", notes: [], days: {} };
  let day = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const dayMatch = line.toLowerCase().match(/^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b[\s,.\d]*:?$/);
    if (dayMatch) { day = DAY_NAMES.indexOf(dayMatch[1]); week.days[day] = []; continue; }
    if (day === null) {                                   // header part, before the first day
      const price = line.match(/^preis\s*:\s*(€?\s*\d+(?:[.,]\d{1,2})?\s*€?)\s*[|·–-]?\s*(.*)$/i);
      const time = line.match(/^zeit\s*:\s*(.+)$/i);
      if (price) { week.price = formatPrice(price[1].trim()); week.priceNote = price[2].trim(); }
      else if (time) week.time = time[1].trim();
      else if (line.startsWith("*")) week.notes.push(line.slice(1).trim());
      continue;
    }
    week.days[day].push(line.replace(/^\*\s*/, ""));    // dish (owner's "*" bullets are fine)
  }
  return week;
}

// Shown like the printed weekly menu: price line, then Monday–Friday with their dishes.
// Today is highlighted, days already past are faded. Next week's file, if it already
// exists, is shown below. On weekends only next week is shown.
async function setupLunchMenus() {
  const thisMonday = addDays(now, 1 - (now.getDay() || 7));     // Sunday counts to the week before
  const nextMonday = addDays(thisMonday, 7);
  const [thisText, nextText] = await Promise.all(
    [thisMonday, nextMonday].map(m => fetchText(`menu/${iso(m)}.txt`)));

  const weeks = [];
  if (!isWeekend) weeks.push({ monday: thisMonday, text: thisText });
  if (nextText !== null) weeks.push({ monday: nextMonday, text: nextText });
  if (weeks.length === 0) return showLunchWeekendNote();

  document.querySelector("#panel-mittagsmenu .eyebrow").textContent = isWeekend ? "Nächste Woche" : "Montag bis Freitag";
  document.getElementById("menu-title").textContent = isWeekend ? "Mittagsmenü" : "Unser Mittagsmenü";
  dateEl.textContent = weekRange(weeks[0].monday);

  menuEl.textContent = "";
  menuEl.classList.add("is-week");
  const counter = { n: 0 };
  weeks.forEach((week, i) => renderWeek(week, i > 0 ? `Nächste Woche · ${weekRange(week.monday, false)}` : "", counter));
}

// "9. – 13. November 2026" (or "30. November – 4. Dezember 2026")
function weekRange(monday, withYear = true) {
  const friday = addDays(monday, 4);
  const end = friday.toLocaleDateString("de-AT", { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) });
  const start = monday.getMonth() === friday.getMonth()
    ? `${monday.getDate()}.`
    : monday.toLocaleDateString("de-AT", { day: "numeric", month: "long" });
  return `${start} – ${end}`;
}

function renderWeek({ monday, text }, heading, counter) {
  const step = el => { el.style.setProperty("--i", counter.n++); return el; };
  if (heading) {
    const h = document.createElement("h2");
    h.className = "week-title";
    h.textContent = heading;
    menuEl.append(step(h));
  }

  const week = text === null ? null : parseWeek(text);
  const days = week ? [1, 2, 3, 4, 5].filter(d => week.days[d]?.length) : [];
  if (days.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.innerHTML = "Das Mittagsmenü für diese Woche ist noch nicht online.<br>Bitte schauen Sie später wieder vorbei.";
    menuEl.append(empty);
    return;
  }

  // Week info – relevant every day, so it comes first and stands out:
  // price, what's included, lunch time and the general notes (à la carte, evening kitchen …).
  // For next week it is only repeated if something differs from this week.
  const infoKey = JSON.stringify([week.price, week.priceNote, week.time, week.notes]);
  if (infoKey !== counter.lastInfo && (week.price || week.priceNote || week.time || week.notes.length)) {
    counter.lastInfo = infoKey;
    const info = document.createElement("div");
    info.className = "week-info";
    // "€ 14,40  mit Suppe oder Salat · 11:00 – 14:00 Uhr" – one line, price in bold
    const details = [week.priceNote, week.time].filter(Boolean);
    if (week.price || details.length) {
      const line = document.createElement("p");
      line.className = "week-details";
      if (week.price) {
        const price = document.createElement("strong");
        price.textContent = week.price;
        line.append(price, details.length ? " " : "");
      }
      // phones: the time goes onto its own line (see .week-time in style.css)
      const parts = [[week.priceNote, "nowrap"], [week.time, "nowrap week-time"]].filter(([text]) => text);
      parts.forEach(([text, cls], i) => {
        if (i) {
          const sep = document.createElement("span");
          sep.className = "week-sep";
          sep.textContent = " · ";
          line.append(sep);
        }
        const part = document.createElement("span");
        part.className = cls;
        part.textContent = text;
        line.append(part);
      });
      info.append(line);
    }
    if (week.notes.length) {
      const notes = document.createElement("ul");
      notes.className = "week-notes";
      for (const text of week.notes) {
        const li = document.createElement("li");
        li.textContent = text;
        notes.append(li);
      }
      info.append(notes);
    }
    menuEl.append(step(info));
  }

  for (const d of days) {
    const date = addDays(monday, d - 1);
    const section = document.createElement("section");
    section.className = "lunch-day";
    if (iso(date) === today) section.classList.add("is-today");
    else if (iso(date) < today) section.classList.add("is-past");

    const title = document.createElement("h3");
    const dayName = document.createElement("span");
    dayName.textContent = DAY_NAMES[d];
    const dayDate = document.createElement("small");
    dayDate.textContent = `${date.getDate()}.${date.getMonth() + 1}.`;
    title.append(dayName, " ", dayDate);
    if (section.classList.contains("is-today")) {
      const tag = document.createElement("em");
      tag.className = "today-tag";
      tag.textContent = "Heute";
      title.append(" ", tag);
    }

    const list = document.createElement("ul");
    for (const item of [...parse(week.days[d].join("\n")).values()].flat()) list.append(dishItem(item));
    section.append(title, list);
    menuEl.append(step(section));
  }

}

// Weekend without any of next week's menus online yet
function showLunchWeekendNote() {
  const monday = addDays(now, now.getDay() === 6 ? 2 : 1);
  document.getElementById("menu-title").textContent = "Unser Mittagsmenü";
  dateEl.textContent = "Wieder ab " + longDate(monday);
  menuEl.innerHTML = `<p class="empty">Das Mittagsmenü gibt es von Montag bis Freitag.<br>
    Am Wochenende empfehlen wir unsere
    <a href="#tagesempfehlung" data-tab="tagesempfehlung">Sa./So. Tagesempfehlung</a>
    und die <a href="#speisekarte" data-tab="speisekarte">Speisekarte</a>.</p>`;
}

// Weekend list ("Sa./So. Tagesempfehlung") – its own tab, like the Speisekarte.
// menu/tagesempfehlung/<Saturday's date>.txt covers Saturday AND Sunday; a file with Sunday's
// own date, if there is one, replaces it on Sunday.
// Mon–Fri: the tab appears as soon as the coming weekend's file exists (visible in advance).
// Sat/Sun: the tab is always there and opens first.
async function showWeekendList() {
  const tab = document.getElementById("tab-tagesempfehlung");
  const listEl = document.getElementById("weekend-menu");
  const saturday = addDays(now, now.getDay() === 0 ? -1 : 6 - now.getDay());
  const files = now.getDay() === 0 ? [today, iso(saturday)] : [iso(saturday)];

  let text = null;
  for (const date of files) {
    text = await fetchText(`menu/tagesempfehlung/${date}.txt`);
    if (text !== null) break;
  }

  if (text === null && !isWeekend) {
    // nothing for the coming weekend yet: no tab (and leave it if a link pointed here)
    if (tab.getAttribute("aria-selected") === "true") selectTab("mittagsmenu", { updateUrl: false });
    return;
  }

  document.getElementById("weekend-date").textContent = weekendDates(saturday);
  try {
    if (text === null) throw new Error("not online yet");
    render(parse(text), listEl);
  } catch {
    listEl.innerHTML = '<p class="empty">Die Tagesempfehlung für dieses Wochenende ist noch nicht online.<br>Bitte schauen Sie später wieder vorbei.</p>';
  }
  tab.hidden = false;
  moveIndicator();

}

loadMenu("menu/speisekarte.txt", document.getElementById("regular-menu"),
  "Die Speisekarte konnte nicht geladen werden.<br>Bitte versuchen Sie es später erneut.");

// url can be a list: the first file that exists is used
function loadMenu(url, el, emptyMessage) {
  const [first, ...rest] = [].concat(url);
  fetch(`${first}?v=${Date.now()}`)
    .then(response => {
      if (!response.ok) throw new Error(`No menu at ${first}`);
      return response.text();
    })
    .then(text => render(parse(text), el))
    .catch(error => {
      if (rest.length) return loadMenu(rest, el, emptyMessage);
      throw error;
    })
    .catch(() => {
      el.innerHTML = `<p class="empty">${emptyMessage}</p>`;
    });
}

// ---------- Tabs: (Tagesempfehlung) / Mittagsmenü / Speisekarte ----------
const menusSection = document.getElementById("menus");
const tabs = [...document.querySelectorAll('[role="tab"]')];
const tabNames = tabs.map(t => t.dataset.tab);

// Header highlight follows the part of the page you are looking at:
// menu card -> Menüs, events -> Veranstaltungen, gallery -> Galerie, footer -> Kontakt, top -> none.
const navLinks = [...document.querySelectorAll(".site-header nav a")];

function updateNav() {
  const line = window.innerHeight * 0.35;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  let section = atBottom ? "contact" : null;
  if (!section) {
    for (const id of ["events", "menus", "galerie", "contact"]) {
      const el = document.getElementById(id);
      if (!el || el.hidden) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) section = id;
    }
  }
  const openTab = tabs.find(t => t.getAttribute("aria-selected") === "true")?.dataset.tab;
  for (const link of navLinks) {
    const target = link.dataset.tab ? "menus" : link.hash.slice(1);
    const active = target === section && (!link.dataset.tab || link.dataset.tab === openTab);
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

let navFrame = 0;
window.addEventListener("scroll", () => {
  cancelAnimationFrame(navFrame);
  navFrame = requestAnimationFrame(updateNav);
}, { passive: true });
window.addEventListener("resize", updateNav);
window.addEventListener("load", updateNav);

// White pill that slides between the tabs
const tabList = document.querySelector(".tabs");
const tabIndicator = document.createElement("span");
tabIndicator.className = "tab-indicator";
tabIndicator.setAttribute("aria-hidden", "true");
tabList.prepend(tabIndicator);
tabList.classList.add("has-indicator");

function moveIndicator() {
  const active = tabs.find(t => t.getAttribute("aria-selected") === "true");
  if (!active) return;
  tabIndicator.style.width = `${active.offsetWidth}px`;
  tabIndicator.style.height = `${active.offsetHeight}px`;
  tabIndicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
}
moveIndicator();
document.fonts?.ready.then(moveIndicator);
window.addEventListener("resize", moveIndicator);

function selectTab(name, { focus = false, updateUrl = true } = {}) {
  for (const tab of tabs) {
    const on = tab.dataset.tab === name;
    tab.setAttribute("aria-selected", on);
    tab.tabIndex = on ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !on;
    if (on && focus) tab.focus();
  }
  moveIndicator();
  updateNav();
  if (updateUrl) history.replaceState(null, "", `#${name}`);
}

tabs.forEach(tab => {
  tab.addEventListener("click", () => selectTab(tab.dataset.tab));
  tab.addEventListener("keydown", e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const visible = tabs.filter(t => !t.hidden);
    const i = visible.indexOf(tab);
    selectTab(visible[(i + step + visible.length) % visible.length].dataset.tab, { focus: true });
  });
});

// Links with data-tab (e.g. in the Mittagsmenü weekend note) jump to the menu card and open that tab
document.addEventListener("click", e => {
  const link = e.target.closest("a[data-tab]");
  if (!link) return;
  e.preventDefault();
  selectTab(link.dataset.tab);
  menusSection.scrollIntoView({ block: "start" });
});

// Opening the page with #speisekarte (e.g. a shared link) shows that tab;
// without one, weekends open on the Sa./So. Tagesempfehlung since there is no Mittagsmenü
const startTab = location.hash.slice(1);
if (tabNames.includes(startTab)) {
  selectTab(startTab);
  requestAnimationFrame(() => menusSection.scrollIntoView({ block: "start" }));
} else if (isWeekend) {
  selectTab("tagesempfehlung", { updateUrl: false });
}

// Menu file format – one line each:
//   Kategorie | Gericht | Preis     e.g.  Menüs | Schweinsbraten mit Knödel | 11,90
//   Kategorie | Gericht             (no price)
//   Gericht | Preis   or   Gericht  (no category – short lists)
//   * Hinweis                       a small note shown under the menu
// Blank lines and lines starting with # are ignored.
// A numeric price is shown as "€ 11,90"; any other text (e.g. "inkl.") is shown as written.
// Ending a dish name with "(vegetarisch)" or "(vegan)" shows a small badge.
const PRICE = /^(€\s*)?\d+([.,]\d{1,2})?(\s*€)?$/;

function parse(text) {
  const groups = new Map();
  groups.notes = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("*")) { groups.notes.push(trimmed.slice(1).trim()); continue; }
    const parts = trimmed.split("|").map(s => s.trim());
    let category = "", name, price = "";
    if (parts.length >= 3) [category, name, price] = parts;
    else if (parts.length === 2 && PRICE.test(parts[1])) [name, price] = parts;
    else if (parts.length === 2) [category, name] = parts;
    else name = parts[0];
    if (!name) continue;
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ name, price: formatPrice(price) });
  }
  return groups;
}

function formatPrice(price) {
  if (!price) return "";
  if (!PRICE.test(price)) return price;                          // "inkl." etc.
  const amount = price.replace(/€/g, "").trim().replace(".", ",");
  const cents = /,\d\d$/.test(amount) ? "" : /,\d$/.test(amount) ? "0" : ",00";
  return `€ ${amount}${cents}`;
}

function render(groups, el) {
  if (groups.size === 0) throw new Error("Empty menu");
  el.textContent = "";
  const withPrices = [...groups.values()].flat().some(item => item.price);
  el.classList.toggle("has-prices", withPrices);   // dish left, price right
  let n = 0;                                   // running index for the cascade animation
  for (const [category, items] of groups) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = category;
    heading.style.setProperty("--i", n++);
    if (!category) heading.hidden = true;
    const list = document.createElement("ul");

    for (const item of items) {
      const li = dishItem(item);
      li.style.setProperty("--i", n++);
      list.append(li);
    }
    section.append(heading, list);
    el.append(section);
  }
  for (const text of groups.notes ?? []) {
    const note = document.createElement("p");
    note.className = "menu-note";
    note.textContent = text;
    note.style.setProperty("--i", n++);
    el.append(note);
  }
}

// One dish as <li>: name (+ vegetarisch/vegan badge) and, if given, its price
function dishItem(item) {
  const li = document.createElement("li");
  const name = document.createElement("span");
  name.className = "name";
  const tag = item.name.match(/\s*\((vegetarisch|vegetarian|vegan)\)\s*$/i);
  name.textContent = tag ? item.name.slice(0, tag.index) : item.name;
  if (tag) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = tag[1].toLowerCase() === "vegan" ? "vegan" : "vegetarisch";
    name.append(" ", badge);
  }
  li.append(name);
  if (item.price) {
    const price = document.createElement("span");
    price.className = "price";
    price.textContent = item.price;
    li.append(price);
    li.classList.add("has-price");
  }
  return li;
}

// ---------- Gallery ----------
// Photos are whatever image files sit in the gallery/ folder of the repo.
// On GitHub Pages the list comes from gallery.json (generated on every push);
// on a local preview server it falls back to the folder listing.
const PHOTO_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const PAGE_SIZE = 12;
const gallerySection = document.getElementById("galerie");
const galleryGrid = document.getElementById("gallery-grid");
const moreButton = document.getElementById("gallery-more");
let photos = [];
let shown = 0;

whenPageLoaded(() => loadPhotoList("gallery")
  .then(list => {
    photos = list
      .map(path => path.replace(/^\//, ""))
      .filter(path => PHOTO_EXT.test(path) && !fileName(path).startsWith("."))
      .sort(byPhotoOrder)
      .map(src => ({ src, caption: captionFor(src) }));
    if (photos.length === 0) return;
    gallerySection.hidden = false;
    document.getElementById("nav-gallery").hidden = false;
    fitNav();
    showMore();
  })
  .catch(() => { /* no gallery: section stays hidden */ }));

function whenPageLoaded(fn) {
  if (document.readyState === "complete") fn();
  else window.addEventListener("load", fn, { once: true });
}

// A photo is downloaded only when it is about to scroll into view (≈ 300 px ahead),
// much later than the browser's own loading="lazy", which starts far earlier.
const photoObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target;
        img.src = img.dataset.src;
        photoObserver.unobserve(img);
      }
    }, { rootMargin: "300px 0px" })
  : null;

// List the files in a folder of the repo (gallery/, events/): on GitHub Pages from
// <folder>.json (built by Jekyll on every push), on a local preview server from the folder listing.
function loadPhotoList(folder) {
  return fetch(`${folder}.json?v=${Date.now()}`)
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .catch(() =>
      fetch(`${folder}/`)
        .then(r => (r.ok ? r.text() : Promise.reject()))
        .then(html => [...new DOMParser().parseFromString(html, "text/html").querySelectorAll("a[href]")]
          .map(a => `${folder}/${a.getAttribute("href")}`))
    );
}

// Numbered photos (0010.jpg, 0020.jpg, 0025.jpg …) first, by number;
// photos with any other name come after them, alphabetically.
function photoNumber(path) {
  const base = fileName(path).replace(PHOTO_EXT, "");
  return /^\d+$/.test(base) ? Number(base) : Infinity;
}

function byPhotoOrder(a, b) {
  const na = photoNumber(a), nb = photoNumber(b);
  if (na !== nb) return na < nb ? -1 : 1;
  return fileName(a).localeCompare(fileName(b), "de", { numeric: true });
}

function fileName(path) {
  return decodeURIComponent(path.split("/").pop());
}

// "Weihnachtsfeier-2025.jpg" -> "Weihnachtsfeier 2025".
// Camera or random names (IMG_1234, 3wdnlV2O) get no caption: every part must be a real word or a number.
function captionFor(path) {
  const name = fileName(path).replace(PHOTO_EXT, "").replace(/^_preview-/, "");
  if (/^(img|dsc|pxl|dcim|photo|image|whatsapp|screenshot)/i.test(name)) return "";
  const words = name.split(/[-_\s]+/).filter(Boolean);
  const isWord = w => /^\d+$/.test(w) || /^[A-ZÄÖÜa-zäöüß][a-zäöüß]+$/.test(w);
  if (words.length === 0 || !words.every(isWord) || !words.some(w => /\D/.test(w))) return "";
  return words.join(" ");
}

function showMore() {
  const next = photos.slice(shown, shown + PAGE_SIZE);
  next.forEach((photo, i) => {
    const index = shown + i;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumb";
    button.setAttribute("aria-label", photo.caption || `Foto ${index + 1} öffnen`);
    const img = document.createElement("img");
    img.alt = photo.caption;
    img.loading = "lazy";
    img.decoding = "async";
    img.setAttribute("fetchpriority", "low");
    img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
    if (photoObserver) {
      img.dataset.src = photo.src;
      photoObserver.observe(img);
    } else {
      img.src = photo.src;
    }
    button.append(img);
    button.addEventListener("click", () => openLightbox(index));
    galleryGrid.append(button);
  });
  shown += next.length;
  moreButton.hidden = shown >= photos.length;
}

moreButton.addEventListener("click", showMore);

// ---------- Events ----------
// Posters in events/ are named with the event date: 2026-11-13.jpg (anything may follow the
// date, e.g. 2026-12-05-nikolaus.jpg). A poster shows until 06:00 (Klagenfurt time) the morning
// after its date, then disappears by itself. Posters are shown whole – never cropped.
const eventsBox = document.getElementById("events");
const viennaDate = d => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit"
}).format(d);
let events = [];

loadPhotoList("events")
  .then(list => {
    const cutoff = viennaDate(new Date(now.getTime() - 6 * 60 * 60 * 1000));   // "today", but the day lasts until 6:00
    events = list
      .map(path => path.replace(/^\//, ""))
      .filter(path => PHOTO_EXT.test(path) && !fileName(path).startsWith("."))
      .map(src => ({ src, date: fileName(src).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] }))
      .filter(e => e.date && e.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date) || a.src.localeCompare(b.src))
      .map(e => ({ ...e, caption: new Date(`${e.date}T12:00`).toLocaleDateString("de-AT", {
        weekday: "long", day: "numeric", month: "long"
      }) }));
    if (events.length === 0) return;

    // One poster slot. Every poster sits whole in an identical 2:3 frame; the leftover space
    // is filled with a blurred copy of the same poster, so different formats don't show.
    const listEl = document.getElementById("event-list");
    events.forEach((event, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "event";
      button.setAttribute("aria-label", `Veranstaltung am ${event.caption} – Plakat vergrößern`);
      const frame = document.createElement("span");
      frame.className = "event-frame";
      const backdrop = document.createElement("img");
      backdrop.className = "event-backdrop";
      backdrop.src = event.src;
      backdrop.alt = "";
      backdrop.setAttribute("aria-hidden", "true");
      const img = document.createElement("img");
      img.className = "event-poster";
      img.src = event.src;
      img.alt = `Plakat: Veranstaltung am ${event.caption}`;
      img.decoding = "async";
      frame.append(backdrop, img);
      const date = document.createElement("span");
      date.className = "event-date";
      date.textContent = event.caption;
      button.append(frame, date);
      button.addEventListener("click", () => openLightbox(index, events));
      listEl.append(button);
    });
    if (events.length > 1) setupEventSlider(listEl, events.length);
    eventsBox.hidden = false;
    eventsBox.closest(".hero-inner").classList.add("has-events");
    document.getElementById("nav-events").hidden = false;
    fitNav();
    updateNav();
  })
  .catch(() => { /* no events folder: nothing shown */ });

// Several posters: one at a time – ‹ dots › to switch, swipe on phones (native scrolling),
// and a gentle automatic switch every 7 s that pauses while the visitor is using it.
function setupEventSlider(listEl, count) {
  const controls = document.getElementById("event-controls");
  const dots = [];
  let index = 0;
  let paused = false;

  const go = i => {
    index = (i + count) % count;
    listEl.scrollTo({ left: index * listEl.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
    mark();
  };
  const mark = () => dots.forEach((dot, i) => dot.setAttribute("aria-current", i === index ? "true" : "false"));

  const arrow = (label, text, step) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "event-arrow";
    b.setAttribute("aria-label", label);
    b.textContent = text;
    b.addEventListener("click", () => go(index + step));
    return b;
  };
  const dotBox = document.createElement("span");
  dotBox.className = "event-dots";
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "event-dot";
    dot.setAttribute("aria-label", `Veranstaltung ${i + 1} von ${count}`);
    dot.addEventListener("click", () => go(i));
    dots.push(dot);
    dotBox.append(dot);
  }
  controls.append(arrow("Vorherige Veranstaltung", "‹", -1), dotBox, arrow("Nächste Veranstaltung", "›", 1));
  controls.hidden = false;
  mark();

  // follow swipes
  let scrollTimer = 0;
  listEl.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { index = Math.round(listEl.scrollLeft / listEl.clientWidth); mark(); }, 80);
  }, { passive: true });

  // auto-advance, paused while pointing at / touching / focusing the posters
  const box = listEl.closest(".hero-events");
  box.addEventListener("pointerenter", () => { paused = true; });
  box.addEventListener("pointerleave", () => { paused = false; });
  box.addEventListener("focusin", () => { paused = true; });
  box.addEventListener("focusout", () => { paused = false; });
  box.addEventListener("touchstart", () => { paused = true; }, { passive: true });
  if (!reduceMotion) setInterval(() => { if (!paused && !document.hidden) go(index + 1); }, 7000);
  window.addEventListener("resize", () => listEl.scrollTo({ left: index * listEl.clientWidth }));
}

// ---------- Lightbox ----------
const lightbox = document.getElementById("lightbox");
const lbImg = lightbox.querySelector("img");
const lbCaption = lightbox.querySelector(".lb-caption");
const lbCount = lightbox.querySelector(".lb-count");
let current = 0;
let lbList = [];

function openLightbox(index, list = photos) {
  lbList = list;
  showPhoto(index);
  lightbox.showModal();
}

function showPhoto(index, direction = 0) {
  current = (index + lbList.length) % lbList.length;
  const photo = lbList[current];
  lbImg.src = photo.src;
  // slide the new photo in from the side it comes from
  lbImg.classList.remove("slide-next", "slide-prev");
  if (direction) {
    void lbImg.offsetWidth;                    // restart the animation
    lbImg.classList.add(direction > 0 ? "slide-next" : "slide-prev");
  }
  lbImg.alt = photo.caption;
  lbCaption.textContent = photo.caption;
  const multiple = lbList.length > 1;
  lbCount.textContent = multiple ? `${current + 1} / ${lbList.length}` : "";
  lightbox.querySelector(".lb-prev").hidden = !multiple;
  lightbox.querySelector(".lb-next").hidden = !multiple;
}

lightbox.querySelector(".lb-close").addEventListener("click", () => lightbox.close());
lightbox.querySelector(".lb-prev").addEventListener("click", () => showPhoto(current - 1, -1));
lightbox.querySelector(".lb-next").addEventListener("click", () => showPhoto(current + 1, 1));
lightbox.addEventListener("click", e => { if (e.target === lightbox) lightbox.close(); });
lightbox.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") showPhoto(current + 1, 1);
  if (e.key === "ArrowLeft") showPhoto(current - 1, -1);
});

// Swipe left/right on phones
let touchX = null;
lightbox.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener("touchend", e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) showPhoto(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  touchX = null;
});

// ---------- Collapsible header menu ----------
// When the header links don't fit on one line (phones, or many links), they fold into a
// ☰ button that opens a vertical list. Measured, not a fixed breakpoint.
const siteHeader = document.querySelector(".site-header");
const headerInner = siteHeader.querySelector(".header-inner");
const siteNav = document.getElementById("site-nav");
const navToggle = siteHeader.querySelector(".nav-toggle");

function fitNav() {
  const wasOpen = siteHeader.classList.contains("nav-open");
  siteHeader.classList.remove("nav-collapsed", "nav-open");      // measure the one-line layout
  // fold as soon as the links would not fit with some room to spare
  const SPARE = 24;   // px
  const linksWidth = [...siteNav.children]
    .filter(a => !a.hidden)
    .reduce((sum, a) => sum + a.getBoundingClientRect().width, 0);
  const brand = siteHeader.querySelector(".header-brand");
  const brandWidth = brand.offsetParent ? brand.getBoundingClientRect().width : 0;   // 0 when hidden on phones
  const style = getComputedStyle(headerInner);
  const available = headerInner.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const tooTight = linksWidth + brandWidth + SPARE > available
    || siteNav.scrollWidth > siteNav.clientWidth + 1;
  siteHeader.classList.toggle("nav-collapsed", tooTight);
  setNavOpen(tooTight && wasOpen);
}

function setNavOpen(open) {
  siteHeader.classList.toggle("nav-open", open);
  navToggle.setAttribute("aria-expanded", open);
  navToggle.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
}

navToggle.addEventListener("click", () => setNavOpen(!siteHeader.classList.contains("nav-open")));
siteNav.addEventListener("click", e => { if (e.target.closest("a")) setNavOpen(false); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && siteHeader.classList.contains("nav-open")) {
    setNavOpen(false);
    navToggle.focus();
  }
});
document.addEventListener("click", e => {
  if (siteHeader.classList.contains("nav-open") && !siteHeader.contains(e.target)) setNavOpen(false);
});

fitNav();
document.fonts?.ready.then(fitNav);
window.addEventListener("resize", fitNav);

// ---------- Animations ----------

// Header gets a deeper shadow once the page is scrolled
const header = document.querySelector(".site-header");
const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

// Ripple that spreads from the click/tap point on buttons and links
document.addEventListener("pointerdown", e => {
  if (reduceMotion) return;
  const target = e.target.closest(".site-header nav a, .tabs [role='tab'], .more, .lb-btn, .contact-link .icon-box");
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  target.append(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
});

// Sections fade up as they scroll into view
const revealTargets = document.querySelectorAll("[data-reveal]");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach(el => el.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -10% 0px" });
  revealTargets.forEach(el => revealObserver.observe(el));
}

updateNav();
