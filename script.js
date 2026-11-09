// Today's date in the visitor's local time, formatted YYYY-MM-DD
const today = new Date().toLocaleDateString("sv-SE");

const menuEl = document.getElementById("menu");
const dateEl = document.getElementById("date");

dateEl.textContent = new Date().toLocaleDateString("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
});

fetch(`menu/${today}.txt?v=${Date.now()}`)
  .then(response => {
    if (!response.ok) throw new Error("No menu file for today");
    return response.text();
  })
  .then(text => render(parse(text)))
  .catch(() => {
    menuEl.textContent = "Today's menu isn't available yet. Please check back soon.";
  });

// Each line: Category | Dish name | Price
// Blank lines and lines starting with # are ignored.
function parse(text) {
  const groups = new Map();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [category, name, price] = trimmed.split("|").map(s => s.trim());
    if (!category || !name) continue;
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ name, price });
  }
  return groups;
}

function render(groups) {
  if (groups.size === 0) throw new Error("Empty menu");
  menuEl.textContent = "";
  for (const [category, items] of groups) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = category;
    const list = document.createElement("ul");

    for (const item of items) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = item.name;
      li.append(name);
      if (item.price) {
        const price = document.createElement("span");
        price.className = "price";
        price.textContent = `${item.price} €`;
        li.append(price);
      }
      list.append(li);
    }
    section.append(heading, list);
    menuEl.append(section);
  }
}
