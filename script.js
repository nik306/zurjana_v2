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

if (isWeekend) {
  showWeekendList();
} else {
  document.getElementById("tab-tagesempfehlung").remove();
  document.getElementById("panel-tagesempfehlung").remove();
}
setupLunchMenus();

function fetchText(url) {
  return fetch(`${url}?v=${Date.now()}`)
    .then(r => (r.ok ? r.text() : null))
    .catch(() => null);
}

// Mittagsmenü: today plus every upcoming weekday that already has a file, as day buttons.
// On weekdays the coming weekend's Tagesempfehlung is included (in date order), if it is already online.
// On weekends there is no "today" – the row shows next week's menus, if any exist yet.
async function setupLunchMenus() {
  const days = [];
  for (let i = 0; i < LOOK_AHEAD_DAYS; i++) {
    const d = addDays(now, i);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(d);
  }
  const texts = await Promise.all(days.map(d => fetchText(`menu/${iso(d)}.txt`)));

  const options = [];
  days.forEach((date, i) => {
    const isToday = iso(date) === today;
    if (texts[i] !== null || isToday) options.push({ kind: "day", date, text: texts[i], isToday });
  });

  if (!isWeekend) {
    const saturday = addDays(now, 6 - now.getDay());
    const text = await fetchText(`menu/tagesempfehlung/${iso(saturday)}.txt`);
    if (text !== null) options.push({ kind: "weekend", date: saturday, text });
  }
  options.sort((a, b) => a.date - b.date);   // weekend sits between Friday and Monday

  if (options.length === 0) return showLunchWeekendNote();

  const picker = document.getElementById("day-picker");
  if (options.length > 1) {
    const tomorrow = iso(addDays(now, 1));
    for (const option of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = option.kind === "weekend" ? "day day--weekend" : "day";
      const top = document.createElement("span");
      const bottom = document.createElement("small");
      if (option.kind === "weekend") {
        top.textContent = "Sa./So.";
        bottom.textContent = "Tagesempfehlung";
      } else {
        const d = option.date;
        top.textContent = option.isToday ? "Heute"
          : iso(d) === tomorrow ? "Morgen"
          : d.toLocaleDateString("de-AT", { weekday: "short" });
        bottom.textContent = `${d.getDate()}.${d.getMonth() + 1}.`;
      }
      button.append(top, bottom);
      button.addEventListener("click", () => showLunchOption(option, picker));
      option.button = button;
      const divider = () => {
        const line = document.createElement("span");
        line.className = "day-divider";
        line.setAttribute("aria-hidden", "true");
        return line;
      };
      if (option.kind === "weekend" && picker.childElementCount) picker.append(divider());
      picker.append(button);
      if (option.kind === "weekend" && option !== options.at(-1)) picker.append(divider());
    }
    picker.hidden = false;
  }
  showLunchOption(options[0], picker);
}

function showLunchOption(option, picker) {
  for (const b of picker.querySelectorAll(".day")) b.setAttribute("aria-pressed", b === option.button);
  const eyebrow = document.querySelector("#panel-mittagsmenu .eyebrow");
  const title = document.getElementById("menu-title");

  if (option.kind === "weekend") {
    eyebrow.textContent = "Samstag & Sonntag";
    title.textContent = "Sa./So. Tagesempfehlung";
    dateEl.textContent = weekendDates(option.date);
  } else {
    eyebrow.textContent = "Montag bis Freitag";
    title.textContent = option.isToday ? "Das heutige Mittagsmenü"
      : `Mittagsmenü am ${option.date.toLocaleDateString("de-AT", { weekday: "long" })}`;
    dateEl.textContent = longDate(option.date, true);
  }

  try {
    if (option.text === null) throw new Error("not online yet");
    render(parse(option.text), menuEl);
  } catch {
    menuEl.innerHTML = '<p class="empty">Das heutige Mittagsmenü ist noch nicht online.<br>Bitte schauen Sie später wieder vorbei.</p>';
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

// Weekend list: menu/tagesempfehlung/<Saturday's date>.txt is shown on Saturday AND Sunday.
// A file with Sunday's own date, if there is one, replaces it on Sunday.
function showWeekendList() {
  const saturday = new Date(now);
  if (now.getDay() === 0) saturday.setDate(now.getDate() - 1);
  document.getElementById("weekend-date").textContent = weekendDates(saturday);

  const files = [`menu/tagesempfehlung/${today}.txt`];
  if (now.getDay() === 0) files.push(`menu/tagesempfehlung/${saturday.toLocaleDateString("sv-SE")}.txt`);
  loadMenu(files, document.getElementById("weekend-menu"),
    "Die Tagesempfehlung für dieses Wochenende ist noch nicht online.<br>Bitte schauen Sie später wieder vorbei.");

  // the header's "Mittagsmenü" link becomes "Tagesempfehlung" for the weekend
  const navLink = document.querySelector('.site-header nav a[data-tab="mittagsmenu"]');
  if (navLink) {
    navLink.dataset.tab = "tagesempfehlung";
    navLink.href = "#tagesempfehlung";
    navLink.querySelector("span").textContent = "Tagesempfehlung";
  }
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
// menu card -> the open tab's link, gallery -> Galerie, footer -> Kontakt, top -> none.
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
  tabIndicator.style.transform = `translateX(${active.offsetLeft - tabList.clientLeft}px)`;
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

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab.dataset.tab));
  tab.addEventListener("keydown", e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    selectTab(tabs[(i + step + tabs.length) % tabs.length].dataset.tab, { focus: true });
  });
});

// Header links (and the weekend link in the Mittagsmenü panel) jump to the menu card and open the right tab
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

// Each line: Category | Dish name   (anything after a second | is ignored)
// Blank lines and lines starting with # are ignored.
// Ending a dish name with "(vegetarisch)" or "(vegan)" shows a small badge.
function parse(text) {
  const groups = new Map();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("|").map(s => s.trim());
    // "Kategorie | Gericht", or just "Gericht" for short lists without categories
    const [category, name] = parts.length > 1 ? parts : ["", parts[0]];
    if (!name) continue;
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ name });
  }
  return groups;
}

function render(groups, el) {
  if (groups.size === 0) throw new Error("Empty menu");
  el.textContent = "";
  let n = 0;                                   // running index for the cascade animation
  for (const [category, items] of groups) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = category;
    heading.style.setProperty("--i", n++);
    if (!category) heading.hidden = true;
    const list = document.createElement("ul");

    for (const item of items) {
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
      li.style.setProperty("--i", n++);
      list.append(li);
    }
    section.append(heading, list);
    el.append(section);
  }
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

    const listEl = document.getElementById("event-list");
    events.forEach((event, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "event";
      button.setAttribute("aria-label", `Veranstaltung am ${event.caption} – Plakat vergrößern`);
      const img = document.createElement("img");
      img.src = event.src;
      img.alt = `Plakat: Veranstaltung am ${event.caption}`;
      img.decoding = "async";
      const date = document.createElement("span");
      date.className = "event-date";
      date.textContent = event.caption;
      button.append(img, date);
      button.addEventListener("click", () => openLightbox(index, events));
      listEl.append(button);
    });
    eventsBox.hidden = false;
    eventsBox.closest(".hero-inner").classList.add("has-events");
    document.getElementById("nav-events").hidden = false;
    updateNav();
  })
  .catch(() => { /* no events folder: nothing shown */ });

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
