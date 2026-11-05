// Analizador básico M3U. Clasifica por group-title y atributos comunes.
// No descarga ni modifica los enlaces del proveedor.
function attr(line, name) {
  const match = line.match(new RegExp(name + '="([^"]*)"', "i"));
  return match ? match[1].trim() : "";
}
export function parseM3U(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const items = [];
  let pending = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF")) {
      const comma = line.lastIndexOf(",");
      pending = {
        name: comma >= 0 ? line.slice(comma + 1).trim() : "Contenido sin título",
        group: attr(line, "group-title") || "Otros",
        logo: attr(line, "tvg-logo"),
        tvgId: attr(line, "tvg-id"),
        type: "live"
      };
    } else if (!line.startsWith("#") && pending) {
      const item = { ...pending, url: line };
      const g = item.group.toLowerCase();
      const name = item.name.toLowerCase();
      if (/series|temporada|episodio/.test(g)) item.type = "series";
      else if (/pel[ií]cula|movie|cine|vod/.test(g)) item.type = "movies";
      else if (/\.(mp4|mkv|avi)(\?|$)/i.test(line) || /pel[ií]cula|movie/.test(name)) item.type = "movies";
      items.push(item);
      pending = null;
    }
  }
  return items;
}
