#!/usr/bin/env node
// Construye la web y el feed OTE en dist/.
//   node scripts/build.mjs
// Variables opcionales: SITE_ORIGIN, BASE_PATH, LUMA_ICS_FILE (usar un .ics local), SKIP_ENRICH=1,
// BUILD_NOW (fecha simulada, para probar la portada)
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseIcs } from "./lib/ics.mjs";
import { normalizeEvents, historyToEvents, mergeEvents, resolveSpeakers, fetchOgDescription, manualEvents } from "./lib/events.mjs";
import { buildFeed } from "./lib/ote.mjs";
import { homeHtml, legalHtml, pickFeatured } from "./lib/render.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));

const config = json("data/site.json");
config.origin = process.env.SITE_ORIGIN ?? config.origin;
config.base = (process.env.BASE_PATH ?? config.base).replace(/\/$/, "");
config.icsUrl = `https://api.lu.ma/ics/get?entity=calendar&id=${config.lumaCalendarId}`;
const url = { origin: config.origin, base: config.base };

const warnings = [];
const warn = (msg) => {
  warnings.push(msg);
  console.warn(`${process.env.GITHUB_ACTIONS ? "::warning::" : "⚠️  "}${msg}`);
};

async function loadIcs() {
  if (process.env.LUMA_ICS_FILE) return readFileSync(process.env.LUMA_ICS_FILE, "utf8");
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(config.icsUrl, { headers: { "user-agent": "corunawtf-site-build" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error(`No se pudo descargar el calendario de Luma (${config.icsUrl}): ${lastError}`);
}

// 1. Eventos de Luma
const ics = await loadIcs();
if (!ics.trimStart().startsWith("BEGIN:VCALENDAR")) {
  throw new Error("La respuesta de Luma no es un calendario iCalendar; no se publica nada para no borrar los eventos.");
}
const { events: lumaEvents, warnings: icsWarnings } = normalizeEvents(parseIcs(ics), config, json("data/overrides.json"));
icsWarnings.forEach(warn);

// 2. Descripción de la página pública del evento, solo para los que no tienen texto propio (opcional)
if (!process.env.SKIP_ENRICH) {
  for (const e of lumaEvents.filter((e) => !e.description && e.url)) {
    try {
      e.description = await fetchOgDescription(e.url);
    } catch (error) {
      warn(`No se pudo leer la descripción de ${e.url}: ${error.message}`);
    }
  }
}

// 3. Histórico + Luma
const speakers = json("data/speakers.json");
const history = historyToEvents(json("data/history.json"), speakers, config);
const manual = manualEvents(json("data/events.json"), config);
const events = resolveSpeakers(mergeEvents([...lumaEvents, ...manual], history.events), speakers);
const undated = resolveSpeakers(history.undated, speakers);

// 4. Salida
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, "site/static"), dist, { recursive: true });

const content = json("data/content.json");
const icons = json("site/icons.json");
const now = process.env.BUILD_NOW ? new Date(process.env.BUILD_NOW) : new Date();
writeFileSync(join(dist, "index.html"), homeHtml({ config, url, content, events, undated, speakers, icons, now }));

for (const file of readdirSync(join(root, "site/legal"))) {
  const name = file.replace(/\.html$/, "");
  const source = read(`site/legal/${file}`);
  const title = /<!-- title: (.*?) -->/.exec(source)?.[1] ?? name;
  mkdirSync(join(dist, name), { recursive: true });
  writeFileSync(join(dist, name, "index.html"), legalHtml({ config, url, content, icons, featured: pickFeatured(events, now), title, path: `${name}/`, html: source.replace(/<!--.*?-->\n?/, "") }));
}

const feed = buildFeed(events, config);
writeFileSync(join(dist, "feed.json"), JSON.stringify(feed, null, 2) + "\n");

console.log(`Web generada en dist/: ${events.length} eventos con fecha (${lumaEvents.length} de Luma), ${undated.length} sin fecha, ${feed.events.length} en el feed OTE.`);
