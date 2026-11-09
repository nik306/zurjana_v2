// Today's date in the visitor's local time, formatted YYYY-MM-DD
const now = new Date();
const today = now.toLocaleDateString("sv-SE");

const menuEl = document.getElementById("menu");
const dateEl = document.getElementById("date");
document.getElementById("year").textContent = now.getFullYear();

dateEl.textContent = now.toLocaleDateString("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
});

// Highlight today's row in the opening hours
const todayRow = document.querySelector(`.hours [data-day="${now.getDay()}"]`);
if (todayRow) todayRow.classList.add("is-today");

// ---------- Menus ----------
loadMenu(`menu/${today}.txt`, menuEl,
  "Today's menu isn't available yet.<br>Please check back soon.");
loadMenu("menu/speisekarte.txt", document.getElementById("regular-menu"),
  "The menu couldn't be loaded.<br>Please try again later.");

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

function selectTab(name, { focus = false } = {}) {
  for (const tab of tabs) {
    const on = tab.dataset.tab === name;
    tab.setAttribute("aria-selected", on);
    tab.tabIndex = on ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !on;
    if (on && focus) tab.focus();
  }
  for (const link of document.querySelectorAll("nav a[data-tab]")) {
    link.classList.toggle("is-active", link.dataset.tab === name);
  }
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
} else {
  document.querySelector('nav a[data-tab="mittagsmenu"]')?.classList.add("is-active");
}

// Each line: Category | Dish name   (anything after a second | is ignored)
// Blank lines and lines starting with # are ignored.
// Ending a dish name with "(vegetarian)" or "(vegan)" shows a small badge.
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
  for (const [category, items] of groups) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = category;
    const list = document.createElement("ul");

    for (const item of items) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "name";

      const tag = item.name.match(/\s*\((vegetarian|vegan)\)\s*$/i);
      name.textContent = tag ? item.name.slice(0, tag.index) : item.name;
      if (tag) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = tag[1].toLowerCase();
        name.append(" ", badge);
      }

      li.append(name);
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

loadPhotoList()
  .then(list => {
    photos = list
      .map(path => path.replace(/^\//, ""))
      .filter(path => PHOTO_EXT.test(path) && !fileName(path).startsWith("."))
      .sort((a, b) => fileName(b).localeCompare(fileName(a), undefined, { numeric: true }))
      .map(src => ({ src, caption: captionFor(src) }));
    if (photos.length === 0) return;
    gallerySection.hidden = false;
    document.getElementById("nav-gallery").hidden = false;
    showMore();
  })
  .catch(() => { /* no gallery: section stays hidden */ });

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

function fileName(path) {
  return decodeURIComponent(path.split("/").pop());
}

// "Weihnachtsfeier-2025.jpg" -> "Weihnachtsfeier 2025"; camera names like IMG_1234 get no caption
function captionFor(path) {
  const name = fileName(path).replace(PHOTO_EXT, "").replace(/^_preview-/, "");
  if (/^(img|dsc|pxl|dcim|photo|image|whatsapp|screenshot|\d)/i.test(name)) return "";
  return name.replace(/[-_]+/g, " ").trim();
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
    img.src = photo.src;
    img.alt = photo.caption;
    img.loading = "lazy";
    img.decoding = "async";
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

function showPhoto(index) {
  current = (index + photos.length) % photos.length;
  const photo = photos[current];
  lbImg.src = photo.src;
  lbImg.alt = photo.caption;
  lbCaption.textContent = photo.caption;
  lbCount.textContent = `${current + 1} / ${photos.length}`;
  const multiple = photos.length > 1;
  lightbox.querySelector(".lb-prev").hidden = !multiple;
  lightbox.querySelector(".lb-next").hidden = !multiple;
}

lightbox.querySelector(".lb-close").addEventListener("click", () => lightbox.close());
lightbox.querySelector(".lb-prev").addEventListener("click", () => showPhoto(current - 1));
lightbox.querySelector(".lb-next").addEventListener("click", () => showPhoto(current + 1));
lightbox.addEventListener("click", e => { if (e.target === lightbox) lightbox.close(); });
lightbox.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") showPhoto(current + 1);
  if (e.key === "ArrowLeft") showPhoto(current - 1);
});

// Swipe left/right on phones
let touchX = null;
lightbox.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener("touchend", e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) showPhoto(current + (dx < 0 ? 1 : -1));
  touchX = null;
});
