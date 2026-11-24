// "Where are you learning from?" — the world picker shown on a first visit
// (and from the flag button in the top bar). The map is land only, no
// borders; country pins and a list of large buttons do the choosing.
// Detection uses only the device's time zone and language: no location
// prompt and nothing sent anywhere.

import { COUNTRIES, detectCountry } from "../../../content/countries.js";
import { MAP_W, MAP_H, LAND_PATH, PINS } from "./world-land.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function openWorldPicker({ current, onChoose, onClose } = {}) {
  const el = document.getElementById("world-picker");
  if (!el) return;
  const detected = detectCountry().country;
  let selected = current || detected || null;

  const pins = COUNTRIES.map((c) => {
    const [x, y] = PINS[c.code] || [0, 0];
    return `<g class="wp-pin" data-code="${c.code}" transform="translate(${x} ${y})" role="button" tabindex="-1" aria-label="${esc(c.name)}">
      <circle r="9"></circle><circle class="wp-pin-dot" r="4"></circle></g>`;
  }).join("");

  const cards = COUNTRIES.map((c) => `
    <button type="button" class="wp-country" data-code="${c.code}" aria-pressed="false">
      <span class="wp-flag" aria-hidden="true">${c.flag}</span>
      <span class="wp-name">${esc(c.name)}</span>
      <span class="wp-sub">${c.code === "IN" ? "Class 1 to 12 and exam prep" : `${esc(c.grade(1))} ready`}</span>
    </button>`).join("");

  el.innerHTML = `
    <div class="wp-card" role="dialog" aria-modal="true" aria-labelledby="wp-title">
      ${current ? `<button type="button" class="wp-close" aria-label="Close">✕</button>` : ""}
      <p class="wp-kicker">Built by Educerelator. Built for the world. 🌍</p>
      <h2 id="wp-title">Where are you learning from?</h2>
      <p class="wp-detected" id="wp-detected"></p>
      <svg class="wp-map" viewBox="0 0 ${MAP_W} ${MAP_H}" aria-hidden="true" focusable="false">
        <path class="wp-land" d="${LAND_PATH}"></path>${pins}
      </svg>
      <div class="wp-grid">${cards}</div>
      <p class="wp-note" id="wp-note"></p>
      <button type="button" class="wp-go" id="wp-go" disabled>Start learning</button>
      <p class="wp-foot"><a href="/world.html" target="_blank" rel="noopener">Explore how education is doing in each country →</a><br>More countries and languages are on the way. Don't see yours? Pick the closest one and choose your language inside.</p>
    </div>`;

  const go = el.querySelector("#wp-go");
  const note = el.querySelector("#wp-note");
  const detectedEl = el.querySelector("#wp-detected");
  detectedEl.textContent = detected && !current ? `It looks like you're in ${detected.name}. Is that right?` : "Choose your country:";

  function select(code) {
    selected = COUNTRIES.find((c) => c.code === code) || null;
    el.querySelectorAll(".wp-country").forEach((b) => {
      const on = b.dataset.code === code;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-pressed", String(on));
    });
    el.querySelectorAll(".wp-pin").forEach((p) => p.classList.toggle("selected", p.dataset.code === code));
    go.disabled = !selected;
    go.textContent = selected ? `Start learning in ${selected.name} ${selected.flag}` : "Start learning";
    note.textContent = selected
      ? (selected.code === "IN"
          ? "Every class from 1 to 12, in English and 12 Indian languages."
          : `${selected.grade(1)} is ready: numbers, letters and sounds, and the world around us. More grades are coming.${selected.note ? " " + selected.note : ""}`)
      : "";
  }

  el.querySelectorAll(".wp-country, .wp-pin").forEach((b) => b.addEventListener("click", () => select(b.dataset.code)));
  go.addEventListener("click", () => { if (!selected) return; close(); onChoose?.(selected); });
  el.querySelector(".wp-close")?.addEventListener("click", () => { close(); onClose?.(); });

  function close() { el.classList.add("hidden"); el.innerHTML = ""; document.body.classList.remove("wp-open"); }

  el.classList.remove("hidden");
  document.body.classList.add("wp-open");
  if (selected) select(selected.code);
  (el.querySelector(".wp-country.selected") || el.querySelector(".wp-country"))?.focus();
}
