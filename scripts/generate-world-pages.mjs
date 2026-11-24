#!/usr/bin/env node
// Builds the "Education around the world" pages from content/countries.js and
// content/world/country-profiles.json:
//   urban/frontend/world.html            landing page (map, headline numbers, country cards)
//   urban/frontend/world/<code>.html     one detailed profile per country
//   urban/frontend/world/compare.html    sortable side-by-side table
// Pages are static HTML (fast, indexable, work without JS). Re-run after
// refreshing the data:  node scripts/generate-world-pages.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FE = path.join(ROOT, "urban/frontend");
const { COUNTRIES } = await import(pathToFileURL(path.join(ROOT, "content/countries.js")));
const { MAP_W, MAP_H, LAND_PATH, PINS } = await import(pathToFileURL(path.join(FE, "js/world-land.js")));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "content/world/country-profiles.json"), "utf8"));
const SITE = "https://educerelator.com";
const { LANGUAGES } = await import(pathToFileURL(path.join(ROOT, "content/languages.js")));
const LANG = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));
const langName = (code) => (LANG[code] ? `${LANG[code].english}${LANG[code].status === "preview" ? " (preview)" : ""}` : code);

// ── formatting ──
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const num = (v, d = 0) => Number(v).toLocaleString("en", { maximumFractionDigits: d, minimumFractionDigits: 0 });
function big(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${num(v / 1e9, 2)} billion`;
  if (a >= 1e6) return `${num(v / 1e6, a >= 1e8 ? 0 : 1)} million`;
  if (a >= 1e4) return `${num(v / 1e3, 0)} thousand`;
  return num(v);
}
const pct = (v, d = 0) => `${num(v, d)}%`;
const has = (m) => m && m.value != null;
const yr = (m) => (m && m.year ? String(m.year) : "");
const usdB = (b) => (b >= 1000 ? `US$${num(b / 1000, 2)} trillion` : b >= 1 ? `US$${num(b, b >= 100 ? 0 : 1)} billion` : `US$${num(b * 1000, 0)} million`);
const slug = (c) => c.code.toLowerCase();
const ecLabel = (c) => (c.code === "IN" ? "Class 1 to 12" : c.grade(1));

// ── readings: plain rules, stated on every page ──
function talentReading(d) {
  const mig = d.netMigration?.value, rem = d.remittancesPctGdp?.value;
  if (mig != null && mig < 0 && rem != null && rem >= 3)
    return { kind: "export", title: "Builds talent the world employs", text: `About ${big(-mig)} more people leave than arrive each year, and money sent home by workers abroad equals ${pct(rem, 1)} of the economy.` };
  if (mig != null && mig > 0)
    return { kind: "import", title: "Attracts talent from abroad", text: `About ${big(mig)} more people arrive than leave each year${rem != null ? `; remittances received are ${pct(rem, 1)} of the economy` : ""}.` };
  return { kind: "home", title: "Mostly builds talent for home", text: `Migration is close to balanced${rem != null ? ` and remittances are ${pct(rem, 1)} of the economy` : ""}.` };
}
const TALENT_SHORT = { export: "Talent exporter", import: "Talent importer", home: "Talent for home" };

function edge(d) {
  const a = d.atlas || {};
  const lead = (a.worldLeader || []).find((w) => w.worldSharePct >= 5);
  if (lead) return `Supplies ${pct(lead.worldSharePct)} of the world's ${lead.name.toLowerCase()} exports`;
  const top = (a.topExports || [])[0];
  return top ? `Exports led by ${top.name.toLowerCase()} (${pct(top.pct)} of exports)` : "";
}

