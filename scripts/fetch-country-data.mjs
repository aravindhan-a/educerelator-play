#!/usr/bin/env node
// Refreshes content/world/country-profiles.json from the public World Bank
// and IMF APIs (no keys needed). Every value keeps the year it refers to.
// Run from a machine with internet access:  node scripts/fetch-country-data.mjs
//
// Sources
//   World Bank WDI / HCI:  https://api.worldbank.org/v2  (mrnev=1: latest non-empty value)
//   World Bank projections: source=40, children aged 0–14 in 2030/2040/2050
//   IMF AI Preparedness Index: https://www.imf.org/external/datamapper/api/v1/AI_PI

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "content/world/country-profiles.json");
const ISO = { IND:"IN", NPL:"NP", BGD:"BD", LKA:"LK", ARE:"AE", SGP:"SG", USA:"US", GBR:"GB", AUS:"AU", GMB:"GM" };
const C = Object.keys(ISO).join(";");
const IND = {
  population:"SP.POP.TOTL", children0to14:"SP.POP.0014.TO", primaryEnrolled:"SE.PRM.ENRL", secondaryEnrolled:"SE.SEC.ENRL",
  tertiaryEnrolled:"SE.TER.ENRL", learningPoverty:"SE.LPV.PRIM", humanCapitalIndex:"HD.HCI.OVRL", educationSpendPctGdp:"SE.XPD.TOTL.GD.ZS",
  primaryCompletion:"SE.PRM.CMPT.ZS", laborForce:"SL.TLF.TOTL.IN", agriculturePctGdp:"NV.AGR.TOTL.ZS", industryPctGdp:"NV.IND.TOTL.ZS",
  servicesPctGdp:"NV.SRV.TOTL.ZS", highTechPctManufExports:"TX.VAL.TECH.MF.ZS", ictPctServiceExports:"BX.GSR.CCIS.ZS",
  fuelPctMerchExports:"TX.VAL.FUEL.ZS.UN", foodPctMerchExports:"TX.VAL.FOOD.ZS.UN", manufPctMerchExports:"TX.VAL.MANF.ZS.UN",
  remittancesPctGdp:"BX.TRF.PWKR.DT.GD.ZS", netMigration:"SM.POP.NETM", internetUsersPct:"IT.NET.USER.ZS",
  gdpPerCapitaUsd:"NY.GDP.PCAP.CD", tertiaryEnrolmentRatio:"SE.TER.ENRR",
};
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
const round = (v) => (v == null ? null : +Number(v).toPrecision(5));

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
const countries = {};
for (const [key, id] of Object.entries(IND)) {
  const [, rows] = await get(`https://api.worldbank.org/v2/country/${C}/indicator/${id}?format=json&mrnev=1&per_page=500`);
  for (const r of rows || []) if (r.value != null) (countries[ISO[r.countryiso3code]] ||= {})[key] = { value: round(r.value), year: +r.date };
}
const [, proj] = await get(`https://api.worldbank.org/v2/country/${C}/indicator/SP.POP.0014.TO?format=json&source=40&date=2030:2050&per_page=1000`);
for (const r of proj || []) if (["2030", "2040", "2050"].includes(r.date)) ((countries[ISO[r.countryiso3code]] ||= {}).children0to14Projected ||= {})[r.date] = Math.round(r.value / 1000) * 1000;
const ai = (await get("https://www.imf.org/external/datamapper/api/v1/AI_PI")).values.AI_PI;
const ranked = Object.entries(ai).map(([c, y]) => [c, Object.entries(y).at(-1)]).filter(([, x]) => x).sort((a, b) => b[1][1] - a[1][1]);
ranked.forEach(([c, [year, v]], i) => { if (ISO[c]) (countries[ISO[c]] ||= {}).aiPreparedness = { value: +v.toFixed(3), rank: i + 1, of: ranked.length, year: +year }; });

data.generated = new Date().toISOString().slice(0, 10);
data.countries = countries;
fs.writeFileSync(FILE, JSON.stringify(data, null, 1));
console.log(`Updated ${Object.keys(countries).length} countries in ${path.relative(ROOT, FILE)}`);
