// CoruñaWTF · interacciones. Sin dependencias; la web funciona igual sin JavaScript.
document.documentElement.classList.add("js");

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Aparición al hacer scroll, en cascada para los elementos que entran a la vez.
const targets = document.querySelectorAll("[data-reveal], .wtf");
if (reduced || !("IntersectionObserver" in window)) {
  targets.forEach((el) => el.classList.add("is-in"));
} else {
  const io = new IntersectionObserver((entries) => {
    entries
      .filter((e) => e.isIntersecting)
      .forEach((e, i) => {
        if (!e.target.style.getPropertyValue("--d")) e.target.style.setProperty("--d", `${Math.min(i * 0.07, 0.5)}s`);
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  targets.forEach((el) => io.observe(el));
}

// Sombra de la cabecera al bajar.
const onScroll = () => document.body.classList.toggle("is-scrolled", scrollY > 24);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// La web se genera una vez al mes: si el «próximo evento» ya terminó, se rotula como último.
const next = document.querySelector(".next[data-ends]");
if (next && new Date(next.dataset.ends) < new Date()) {
  next.classList.add("is-past");
  next.querySelectorAll("[data-label-past]").forEach((el) => (el.textContent = el.dataset.labelPast));
}
for (const card of document.querySelectorAll(".card.is-upcoming")) {
  const time = card.querySelector("time[datetime]");
  // Solo por día: si la fecha ya pasó, deja de marcarse como próximo.
  if (time && time.getAttribute("datetime").slice(0, 10) < new Date().toISOString().slice(0, 10)) {
    card.classList.remove("is-upcoming");
    card.querySelector(".badge")?.remove();
  }
}

// Igual para el botón de la cabecera: si el evento ya pasó, vuelve a invitar a seguir el calendario.
const cta = document.querySelector(".nav-cta[data-ends]");
if (cta && new Date(cta.dataset.ends) < new Date()) {
  cta.href = cta.dataset.fallbackHref;
  cta.querySelector(".cta-long").textContent = "Sigue el calendario en Luma";
  cta.querySelector(".cta-short").textContent = "Calendario";
}