// Skills each sector draws on (EC Play's own mapping, labelled as such).
const SKILLS = {
  "Services": "reading, writing and speaking well, numbers, digital skills, working with people",
  "Textiles": "design, measuring, pattern and quality, running production lines",
  "Agriculture": "plants, soil, water and weather; measuring and recording",
  "Minerals and energy": "earth science, chemistry, engineering, safety",
  "Electronics": "maths, physics, logic and coding",
  "Machinery": "maths, physics, engineering drawing, problem solving",
  "Chemicals": "chemistry and biology (medicines, materials)",
  "Metals": "chemistry, engineering, measuring",
  "Precious stones and metals": "careful measuring, craft, trade and finance",
  "Vehicles": "engineering, physics, maths",
};

// ── shared page parts ──
const head = (title, desc, canon, extra = "") => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${SITE}${canon}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${SITE}${canon}" />
<meta name="theme-color" content="#7c3aed" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="stylesheet" href="/world/world.css" />${extra}
</head>
<body>
<header class="top"><a href="/">🦉 EC Play</a><nav><a href="/world.html">World</a><a href="/world/compare.html">Compare</a><a href="/about.html">About</a><a href="/for-teachers.html">For Teachers</a></nav></header>
`;
const foot = `<footer class="foot"><div class="wrap">Built by Educerelator. Built for the world. · <a href="/">Play EC Play free</a> · <a href="/privacy.html">Privacy</a></div></footer>
</body>
</html>
`;
const tile = (n, l, y) => `<div class="tile"><div class="n">${n}</div><div class="l">${l}</div>${y ? `<div class="y">${esc(y)}</div>` : ""}</div>`;
function bars(rows, max, fmt = (v) => pct(v)) {
  return `<div class="bars">${rows.filter((r) => r[1] != null).map(([label, v]) =>
    `<div class="bar" title="${esc(label)}: ${esc(fmt(v))}"><span>${esc(label)}</span><span class="t"><i style="width:${Math.max(0.5, Math.min(100, (100 * v) / max)).toFixed(1)}%"></i></span><span class="v">${fmt(v)}</span></div>`).join("")}</div>`;
}
function sourcesList() {
  const s = DATA.sources;
  return `<ul class="sources">
  <li><a href="${s.worldBank.url}" rel="noopener">${esc(s.worldBank.name)}</a>. Each value is the latest year available for that country, shown beside it.</li>
  <li><a href="${s.worldBankProjections.url}" rel="noopener">${esc(s.worldBankProjections.name)}</a>.</li>
  <li><a href="${s.imfAipi.url}" rel="noopener">${esc(s.imfAipi.name)}</a>.</li>
  <li><a href="${s.atlas.url}" rel="noopener">${esc(s.atlas.name)}</a>. ${esc(s.atlasRankNote)}</li>
  <li>Data gathered ${esc(DATA.generated)}. Indicators a country doesn't report are left out, never estimated.</li></ul>`;
}

