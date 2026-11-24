// Lector mínimo de iCalendar (RFC 5545) para el feed público de un calendario de Luma.
// Sin dependencias. Solo entiende lo que necesitamos de un VEVENT.

const unfold = (text) => text.replace(/\r?\n[ \t]/g, "");

const unescapeText = (s) =>
  s.replace(/\\([nN,;\\])/g, (_, c) => (c === "n" || c === "N" ? "\n" : c));

// "DTSTART;TZID=Europe/Madrid;VALUE=DATE-TIME:2026..." -> { name, params, value }
function parseLine(line) {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const [name, ...rest] = line.slice(0, colon).split(";");
  const params = {};
  for (const p of rest) {
    const [k, v] = p.split("=");
    if (k) params[k.toUpperCase()] = (v ?? "").replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

// Devuelve { instant: Date|null, localDate: "YYYY-MM-DD", localTime: "HH:MM"|null, tzid }
// - "20261029T183000Z"           -> instante UTC
// - "20261029T193000" + TZID     -> hora local de ese TZID (instant queda null)
// - ";VALUE=DATE:20261029"       -> día completo
export function parseIcsDate({ value, params }) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  const date = `${y}-${mo}-${d}`;
  if (h === undefined) return { instant: null, localDate: date, localTime: null, tzid: null, allDay: true };
  if (z) return { instant: new Date(`${date}T${h}:${mi}:${s ?? "00"}Z`), localDate: null, localTime: null, tzid: "UTC", allDay: false };
  return { instant: null, localDate: date, localTime: `${h}:${mi}`, tzid: params.TZID ?? null, allDay: false };
}

export function parseIcs(text) {
  const events = [];
  let current = null;
  for (const raw of unfold(text).split(/\r?\n/)) {
    if (raw === "BEGIN:VEVENT") current = {};
    else if (raw === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const line = parseLine(raw);
      if (line) current[line.name] = line; // si se repite una propiedad, gana la última
    }
  }
  return events.map((e) => ({
    uid: e.UID?.value ?? null,
    summary: e.SUMMARY ? unescapeText(e.SUMMARY.value).trim() : "",
    description: e.DESCRIPTION ? unescapeText(e.DESCRIPTION.value) : "",
    location: e.LOCATION ? unescapeText(e.LOCATION.value).trim() : "",
    url: e.URL?.value ?? null,
    status: e.STATUS?.value?.toUpperCase() ?? null,
    start: e.DTSTART ? parseIcsDate(e.DTSTART) : null,
    end: e.DTEND ? parseIcsDate(e.DTEND) : null,
    lastModified: e["LAST-MODIFIED"] ? parseIcsDate(e["LAST-MODIFIED"])?.instant ?? null : null,
  }));
}
