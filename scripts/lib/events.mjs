// Convierte los VEVENT de Luma en el modelo de evento que usan la web y el feed OTE.

const COUNTRIES = { spain: "ES", españa: "ES", portugal: "PT", france: "FR", francia: "FR" };
const LUMA_URL = /https?:\/\/(?:luma\.com|lu\.ma)\/[^\s)>"]+/i;

export const slugify = (text) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Hora de pared en `timeZone` de un instante UTC -> { date: "YYYY-MM-DD", time: "HH:MM" }
export function wallClock(instant, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(instant).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function when(d, timeZone) {
  if (!d) return null;
  if (d.instant) return wallClock(d.instant, timeZone);
  return { date: d.localDate, time: d.localTime }; // día completo u hora local ya dada
}

// "Sngular A Coruña, Rúa Sor Joaquina, 6, Entreplanta, 15011 A Coruña, Spain"
export function parseLocation(raw) {
  if (!raw) return null;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (/^https?:\/\//i.test(raw)) return { onlineUrl: raw };
  if (parts.length < 3) return { venue: parts[0] };
  const country = COUNTRIES[parts.at(-1).toLowerCase()];
  const cityPart = /^(\d{5})\s+(.+)$/.exec(parts.at(-2));
  const street = parts.slice(1, cityPart ? -2 : -1).join(", ");
  const address = {
    ...(street && { street }),
    ...(cityPart && { postalCode: cityPart[1], locality: cityPart[2] }),
    ...(country && { country }),
  };
  return { venue: parts[0], ...(Object.keys(address).length && { address }) };
}

// Luma geolocaliza la sala por su cuenta y su calle puede no coincidir con la oficial: si el evento es en
// nuestra sede (`venue` en data/site.json), se usa la dirección de la configuración.
function resolveVenue(location, venue) {
  if (!location?.venue || !venue) return location;
  const same = slugify(location.venue).startsWith(slugify(venue.venue));
  return same ? venue : location;
}

// "Hosted by CoruñaWTF, Jesús Pérez & Andrea Magán" -> [{name, type}]
function parseHosts(description, orgName) {
  const m = /Hosted by (.+)/i.exec(description);
  if (!m) return [];
  return m[1].split(/\s*(?:,|&| y )\s*/).map((s) => s.trim()).filter(Boolean)
    .map((name) => ({ name, type: name.toLowerCase() === orgName.toLowerCase() ? "organization" : "person" }));
}

// La descripción del ICS de Luma solo trae texto de cortesía; lo quitamos para no mostrarlo.
function cleanDescription(description) {
  return description
    .split(/\n/)
    .filter((l) => !/^(Get up-to-date information at:|Address:|Hosted by )/i.test(l.trim()))
    .join("\n").trim();
}

export function seasonOf(date, offset) {
  const [y, m] = date.split("-").map(Number);
  const startYear = m >= 9 ? y : y - 1;
  return { number: startYear - offset, title: `Temporada ${startYear - offset}` };
}

export function normalizeEvents(vevents, config, overrides = {}) {
  const tz = config.timezone;
  const out = [];
  const warnings = [];
  for (const v of vevents) {
    const start = when(v.start, tz);
    if (!v.summary || !start) {
      warnings.push(`Evento sin título o sin fecha (${v.uid ?? "?"}); se omite.`);
      continue;
    }
    const url = v.url ?? LUMA_URL.exec(v.description)?.[0] ?? null;
    const key = url ? new URL(url).pathname.replace(/^\/|\/$/g, "") : slugify(v.summary);
    const extra = overrides[key] ?? overrides[v.uid] ?? {};
    const end = when(v.end, tz);
    out.push({
      key,
      uid: v.uid,
      title: extra.title ?? v.summary,
      subtitle: extra.subtitle ?? "",
      description: extra.description ?? cleanDescription(v.description),
      url,
      slides: extra.slides ?? null,
      startDate: start.date,
      startTime: start.time,
      endDate: end?.date ?? null,
      endTime: end?.time ?? null,
      allDay: !start.time,
      startAt: v.start?.instant?.toISOString() ?? null,
      endAt: v.end?.instant?.toISOString() ?? null,
      location: resolveVenue(parseLocation(v.location), config.venue),
      organizers: parseHosts(v.description, config.organization),
      speakers: extra.speakers ?? [],
      status: v.status === "CANCELLED" ? "cancelled" : "scheduled",
      updatedAt: v.lastModified,
      season: seasonOf(start.date, config.seasonOffset),
    });
  }
  out.sort((a, b) => `${b.startDate}T${b.startTime ?? ""}`.localeCompare(`${a.startDate}T${a.startTime ?? ""}`));
  return { events: out, warnings };
}

// og:description de la página pública del evento (opcional; si falla, no pasa nada)
export async function fetchOgDescription(url, fetchImpl = fetch) {
  const res = await fetchImpl(url, { headers: { "user-agent": "corunawtf-site-build" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const m = /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i.exec(html) ??
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i.exec(html);
  if (!m) return "";
  return m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

// Histórico anterior a Luma (data/history.json): con fecha pasa a ser un evento normal; sin fecha solo se muestra en la web.
export function historyToEvents(history, speakers, config) {
  const byId = new Map(speakers.map((s) => [s.id, s]));
  const events = [];
  const undated = [];
  for (const h of history) {
    const people = (h.speakers ?? []).map((sp) => (typeof sp === "string" ? { id: sp, name: byId.get(sp)?.name ?? sp } : sp));
    const base = {
      uid: null, title: h.title, subtitle: h.subtitle ?? "", description: h.description ?? "", url: h.url ?? null, slides: h.slides ?? null,
      endDate: null, endTime: null, startAt: null, endAt: null, location: null, organizers: [], speakers: people, status: "scheduled", updatedAt: null,
    };
    if (h.date) {
      events.push({ ...base, key: `${slugify(h.title)}-${h.date}`, startDate: h.date, startTime: h.time ?? null, allDay: !h.time, season: seasonOf(h.date, config.seasonOffset) });
    } else {
      undated.push({ ...base, key: slugify(`${h.season}-${h.title}`), month: h.month, season: { title: h.season } });
    }
  }
  return { events, undated };
}

// Si un evento del histórico ya llega desde Luma (mismo título y día), gana el de Luma.
export function mergeEvents(luma, history) {
  const seen = new Set(luma.map((e) => `${slugify(e.title)}|${e.startDate}`));
  const all = [...luma, ...history.filter((e) => !seen.has(`${slugify(e.title)}|${e.startDate}`))];
  return all.sort((a, b) => `${b.startDate}T${b.startTime ?? ""}`.localeCompare(`${a.startDate}T${a.startTime ?? ""}`));
}

// Los ponentes con `id` se resuelven contra data/speakers.json (nombre, foto); los que solo traen `name` se muestran como texto.
export function resolveSpeakers(events, speakers) {
  const byId = new Map(speakers.map((s) => [s.id, s]));
  return events.map((e) => ({
    ...e,
    speakers: e.speakers.map((s) => (s.id && byId.has(s.id) ? { id: s.id, name: byId.get(s.id).name, url: byId.get(s.id).links?.[0]?.url } : s)),
  }));
}
