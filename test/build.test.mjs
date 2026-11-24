import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseIcs } from "../scripts/lib/ics.mjs";
import { normalizeEvents, parseLocation, wallClock, seasonOf } from "../scripts/lib/events.mjs";
import { buildFeed } from "../scripts/lib/ote.mjs";
import { pickFeatured, homeHtml } from "../scripts/lib/render.mjs";

const config = {
  venue: { venue: "Sngular A Coruña", address: { street: "Rúa Sor Joaquina, 2, Bajo", postalCode: "15011", locality: "A Coruña", country: "ES" } },
  title: "CoruñaWTF", description: "x", organization: "CoruñaWTF", origin: "https://corunawtf.github.io", base: "/page",
  timezone: "Europe/Madrid", license: "CC-BY-4.0", seasonOffset: 2021,
};
const ics = readFileSync(new URL("./fixtures/luma.ics", import.meta.url), "utf8");

test("el ICS de Luma se lee entero (escapes, fechas UTC)", () => {
  const [a, b] = parseIcs(ics);
  assert.equal(parseIcs(ics).length, 2);
  assert.equal(a.summary, "Organizar un evento para 600 personas sin morir en el intento");
  assert.equal(b.summary, "Metadatos, rastros y fuentes abiertas: la otra cara de la web");
  assert.equal(a.start.instant.toISOString(), "2026-10-29T18:30:00.000Z");
});

test("las horas UTC se pasan a hora de Madrid, con horario de invierno y de verano", () => {
  assert.deepEqual(wallClock(new Date("2026-10-29T18:30:00Z"), "Europe/Madrid"), { date: "2026-10-29", time: "19:30" });
  assert.deepEqual(wallClock(new Date("2026-06-04T17:30:00Z"), "Europe/Madrid"), { date: "2026-06-04", time: "19:30" });
  assert.deepEqual(wallClock(new Date("2026-12-10T23:30:00Z"), "Europe/Madrid"), { date: "2026-12-11", time: "00:30" });
});

test("la dirección se separa en sala, calle, código postal y país", () => {
  assert.deepEqual(parseLocation("Sngular A Coruña, Rúa Sor Joaquina, 6, Entreplanta, 15011 A Coruña, Spain"), {
    venue: "Sngular A Coruña",
    address: { street: "Rúa Sor Joaquina, 6, Entreplanta", postalCode: "15011", locality: "A Coruña", country: "ES" },
  });
  assert.deepEqual(parseLocation("https://meet.example.org/abc"), { onlineUrl: "https://meet.example.org/abc" });
});

test("las temporadas empiezan en septiembre", () => {
  assert.equal(seasonOf("2026-10-29", 2021).title, "Temporada 5");
  assert.equal(seasonOf("2026-05-28", 2021).title, "Temporada 4");
  assert.equal(seasonOf("2023-01-17", 2021).title, "Temporada 1");
});

test("el evento de Luma pasa a OTE con anfitriones, URL de Luma y ponente del archivo de ajustes", () => {
  const { events } = normalizeEvents(parseIcs(ics), config, { "3gmwi392": { speakers: [{ name: "Ana" }] } });
  const [e] = buildFeed(events, config).events.filter((x) => x.id === "https://luma.com/3gmwi392");
  assert.equal(e.startDate, "2026-10-29T19:30");
  assert.equal(e.endDate, "2026-10-29T22:00");
  assert.equal(e.timezone, "Europe/Madrid");
  assert.deepEqual(e.organizers.map((o) => o.name), ["CoruñaWTF", "Jesús Ángel Pérez-Roca Fernández", "Andrea Magán Rey"]);
  assert.deepEqual(e.speakers, [{ name: "Ana", type: "person" }]);
});

test("el feed solo incluye eventos desde `coversFrom`", () => {
  const { events } = normalizeEvents(parseIcs(ics), config, {});
  assert.equal(buildFeed(events, { ...config, coversFrom: "2026-11-01" }).events.length, 1);
});

test("los eventos en nuestra sede usan la dirección oficial, no la que Luma geolocaliza", () => {
  const { events } = normalizeEvents(parseIcs(ics), config, {});
  const [e] = buildFeed(events, config).events;
  assert.equal(e.location.venue, "Sngular A Coruña");
  assert.equal(e.location.address.street, "Rúa Sor Joaquina, 2, Bajo");
});

test("la portada destaca el próximo evento y, si no hay, el último", () => {
  const { events } = normalizeEvents(parseIcs(ics), config, {});
  const before = pickFeatured(events, new Date("2026-11-01T00:00:00Z"));
  assert.equal(before.upcoming, true);
  assert.match(before.event.title, /^Metadatos/);
  const after = pickFeatured(events, new Date("2026-12-01T00:00:00Z"));
  assert.equal(after.upcoming, false);
  assert.match(after.event.title, /^Metadatos/);
});

test("el botón de la cabecera solo invita a apuntarse si hay un evento publicado", () => {
  const { events } = normalizeEvents(parseIcs(ics), config, {});
  const base = { config: { ...config, lumaUrl: "https://luma.com/corunawtf" }, url: { origin: "https://x", base: "" }, content: JSON.parse(readFileSync(new URL("../data/content.json", import.meta.url), "utf8")), undated: [], speakers: [], icons: {} };
  const before = homeHtml({ ...base, events, now: new Date("2026-11-01T00:00:00Z") });
  assert.match(before, /Apúntate al próximo evento/);
  assert.match(before, /class="nav-cta" href="https:\/\/luma.com\/yv7jjslu"/);
  const after = homeHtml({ ...base, events, now: new Date("2026-12-01T00:00:00Z") });
  assert.match(after, /Sigue el calendario en Luma/);
  assert.match(after, /class="nav-cta" href="https:\/\/luma.com\/corunawtf"/);
});
