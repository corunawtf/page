// Plantillas HTML de la web. Sin dependencias: funciones que devuelven texto.

export const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const paragraphs = (text) =>
  String(text ?? "").split(/\n{2,}/).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function dateParts(e) {
  const [y, m, d] = e.startDate.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { day: d, month: MONTHS[m - 1], year: y, weekday, time: e.startTime };
}

const icon = (icons, name) => icons[name] ?? "";

// ---------- Bloques ----------

// Botón de la cabecera: si hay un evento publicado lleva a él; si no, invita a seguir el calendario de Luma.
function ctaFor(featured, config) {
  if (featured?.upcoming) {
    return { href: featured.event.url ?? config.lumaUrl, long: "Apúntate al próximo evento", short: "Apúntate", ends: featured.event.endAt };
  }
  return { href: config.lumaUrl, long: "Sigue el calendario en Luma", short: "Calendario", ends: null };
}

function header({ config, url, icons, home, featured }) {
  const cta = ctaFor(featured, config);
  const link = (hash, text) => `<a href="${home ? "" : `${url.base}/`}#${hash}">${text}</a>`;
  return `<header class="site-header" data-anim="down">
  <nav class="nav" aria-label="Principal">
    <a class="nav-brand" href="${url.base}/">Coruña<span>WTF</span></a>
    <div class="nav-links">
      ${link("eventos", "Eventos")}
      ${link("ponentes", "Ponentes")}
      ${link("contacto", "Contacto")}
    </div>
    <a class="nav-cta" href="${esc(cta.href)}" target="_blank" rel="noopener"${cta.ends ? ` data-ends="${esc(cta.ends)}" data-fallback-href="${esc(config.lumaUrl)}"` : ""}>
      <span class="cta-long">${cta.long}</span><span class="cta-short">${cta.short}</span>${icon(icons, "arrow")}
    </a>
  </nav>
</header>`;
}

// Texto del botón según dónde esté publicado el evento.
function ctaLabel(href, upcoming) {
  const where = /lu\.ma|luma\.com/.test(href) ? " en Luma" : /eventbrite\./.test(href) ? " en Eventbrite" : "";
  return upcoming ? `Apúntate${where}` : where ? `Ver${where}` : "Ver evento";
}

function hero({ content, featured, icons, config }) {
  const title = content.tagline.replace(/^(\S+)\s/, "$1&nbsp;").split(" ");
  const words = title.map((w, i) => `<span class="word" style="--i:${i}">${w}</span>`).join(" ");
  let card = "";
  if (featured) {
    const { event: e, upcoming } = featured;
    const d = dateParts(e);
    const where = e.location?.venue ?? "";
    const href = e.url ?? config.lumaUrl;
    card = `
  <a class="next" href="${esc(href)}" target="_blank" rel="noopener" data-anim="up" style="--d:.55s"
     ${e.endAt ? `data-ends="${esc(e.endAt)}"` : ""}>
    <span class="next-label" data-label-past="Último evento">${upcoming ? "Próximo evento" : "Último evento"}</span>
    <span class="next-date">
      <strong>${d.day}</strong>
      <span>${d.month}<br>${d.weekday}${d.time ? ` · ${d.time}` : ""}</span>
    </span>
    <span class="next-title">${esc(e.title)}</span>
    ${e.speakers.length ? `<span class="next-meta">Con ${esc(e.speakers.map((s) => s.name).join(", "))}</span>` : ""}
    ${where ? `<span class="next-meta">${icon(icons, "pin")}${esc(where)}</span>` : ""}
    <span class="next-cta" data-label-past="${esc(ctaLabel(href, false))}">${esc(ctaLabel(href, upcoming))}</span>
    <span class="next-arrow">${icon(icons, "arrow")}</span>
  </a>`;
  }
  return `<section class="hero">
  <div class="hero-text">
    <p class="eyebrow" data-anim="up">Comunidad web · A Coruña</p>
    <h1 class="hero-title">${words}</h1>
    <p class="hero-lead" data-anim="up" style="--d:.45s">${esc(content.about[0])}</p>
  </div>${card}
</section>`;
}

