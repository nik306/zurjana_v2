// Animations are switched off for visitors who ask their device for reduced motion
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js");

// Today's date in the visitor's local time, formatted YYYY-MM-DD
const now = new Date();
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
loadMenu(`menu/${today}.txt`, menuEl,
  "Das heutige Mittagsmenü ist noch nicht online.<br>Bitte schauen Sie später wieder vorbei.");
loadMenu("menu/speisekarte.txt", document.getElementById("regular-menu"),
  "Die Speisekarte konnte nicht geladen werden.<br>Bitte versuchen Sie es später erneut.");

function loadMenu(url, el, emptyMessage) {
  fetch(`${url}?v=${Date.now()}`)
    .then(response => {
      if (!response.ok) throw new Error(`No menu at ${url}`);
      return response.text();
    })
    .then(text => render(parse(text), el))
    .catch(() => {
      el.innerHTML = `<p class="empty">${emptyMessage}</p>`;
    });
}

// ---------- Tabs: Mittagsmenü / Speisekarte ----------
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
    for (const id of ["menus", "galerie", "contact"]) {
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

function selectTab(name, { focus = false } = {}) {
  for (const tab of tabs) {
    const on = tab.dataset.tab === name;
    tab.setAttribute("aria-selected", on);
    tab.tabIndex = on ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !on;
    if (on && focus) tab.focus();
  }
  moveIndicator();
  updateNav();
  history.replaceState(null, "", `#${name}`);
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

// Header links and the button jump to the menu card and open the right tab
for (const link of document.querySelectorAll("a[data-tab]")) {
  link.addEventListener("click", e => {
    e.preventDefault();
    selectTab(link.dataset.tab);
    menusSection.scrollIntoView({ block: "start" });
  });
}

// Opening the page with #speisekarte (e.g. a shared link) shows that tab
const startTab = location.hash.slice(1);
if (tabNames.includes(startTab)) {
  selectTab(startTab);
  requestAnimationFrame(() => menusSection.scrollIntoView({ block: "start" }));
}

// Each line: Category | Dish name   (anything after a second | is ignored)
// Blank lines and lines starting with # are ignored.
// Ending a dish name with "(vegetarisch)" or "(vegan)" shows a small badge.
function parse(text) {
  const groups = new Map();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [category, name] = trimmed.split("|").map(s => s.trim());
    if (!category || !name) continue;
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

whenPageLoaded(() => loadPhotoList()
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

function loadPhotoList() {
  return fetch(`gallery.json?v=${Date.now()}`)
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .catch(() =>
      fetch("gallery/")
        .then(r => (r.ok ? r.text() : Promise.reject()))
        .then(html => [...new DOMParser().parseFromString(html, "text/html").querySelectorAll("a[href]")]
          .map(a => `gallery/${a.getAttribute("href")}`))
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

// ---------- Lightbox ----------
const lightbox = document.getElementById("lightbox");
const lbImg = lightbox.querySelector("img");
const lbCaption = lightbox.querySelector(".lb-caption");
const lbCount = lightbox.querySelector(".lb-count");
let current = 0;

function openLightbox(index) {
  showPhoto(index);
  lightbox.showModal();
}

function showPhoto(index, direction = 0) {
  current = (index + photos.length) % photos.length;
  const photo = photos[current];
  lbImg.src = photo.src;
  // slide the new photo in from the side it comes from
  lbImg.classList.remove("slide-next", "slide-prev");
  if (direction) {
    void lbImg.offsetWidth;                    // restart the animation
    lbImg.classList.add(direction > 0 ? "slide-next" : "slide-prev");
  }
  lbImg.alt = photo.caption;
  lbCaption.textContent = photo.caption;
  lbCount.textContent = `${current + 1} / ${photos.length}`;
  const multiple = photos.length > 1;
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
