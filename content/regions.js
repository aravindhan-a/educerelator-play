// All 36 regions of India — 28 states + 8 union territories.
// Region ids are used in content paths (content/regions/{id}/...),
// question-bank cache keys, and as the backend AI-generation allowlist.

export const STATES = [
  { id: "andhra-pradesh",    label: "Andhra Pradesh" },
  { id: "arunachal-pradesh", label: "Arunachal Pradesh" },
  { id: "assam",             label: "Assam" },
  { id: "bihar",             label: "Bihar" },
  { id: "chhattisgarh",      label: "Chhattisgarh" },
  { id: "goa",               label: "Goa" },
  { id: "gujarat",           label: "Gujarat" },
  { id: "haryana",           label: "Haryana" },
  { id: "himachal-pradesh",  label: "Himachal Pradesh" },
  { id: "jharkhand",         label: "Jharkhand" },
  { id: "karnataka",         label: "Karnataka" },
  { id: "kerala",            label: "Kerala" },
  { id: "madhya-pradesh",    label: "Madhya Pradesh" },
  { id: "maharashtra",       label: "Maharashtra" },
  { id: "manipur",           label: "Manipur" },
  { id: "meghalaya",         label: "Meghalaya" },
  { id: "mizoram",           label: "Mizoram" },
  { id: "nagaland",          label: "Nagaland" },
  { id: "odisha",            label: "Odisha" },
  { id: "punjab",            label: "Punjab" },
  { id: "rajasthan",         label: "Rajasthan" },
  { id: "sikkim",            label: "Sikkim" },
  { id: "tamil-nadu",        label: "Tamil Nadu" },
  { id: "telangana",         label: "Telangana" },
  { id: "tripura",           label: "Tripura" },
  { id: "uttar-pradesh",     label: "Uttar Pradesh" },
  { id: "uttarakhand",       label: "Uttarakhand" },
  { id: "west-bengal",       label: "West Bengal" },
];

export const UNION_TERRITORIES = [
  { id: "andaman-nicobar",   label: "Andaman & Nicobar Islands" },
  { id: "chandigarh",        label: "Chandigarh" },
  { id: "dnh-daman-diu",     label: "Dadra & Nagar Haveli and Daman & Diu" },
  { id: "delhi",             label: "Delhi" },
  { id: "jammu-kashmir",     label: "Jammu & Kashmir" },
  { id: "ladakh",            label: "Ladakh" },
  { id: "lakshadweep",       label: "Lakshadweep" },
  { id: "puducherry",        label: "Puducherry" },
];

export const ALL_REGIONS = [...STATES, ...UNION_TERRITORIES];

export function getRegionLabel(id) {
  return ALL_REGIONS.find((r) => r.id === id)?.label || null;
}