// ── country page ──
function countryPage(c, i) {
  const d = DATA.countries[c.code] || {};
  const a = d.atlas || {};
  const prev = COUNTRIES[(i - 1 + COUNTRIES.length) % COUNTRIES.length], next = COUNTRIES[(i + 1) % COUNTRIES.length];
  const kids = d.children0to14, proj = d.children0to14Projected || {};
  const change = has(kids) && proj["2050"] ? (100 * (proj["2050"] - kids.value)) / kids.value : null;
  const ai = d.aiPreparedness;
  const t = talentReading(d);
  const sectors = (a.sectors || []).filter((s) => s.pct >= 0.5);
  const skillRows = sectors.filter((s) => SKILLS[s.name]).slice(0, 3);
  const desc = `${c.name}: students today and in 2050, learning outcomes, workforce, top industries and exports, economic complexity, AI preparedness and talent flows. Sourced from the World Bank, IMF and Harvard's Atlas of Economic Complexity.`;

  const future = [[`Today (${yr(kids)})`, kids?.value], ["2030", proj["2030"]], ["2040", proj["2040"]], ["2050", proj["2050"]]];
  const fmax = Math.max(...future.map((f) => f[1] || 0));

  return head(`${c.name}: education and economy profile | EC Play`, desc, `/world/${slug(c)}.html`) + `
<div class="wrap chead">
  <p class="crumb"><a href="/world.html">Education around the world</a> › ${esc(c.name)}</p>
  <div class="ctitle"><span class="f" aria-hidden="true">${c.flag}</span><h1>${esc(c.name)}</h1><a class="ec" href="/">EC Play: ${esc(ecLabel(c))} →</a></div>
  <p class="sub" style="margin-top:8px">${esc(edge(d))}. ${esc(t.title)}.${c.langs ? ` EC Play in ${c.langs.map(langName).join(", ")}.` : ""}${c.note ? ` ${esc(c.note)}` : ""}</p>
</div>
<nav class="toc" aria-label="Sections"><div class="wrap">
  <a href="#students">Students</a><a href="#learning">Learning</a><a href="#workforce">Workforce</a><a href="#industries">Industries</a><a href="#advantage">Competitive edge</a><a href="#ai">AI readiness</a><a href="#talent">Talent</a><a href="#skills">Skills</a>
</div></nav>
<main class="wrap">

<section class="block" id="students"><h2>Students today and tomorrow</h2><p class="q">How many children are in school now, and how many there will be.</p>
  <div class="tiles">
    ${has(kids) ? tile(big(kids.value), "children aged 0 to 14", yr(kids)) : ""}
    ${has(d.primaryEnrolled) ? tile(big(d.primaryEnrolled.value), "in primary school", yr(d.primaryEnrolled)) : ""}
    ${has(d.secondaryEnrolled) ? tile(big(d.secondaryEnrolled.value), "in secondary school", yr(d.secondaryEnrolled)) : ""}
    ${has(d.tertiaryEnrolled) ? tile(big(d.tertiaryEnrolled.value), "in higher education", yr(d.tertiaryEnrolled)) : ""}
  </div>
  <h3 class="mini">Children aged 0 to 14, World Bank projection</h3>
  ${bars(future, fmax, big)}
  ${change != null ? `<p class="reading">By 2050 the number of children is projected to <b>${change >= 0 ? "grow" : "shrink"} by ${pct(Math.abs(change))}</b>${change < -10 ? ": fewer students, so the focus shifts to quality and to every child counting" : change > 10 ? ": more classrooms and teachers will be needed" : ""}.</p>` : ""}
</section>

<section class="block" id="learning"><h2>How learning is going</h2><p class="q">Whether children learn, finish school and go on to study.</p>
  <div class="tiles">
    ${has(d.learningPoverty) ? tile(pct(d.learningPoverty.value), "of 10-year-olds can't read and understand a simple text (learning poverty)", yr(d.learningPoverty)) : ""}
    ${has(d.humanCapitalIndex) ? tile(num(d.humanCapitalIndex.value, 2), `Human Capital Index: a child born today reaches ${pct(100 * d.humanCapitalIndex.value)} of their potential productivity`, yr(d.humanCapitalIndex)) : ""}
    ${has(d.primaryCompletion) ? tile(pct(d.primaryCompletion.value), "primary completion (gross: passes 100% when older children also finish)", yr(d.primaryCompletion)) : ""}
    ${has(d.tertiaryEnrolmentRatio) ? tile(pct(d.tertiaryEnrolmentRatio.value), "gross enrolment in higher education", yr(d.tertiaryEnrolmentRatio)) : ""}
    ${has(d.educationSpendPctGdp) ? tile(pct(d.educationSpendPctGdp.value, 1), "of GDP spent on education by government", yr(d.educationSpendPctGdp)) : ""}
  </div>
</section>

<section class="block" id="workforce"><h2>Workforce and economy</h2><p class="q">Where today's students will work.</p>
  <div class="tiles">
    ${has(d.laborForce) ? tile(big(d.laborForce.value), "people in the labour force", yr(d.laborForce)) : ""}
    ${has(d.gdpPerCapitaUsd) ? tile(`$${num(d.gdpPerCapitaUsd.value)}`, "GDP per person (current US$)", yr(d.gdpPerCapitaUsd)) : ""}
    ${has(d.internetUsersPct) ? tile(pct(d.internetUsersPct.value), "of people use the internet", yr(d.internetUsersPct)) : ""}
  </div>
  <h3 class="mini">Share of the economy by sector${has(d.servicesPctGdp) ? `, ${yr(d.servicesPctGdp)}` : ""}</h3>
  ${bars([["Services", d.servicesPctGdp?.value], ["Industry", d.industryPctGdp?.value], ["Agriculture", d.agriculturePctGdp?.value]], 100)}
  <p class="note">World Bank. Shares may not add to 100% because of taxes and subsidies on products.</p>
</section>

<section class="block" id="industries"><h2>Top industries</h2><p class="q">What ${esc(c.name)} sells to the world, goods and services together (${a.year || ""}).</p>
  ${a.exportsUsdBillion ? `<div class="tiles">${tile(usdB(a.exportsUsdBillion), "total exports of goods and services", a.year)}${has(d.ictPctServiceExports) ? tile(pct(d.ictPctServiceExports.value), "of service exports are ICT (software, IT, telecoms)", yr(d.ictPctServiceExports)) : ""}${has(d.highTechPctManufExports) ? tile(pct(d.highTechPctManufExports.value), "of manufactured exports are high technology", yr(d.highTechPctManufExports)) : ""}</div>` : ""}
  <h3 class="mini">Export sectors, share of total exports</h3>
  ${bars(sectors.map((s) => [s.name, s.pct]), Math.max(...sectors.map((s) => s.pct), 1), (v) => pct(v, 1))}
  <h3 class="mini">Top five exports</h3>
  <ol class="list">${(a.topExports || []).map((e) => `<li><span>${esc(e.name)}</span><span>${pct(e.pct, 1)} of exports</span></li>`).join("")}</ol>
</section>

<section class="block" id="advantage"><h2>Competitive edge</h2><p class="q">Where ${esc(c.name)} leads the world, and how sophisticated its know-how is.</p>
  ${(a.worldLeader || []).length ? `<h3 class="mini">Where it leads: share of all world exports of the product</h3>
  ${bars(a.worldLeader.slice(0, 6).map((w) => [w.name, w.worldSharePct]), 100, (v) => pct(v, 1))}` : `<p class="reading">No single product reaches half a percent of world trade yet: ${esc(c.name)} competes on <b>${esc(((a.topExports || [])[0]?.name || "services").toLowerCase())}</b> and its regional role.</p>`}
  <div class="tiles" style="margin-top:12px">
    ${a.eci != null ? tile(num(a.eci, 2), "Economic Complexity Index (world average 0)", a.year) : ""}
    ${a.eciRank ? tile(`${a.eciRank} of ${a.eciRankOf}`, "in economic complexity", a.year) : tile("Not ranked", "too small for the complexity ranking (under 1 million people or US$1 billion in exports)", a.year)}
    ${a.growthProjPct != null ? tile(`${num(a.growthProjPct, 1)}% a year`, "projected growth over the next decade (Atlas)", a.year) : ""}
  </div>
  <p class="note">Economic complexity measures how diverse and sophisticated a country's know-how is, judged from what it manages to export competitively. Countries that make many complex products tend to grow faster. ${esc(DATA.sources.atlasRankNote)}</p>
</section>

<section class="block" id="ai"><h2>Readiness for AI</h2><p class="q">IMF AI Preparedness Index: how well placed the country is to benefit from AI.</p>
  ${ai ? `<div class="tiles">${tile(num(ai.value, 2), "score from 0 to 1", ai.year)}${tile(`${ai.rank} of ${ai.of}`, "countries, ranked", ai.year)}</div>
  <div class="meter" role="img" aria-label="AI preparedness ${num(ai.value, 2)} out of 1"><i style="width:${(100 * ai.value).toFixed(1)}%"></i></div><div class="scale"><span>0</span><span>1</span></div>
  <p class="note">The index combines four areas: digital infrastructure; human capital and labour-market policies; innovation and economic integration; regulation and ethics.</p>` : "<p>Not covered by the index.</p>"}
</section>

<section class="block" id="talent"><h2>Talent: built for home or for the world?</h2><p class="q">Where the people a country educates go on to work.</p>
  <div class="tiles">
    ${has(d.netMigration) ? tile(`${d.netMigration.value > 0 ? "+" : ""}${big(d.netMigration.value)}`, "net migration a year (arrivals minus departures)", yr(d.netMigration)) : ""}
    ${has(d.remittancesPctGdp) ? tile(pct(d.remittancesPctGdp.value, 1), "of GDP arrives as money sent home by workers abroad", yr(d.remittancesPctGdp)) : ""}
    ${has(d.tertiaryEnrolmentRatio) ? tile(pct(d.tertiaryEnrolmentRatio.value), "gross enrolment in higher education", yr(d.tertiaryEnrolmentRatio)) : ""}
  </div>
  <p class="reading"><b>${esc(t.title)}.</b> ${esc(t.text)}</p>
  <p class="note">Rule used: "builds talent the world employs" means net migration is negative and remittances are at least 3% of GDP; "attracts talent" means net migration is positive. These are descriptions, not judgments.</p>
</section>

<section class="block" id="skills"><h2>From classroom to workforce</h2><p class="q">Skills ${esc(c.name)}'s leading export sectors draw on.</p>
  <ul class="list skills">${skillRows.map((s) => `<li><span><b>${esc(s.name)}</b> (${pct(s.pct)} of exports): ${esc(SKILLS[s.name])}</span></li>`).join("")}</ul>
  <p class="reading">Every one of these starts with the same foundations: <b>number sense, reading and sounds, and curiosity about the world</b>. That is where EC Play starts, free, with ${esc(ecLabel(c))}.</p>
  <p class="note">The skills list is EC Play's own summary, not part of the source data.</p>
  <a class="cta" href="/">Play ${esc(ecLabel(c))} free →</a>
</section>

<nav class="pager" aria-label="More countries"><a href="/world/${slug(prev)}.html"><small>← Previous</small>${prev.flag} ${esc(prev.name)}</a><a href="/world/${slug(next)}.html"><small>Next →</small>${next.flag} ${esc(next.name)}</a></nav>
<h2 class="sec" style="font-size:1rem">Sources</h2>
${sourcesList()}
</main>
` + foot;
}

