import { parseM3U } from "./m3u-parser.js";
import { playItem } from "./player.js";

let allItems = [];
let currentType = "live";
let activeGroup = "Todas";
const FAVORITES_KEY = "smartiptv_favorites_v1";
const grid = document.getElementById("content-grid");
const categories = document.getElementById("category-list");
const search = document.getElementById("catalog-search");

function favorites() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); }
  catch { return new Set(); }
}
function key(item) { return item.url; }
function setFavorite(item) {
  const set = favorites();
  set.has(key(item)) ? set.delete(key(item)) : set.add(key(item));
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
}
function filteredItems() {
  let list = currentType === "favorites"
    ? allItems.filter(i => favorites().has(key(i)))
    : allItems.filter(i => i.type === currentType);
  if (activeGroup !== "Todas") list = list.filter(i => i.group === activeGroup);
  const q = search.value.trim().toLowerCase();
  if (q) list = list.filter(i => `${i.name} ${i.group}`.toLowerCase().includes(q));
  return list;
}
function renderCategories(list) {
  const groups = ["Todas", ...new Set(list.map(i => i.group).filter(Boolean))];
  categories.innerHTML = "";
  groups.forEach(group => {
    const btn = document.createElement("button");
    btn.className = "category-btn" + (activeGroup === group ? " active" : "");
    btn.textContent = group;
    btn.addEventListener("click", () => { activeGroup = group; render(); });
    categories.append(btn);
  });
}
function render() {
  const list = filteredItems();
  const source = currentType === "favorites" ? allItems.filter(i => favorites().has(key(i))) : allItems.filter(i => i.type === currentType);
  renderCategories(source);
  grid.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = allItems.length ? "No encontramos contenido con ese filtro." : "No se pudo cargar el catálogo. Comprueba la lista M3U.";
    grid.append(empty); return;
  }
  list.forEach(item => {
    const card = document.createElement("button");
    card.className = "content-card";
    const poster = document.createElement("div");
    poster.className = "poster";
    if (item.logo) {
      const img = document.createElement("img");
      img.src = item.logo; img.alt = ""; img.loading = "lazy";
      img.onerror = () => { img.remove(); poster.textContent = "▶"; };
      poster.append(img);
    } else poster.textContent = "▶";
    const name = document.createElement("span");
    name.className = "content-name"; name.textContent = item.name;
    const group = document.createElement("span");
    group.className = "content-group"; group.textContent = item.group;
    card.append(poster, name, group);
    card.addEventListener("click", () => playItem(item));
    grid.append(card);
  });
}
export async function loadPlaylist(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`La lista respondió con estado ${response.status}.`);
  const text = await response.text();
  allItems = parseM3U(text);
  if (!allItems.length) throw new Error("La lista no contiene entradas M3U reconocibles.");
  render();
  return allItems.length;
}
export function showCatalog(type) {
  currentType = type;
  activeGroup = "Todas";
  search.value = "";
  const names = { live: "TV en directo", movies: "Películas", series: "Series", favorites: "Favoritos" };
  document.getElementById("catalog-title").textContent = names[type] || "Contenido";
  document.getElementById("catalog-eyebrow").textContent = "TU CONTENIDO";
  render();
}
search.addEventListener("input", render);