// Separador: la línea llega desde la izquierda, dibuja la w, sigue como travesaño de la t y de la f
// (el «wt—f» del logo) y después se trazan las astas. Las letras siguen las formas de la tipografía original.
let wtfCount = 0;
function wtf() {
  const clip = `wtf-clip-${++wtfCount}`;
  return `<div class="wtf" aria-hidden="true">
  <svg viewBox="0 70 1200 220" preserveAspectRatio="xMaxYMin slice">
    <clipPath id="${clip}"><rect x="0" y="141" width="1200" height="200" /></clipPath>
    <path class="wtf-stroke is-thin s1" pathLength="1" d="M-10 150 H850" />
    <path class="wtf-stroke s2" pathLength="1" clip-path="url(#${clip})" d="M842 128 L880 276 L918 180 L956 276 L994 128" />
    <path class="wtf-stroke is-thin s3" pathLength="1" d="M994 150 H1196" />
    <path class="wtf-stroke s4" pathLength="1" d="M1052 104 V236 Q1052 272 1086 272 H1098" />
    <path class="wtf-stroke s5" pathLength="1" d="M1152 282 V134 Q1152 98 1184 98 H1198" />
  </svg>
</div>`;
}

function about({ content }) {
  return `<section class="about" id="sobre">
  <div class="about-inner">
    <h2 data-reveal>Bienvenido a Coruña Web Talks and Friends</h2>
    <div class="about-text" data-reveal>${content.about.slice(1).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
  </div>
</section>`;
}

function speakerList(speakers, speakersById, base) {
  if (!speakers.length) return "";
  // Con 3 o más ponentes (mesas redondas) solo se muestran las fotos; el nombre queda en title y para lectores de pantalla.
  const group = speakers.length >= 3;
  return `<ul class="card-speakers${group ? " is-group" : ""}">${speakers.map((s) => {
    const known = s.id ? speakersById.get(s.id) : null;
    const name = known?.name ?? s.name;
    const img = known?.image
      ? `<img src="${base}${esc(known.image)}" alt="" loading="lazy" width="44" height="44">`
      : `<span class="avatar-initial">${esc(String(name ?? "?").charAt(0))}</span>`;
    return group
      ? `<li title="${esc(name)}">${img}<span class="sr-only">${esc(name)}</span></li>`
      : `<li>${img}<span>${esc(name)}</span></li>`;
  }).join("")}</ul>`;
}

const platform = (url) => (/eventbrite\./.test(url) ? "Eventbrite" : /lu\.ma|luma\.com/.test(url) ? "Luma" : "Ver evento");

// La tarjeta entera enlaza a la página del evento (enlace del título estirado con CSS);
// el enlace a las slides queda por encima, así no hay enlaces anidados.
function card(e, { speakersById, base, now, icons }) {
  const dated = Boolean(e.startDate);
  const d = dated ? dateParts(e) : null;
  const upcoming = e.startAt && new Date(e.endAt ?? e.startAt) > now;
  const title = e.url
    ? `<a class="card-main" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}</a>`
    : esc(e.title);
  const actions = [
    e.url ? `<span class="card-action is-platform" aria-hidden="true">${esc(platform(e.url))} ↗</span>` : "",
    e.slides ? `<a class="card-action" href="${esc(e.slides)}" target="_blank" rel="noopener">Slides ↗</a>` : "",
  ].join("");
  return `<li class="card-wrap" data-reveal>
  <article class="card${upcoming ? " is-upcoming" : ""}${e.url ? " is-linked" : ""}" id="evento-${esc(e.key)}">
    <div class="card-top">
      ${dated
        ? `<time class="card-date" datetime="${esc(e.startTime ? `${e.startDate}T${e.startTime}` : e.startDate)}"><strong>${d.day}</strong><span>${d.month} ${d.year}</span></time>
      ${d.time ? `<span class="card-time">${d.weekday} · ${d.time}</span>` : ""}`
        : `<span class="card-date is-month"><span>${esc(e.month)}</span></span>`}
      ${upcoming ? `<span class="badge">Próximo</span>` : ""}
    </div>
    <h4 class="card-title">${title}</h4>
    ${e.subtitle ? `<p class="card-subtitle">${esc(e.subtitle)}</p>` : ""}
    ${e.description ? `<div class="card-desc">${paragraphs(e.description)}</div>` : ""}
    ${speakerList(e.speakers, speakersById, base)}
    ${actions ? `<div class="card-actions">${actions}</div>` : ""}
  </article>
</li>`;
}