// ── landing page ──
function landing() {
  const all = COUNTRIES.map((c) => ({ c, d: DATA.countries[c.code] || {} }));
  const sum = (f) => all.reduce((s, x) => s + (f(x.d) || 0), 0);
  const kids = sum((d) => d.children0to14?.value), kids2050 = sum((d) => d.children0to14Projected?.["2050"]);
  const labour = sum((d) => d.laborForce?.value);
  const exportsB = sum((d) => d.atlas?.exportsUsdBillion);
  const langs = new Set(COUNTRIES.flatMap((c) => c.langs || []));
  const desc = "How education is doing in the countries EC Play serves: students now and in 2050, learning outcomes, workforce, top industries, competitive edge, AI readiness and where talent goes.";

  const pins = COUNTRIES.map((c) => {
    const [x, y] = PINS[c.code];
    const anchor = x > 900 ? "end" : "start", dx = x > 900 ? -14 : 14;
    return `<a class="pin" href="/world/${slug(c)}.html" aria-label="${esc(c.name)} profile"><g transform="translate(${x} ${y})"><circle r="9"></circle><circle class="dot" r="3.5"></circle><text x="${dx}" y="5" text-anchor="${anchor}">${esc(c.name)}</text></g></a>`;
  }).join("");

  const cards = all.map(({ c, d }) => {
    const t = talentReading(d);
    return `<a class="ccard" href="/world/${slug(c)}.html"><div class="h"><span class="f" aria-hidden="true">${c.flag}</span><span class="n">${esc(c.name)}</span></div>
  <p class="tag">${esc(edge(d))}.</p>
  <dl><div><dt>Children</dt><dd>${has(d.children0to14) ? esc(big(d.children0to14.value).replace(" million", "M").replace(" thousand", "K").replace(" billion", "B")) : "–"}</dd></div>
  <div><dt>AI readiness</dt><dd>${d.aiPreparedness ? `#${d.aiPreparedness.rank}` : "–"}</dd></div>
  <div><dt>Complexity</dt><dd>${d.atlas?.eciRank ? `#${d.atlas.eciRank}` : "–"}</dd></div></dl>
  <span class="tag" style="min-height:0">${esc(TALENT_SHORT[t.kind])} · EC Play ${esc(ecLabel(c))}</span>
  <span class="go">View profile →</span></a>`;
  }).join("\n");

  return head("Education around the world | EC Play", desc, "/world.html") + `
<section class="hero"><div class="wrap">
  <p class="kicker">Built by Educerelator. Built for the world.</p>
  <h1>Education around the world</h1>
  <p class="lead">Ten countries, one free learning game. See how many children each country is teaching, how well they're learning, which industries they'll work in, where each economy beats the world, how ready it is for AI, and whether its talent stays home or goes global.</p>
  <div class="strip">
    <div><b>${big(kids)}</b><span>children aged 0 to 14 across these ${COUNTRIES.length} countries</span></div>
    <div><b>${kids2050 < kids ? "−" : "+"}${pct(Math.abs((100 * (kids2050 - kids)) / kids))}</b><span>change in that number by 2050 (World Bank projection)</span></div>
    <div><b>${big(labour)}</b><span>people in their combined workforce</span></div>
    <div><b>${usdB(exportsB)}</b><span>exported each year, goods and services</span></div>
  </div>
</div></section>
<main class="wrap">
  <div class="mapcard"><svg class="map" viewBox="0 0 ${MAP_W} ${MAP_H}" role="group" aria-label="World map: choose a country"><path class="land" d="${LAND_PATH}"></path>${pins}</svg></div>

  <h2 class="sec">Choose a country</h2>
  <p class="sub">Each profile is a full page of numbers, every one with its year and source.</p>
  <div class="cards">
${cards}
  </div>

  <h2 class="sec">What each profile covers</h2>
  <div class="covers">
    <div>🎒<b>Students today and tomorrow</b><span>Children in school now, and the World Bank projection to 2050.</span></div>
    <div>📖<b>How learning is going</b><span>Learning poverty, the Human Capital Index, completion and spending.</span></div>
    <div>🏭<b>Top industries</b><span>Export sectors and the five biggest named exports, goods and services.</span></div>
    <div>🏆<b>Competitive edge</b><span>Products where the country leads world trade, and its economic complexity rank.</span></div>
    <div>🤖<b>Readiness for AI</b><span>The IMF AI Preparedness Index score and rank among ${DATA.countries.IN?.aiPreparedness?.of || 178} countries.</span></div>
    <div>✈️<b>Talent: home or world?</b><span>Migration and remittances show whether talent stays or goes global.</span></div>
  </div>
  <a class="cta" href="/world/compare.html">Compare all ${COUNTRIES.length} side by side →</a>

  <h2 class="sec">Learn with EC Play in ${langs.size} languages</h2>
  <p class="sub">Class 1 foundations, free for every child in these countries, and Class 1 to 12 in India. ${[...langs].map(langName).join(", ")}. Preview languages were drafted with AI and are being checked by native speakers; the label comes off after that review.</p>
  <a class="cta" href="/">Start playing free →</a>

  <h2 class="sec" style="font-size:1rem">Sources</h2>
  ${sourcesList()}
</main>
` + foot;
}

// ── compare page ──
function compare() {
  const COLS = [
    ["Children 0–14", (d) => d.children0to14?.value, big],
    ["Change to 2050", (d) => (has(d.children0to14) && d.children0to14Projected ? (100 * (d.children0to14Projected["2050"] - d.children0to14.value)) / d.children0to14.value : null), (v) => `${v > 0 ? "+" : ""}${pct(v)}`],
    ["Learning poverty", (d) => d.learningPoverty?.value, (v) => pct(v)],
    ["Human Capital Index", (d) => d.humanCapitalIndex?.value, (v) => num(v, 2)],
    ["Labour force", (d) => d.laborForce?.value, big],
    ["GDP per person", (d) => d.gdpPerCapitaUsd?.value, (v) => `$${num(v)}`],
    ["Exports", (d) => d.atlas?.exportsUsdBillion, usdB],
    ["Complexity rank", (d) => d.atlas?.eciRank, (v) => `#${v}`],
    ["ICT % service exports", (d) => d.ictPctServiceExports?.value, (v) => pct(v)],
    ["AI readiness", (d) => d.aiPreparedness?.value, (v) => num(v, 2)],
    ["Remittances % GDP", (d) => d.remittancesPctGdp?.value, (v) => pct(v, 1)],
  ];
  const rows = COUNTRIES.map((c) => {
    const d = DATA.countries[c.code] || {};
    return `<tr><td><a href="/world/${slug(c)}.html">${c.flag} ${esc(c.name)}</a></td>${COLS.map(([, g, f]) => { const v = g(d); return `<td data-v="${v ?? ""}">${v == null ? "–" : f(v)}</td>`; }).join("")}</tr>`;
  }).join("\n");
  const desc = "Compare students, learning, workforce, exports, economic complexity, AI readiness and talent flows across the countries EC Play serves.";
  return head("Compare countries | EC Play", desc, "/world/compare.html") + `
<div class="wrap chead">
  <p class="crumb"><a href="/world.html">Education around the world</a> › Compare</p>
  <div class="ctitle"><h1>Compare ${COUNTRIES.length} countries</h1></div>
  <p class="sub" style="margin-top:8px">Tap a column heading to sort. Tap a country for its full profile. Each value is the latest year available; see the profiles for years.</p>
</div>
<main class="wrap">
  <div class="tablewrap"><table id="cmp"><thead><tr><th scope="col">Country</th>${COLS.map(([h], i) => `<th scope="col"><button type="button" data-i="${i + 1}">${esc(h)}</button></th>`).join("")}</tr></thead>
  <tbody>
${rows}
  </tbody></table></div>
  <p class="note">Complexity rank: lower is more complex. Learning poverty: lower is better. AI readiness: IMF score from 0 to 1.</p>
  <h2 class="sec" style="font-size:1rem">Sources</h2>
  ${sourcesList()}
</main>
<script>
(() => {
  const t = document.getElementById("cmp"), body = t.tBodies[0];
  let col = 0, dir = 1;
  t.querySelectorAll("th button").forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.i; dir = i === col ? -dir : (b.textContent.includes("rank") || b.textContent.includes("poverty") ? 1 : -1); col = i;
    const rs = [...body.rows];
    rs.sort((x, y) => { const a = x.cells[i].dataset.v, c = y.cells[i].dataset.v; if (a === "") return 1; if (c === "") return -1; return (a - c) * dir; });
    rs.forEach((r) => body.appendChild(r));
    t.querySelectorAll("th").forEach((th) => th.removeAttribute("aria-sort"));
    b.parentElement.setAttribute("aria-sort", dir < 0 ? "descending" : "ascending");
  }));
})();
</script>
` + foot;
}

fs.mkdirSync(path.join(FE, "world"), { recursive: true });
fs.writeFileSync(path.join(FE, "world.html"), landing());
COUNTRIES.forEach((c, i) => fs.writeFileSync(path.join(FE, "world", `${slug(c)}.html`), countryPage(c, i)));
fs.writeFileSync(path.join(FE, "world", "compare.html"), compare());
console.log(`World pages: landing + ${COUNTRIES.length} profiles + compare`);
