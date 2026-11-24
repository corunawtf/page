// Genera el feed OTE (Open Tech Events 0.6.0) a partir de los eventos normalizados.
// Spec: https://opentechevents.org/spec/

export const SPEC_VERSION = "0.6.0";

export function buildFeed(events, config, now = new Date()) {
  const siteUrl = `${config.origin}${config.base}/`;
  const organization = { name: config.organization, type: "organization", url: siteUrl };

  const from = config.coversFrom;
  const ote = events
    .filter((e) => !from || e.startDate >= from)
    .sort((a, b) => `${a.startDate}${a.startTime ?? ""}`.localeCompare(`${b.startDate}${b.startTime ?? ""}`))
    .map((e) => {
      const id = e.url ?? `${siteUrl}#${e.key}`;
      const hasEnd = e.endDate && (e.allDay ? e.endDate !== e.startDate : e.endTime);
      const location = e.location
        ? { ...(e.location.venue && { venue: e.location.venue }), ...(e.location.address && { address: e.location.address }), ...(e.location.onlineUrl && { onlineUrl: e.location.onlineUrl }) }
        : undefined;
      const description = [e.subtitle, e.description].filter(Boolean).join("\n\n");
      return {
        specVersion: SPEC_VERSION,
        id,
        url: id,
        name: e.title,
        ...(description && { description }),
        startDate: e.allDay ? e.startDate : `${e.startDate}T${e.startTime}`,
        ...(hasEnd && { endDate: e.allDay ? e.endDate : `${e.endDate}T${e.endTime}` }),
        timezone: config.timezone,
        languages: ["es"],
        ...(location && { attendanceMode: location.onlineUrl && !location.venue ? "online" : "in-person" }),
        status: e.status,
        ...(location && { location }),
        organizers: e.organizers.length ? e.organizers : [organization],
        ...(e.speakers.length && { speakers: e.speakers.map((s) => ({ name: s.name, type: "person" })) }),
        license: config.license,
        ...(e.updatedAt && { updatedAt: e.updatedAt.toISOString().replace(/\.\d{3}Z$/, "Z") }),
      };
    });

  const earliest = ote[0]?.startDate.slice(0, 10);
  return {
    specVersion: SPEC_VERSION,
    title: config.title,
    description: config.description,
    url: siteUrl,
    textLanguage: "es",
    license: config.license,
    updatedAt: now.toISOString().replace(/\.\d{3}Z$/, "Z"),
    ...((config.coversFrom ?? earliest) && { covers: { from: config.coversFrom ?? earliest } }),
    organizers: [organization],
    ...(config.icsUrl && { alternates: [{ mediaType: "text/calendar", url: config.icsUrl }] }),
    events: ote,
  };
}