function eventsSection({ events, undated, speakers, url, icons, now }) {
  const speakersById = new Map(speakers.map((s) => [s.id, s]));
  const seasons = new Map();
  const push = (title, e) => seasons.set(title, [...(seasons.get(title) ?? []), e]);
  for (const e of events) push(e.season.title, e);
  for (const e of undated) push(e.season.title, e);
  const num = (t) => Number(/\d+/.exec(t)?.[0] ?? 0);
  const ordered = [...seasons.entries()].sort((a, b) => num(b[0]) - num(a[0]));
  const opts = { speakersById, base: url.base, now, icons };

  const groups = ordered.map(([title, list], i) => {
    const grid = `<ul class="grid">${list.map((e) => card(e, opts)).join("\n")}</ul>`;
    const count = `<span class="season-count">${list.length} ${list.length === 1 ? "evento" : "eventos"}</span>`;
    return i === 0
      ? `<div class="season is-current"><h3 class="season-title" data-reveal>${esc(title)} ${count}</h3>${grid}</div>`
      : `<details class="season"><summary class="season-title" data-reveal>${esc(title)} ${count}<span class="season-toggle" aria-hidden="true"></span></summary>${grid}</details>`;
  }).join("\n");

  return `<section class="section" id="eventos">
  <header class="section-head" data-reveal>
    <h2>Nuestros eventos</h2>
    <p>Charlas, talleres y encuentros, más o menos una vez al mes desde enero de 2023.</p>
  </header>
  ${groups}
</section>`;
}

function personCards(people, url, icons) {
  return people.map((s, i) => {
    const link = s.links?.[0]?.url;
    const inner = `<span class="speaker-photo"><img src="${url.base}${esc(s.image)}" alt="" loading="lazy" width="500" height="500"></span>
      <span class="speaker-info">
        <span class="speaker-name">${esc(s.name)}</span>
        ${s.role ? `<span class="speaker-role">${esc(s.role)}</span>` : ""}
      </span>
      ${link ? `<span class="speaker-link" aria-hidden="true">${icon(icons, "github")}</span>` : ""}`;
    return `<li data-reveal style="--d:${(i % 6) * 0.05}s">${link
      ? `<a class="speaker" href="${esc(link)}" target="_blank" rel="noopener">${inner}</a>`
      : `<div class="speaker">${inner}</div>`}</li>`;
  }).join("\n");
}

const isOrganizer = (s) => /organiza/i.test(s.role ?? "");

function speakersSection({ speakers, url, icons }) {
  return `<section class="section" id="ponentes">
  <header class="section-head" data-reveal>
    <h2>Ponentes</h2>
    <p>Algunas de las magníficas personas que han compartido su conocimiento con la comunidad.</p>
  </header>
  <ul class="speakers">${personCards(speakers.filter((s) => !isOrganizer(s)), url, icons)}</ul>
</section>`;
}

function organizersSection({ speakers, url, icons }) {
  const team = speakers.filter(isOrganizer);
  if (!team.length) return "";
  const cards = team.map((s, i) => {
    const links = (s.links ?? []).map((l) => {
      const kind = /linkedin/.test(l.url) ? "linkedin" : /github/.test(l.url) ? "github" : null;
      const label = kind === "linkedin" ? "LinkedIn" : kind === "github" ? "GitHub" : "Web";
      return `<a class="org-link" href="${esc(l.url)}" target="_blank" rel="noopener">${kind ? icon(icons, kind) : ""}${label}</a>`;
    }).join("");
    return `<li class="org-card" data-reveal style="--d:${0.1 + i * 0.1}s">
      <img class="org-photo" src="${url.base}${esc(s.image)}" alt="" loading="lazy" width="500" height="500">
      <div class="org-body">
        <span class="org-role">${esc(s.role)}</span>
        <strong class="org-name">${esc(s.name)}</strong>
        ${links ? `<div class="org-links">${links}</div>` : ""}
      </div>
    </li>`;
  }).join("\n");
  return `<section class="section organizers" id="organizacion">
  <div class="org-grid">
    <div class="org-intro" data-reveal>
      <img class="org-logo" src="${url.base}/files/logos/logo-crop.png" alt="Logo de CoruñaWTF: la Torre de Hércules junto al nombre" width="340" height="167">
      <h2>Organización</h2>
      <p>CoruñaWTF lo organizan personas voluntarias. Si quieres dar una charla o echar una mano, escríbenos.</p>
    </div>
    <ul class="org-list">${cards}</ul>
  </div>
</section>`;
}

function infoSection({ content, icons }) {
  const dirs = content.location.directions.map((d) => `<li>${icon(icons, d.icon)}<div><strong>${esc(d.title)}</strong><span>${esc(d.text)}</span></div></li>`).join("");
  const contact = content.contact.map((c) => `<li>${icon(icons, c.icon)}<div><strong>${esc(c.title)}</strong><a href="${esc(c.url)}"${c.url.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(c.text)}</a></div></li>`).join("");
  return `<section class="info" id="contacto">
  <div class="info-map" data-reveal>
    <iframe src="${esc(content.location.mapEmbed)}" title="Mapa de Sngular A Coruña" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
  </div>
  <div class="info-box" data-reveal style="--d:.1s">
    <h2>Dónde</h2>
    <ul class="info-list">${dirs}</ul>
  </div>
  <div class="info-box is-dark" data-reveal style="--d:.2s">
    <h2>Contacto</h2>
    <ul class="info-list">${contact}</ul>
  </div>
</section>`;
}

function footer({ content, url }) {
  return `<footer class="site-footer">
  <div class="footer-brand">Coruña<span>WTF</span></div>
  <ul class="footer-links">
    ${content.footerLinks.map((l) => `<li><a href="${url.base}/${l.path}">${esc(l.text)}</a></li>`).join("")}
    <li><a href="${url.base}/feed.json" title="Feed Open Tech Events">Feed OTE</a></li>
    <li><a href="${url.base}/humans.txt">humans.txt</a></li>
  </ul>
  <p class="footer-copy">© ${new Date().getFullYear()} CoruñaWTF</p>
</footer>`;
}

function layout({ config, url, title, description, path = "", body, bodyClass = "" }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="stylesheet" href="${url.base}/styles/site.css">
  <script src="${url.base}/scripts/site.js" defer></script>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(config.title)}">
  <meta property="og:locale" content="es_ES">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url.origin}${url.base}/${path}">
  <meta property="og:image" content="${url.origin}${url.base}/files/hero.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#00ab7d">
  <link rel="alternate" type="application/ote+json" title="${esc(config.title)} - Open Tech Events" href="${url.origin}${url.base}/feed.json">
  <link rel="icon" sizes="48x48" href="${url.base}/favicon.ico">
  <link rel="icon" sizes="any" href="${url.base}/files/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" sizes="180x180" href="${url.base}/apple-touch-icon.png">
</head>
<body class="${bodyClass}">
${body}
</body>
</html>
`;
}

// ---------- Páginas ----------

// Evento a destacar en portada: el próximo (por instante de inicio); si no hay, el último celebrado.
export function pickFeatured(events, now) {
  const timed = events.filter((e) => e.startAt);
  const upcoming = timed.filter((e) => new Date(e.endAt ?? e.startAt) > now).sort((a, b) => a.startAt.localeCompare(b.startAt));
  if (upcoming.length) return { event: upcoming[0], upcoming: true };
  const last = timed.sort((a, b) => b.startAt.localeCompare(a.startAt))[0] ?? events[0];
  return last ? { event: last, upcoming: false } : null;
}

export function homeHtml({ config, url, content, events, undated, speakers, icons, now = new Date() }) {
  const featured = pickFeatured(events, now);
  const body = [
    header({ config, url, icons, home: true, featured }),
    `<main>`,
    hero({ content, featured, icons, config }),
    wtf(),
    about({ content }),
    eventsSection({ events, undated, speakers, url, icons, now }),
    wtf(),
    speakersSection({ speakers, url, icons }),
    organizersSection({ speakers, url, icons }),
    infoSection({ content, icons }),
    `</main>`,
    footer({ content, url }),
  ].join("\n");
  return layout({ config, url, title: `${config.title} · ${content.tagline}`, description: config.description, body });
}

export function legalHtml({ config, url, content, icons, title, path, html, featured }) {
  const body = [
    header({ config, url, icons, home: false, featured }),
    `<main class="legal">
  <h1 data-anim="up">${esc(title)}</h1>
  <article class="prose" data-anim="up" style="--d:.15s">${html}</article>
</main>`,
    footer({ content, url }),
  ].join("\n");
  return layout({ config, url, title: `${title} · ${config.title}`, description: config.description, path, body, bodyClass: "is-legal" });
}
