// Server-side allowlist of India's 36 regions (28 states + 8 UTs).
// Mirrors content/regions.js in the frontend repo. Only ids from this map
// may reach the AI prompt — the region param is user input.

export const REGION_LABELS = {
  "andhra-pradesh":    "Andhra Pradesh",
  "arunachal-pradesh": "Arunachal Pradesh",
  "assam":             "Assam",
  "bihar":             "Bihar",
  "chhattisgarh":      "Chhattisgarh",
  "goa":               "Goa",
  "gujarat":           "Gujarat",
  "haryana":           "Haryana",
  "himachal-pradesh":  "Himachal Pradesh",
  "jharkhand":         "Jharkhand",
  "karnataka":         "Karnataka",
  "kerala":            "Kerala",
  "madhya-pradesh":    "Madhya Pradesh",
  "maharashtra":       "Maharashtra",
  "manipur":           "Manipur",
  "meghalaya":         "Meghalaya",
  "mizoram":           "Mizoram",
  "nagaland":          "Nagaland",
  "odisha":            "Odisha",
  "punjab":            "Punjab",
  "rajasthan":         "Rajasthan",
  "sikkim":            "Sikkim",
  "tamil-nadu":        "Tamil Nadu",
  "telangana":         "Telangana",
  "tripura":           "Tripura",
  "uttar-pradesh":     "Uttar Pradesh",
  "uttarakhand":       "Uttarakhand",
  "west-bengal":       "West Bengal",
  "andaman-nicobar":   "Andaman & Nicobar Islands",
  "chandigarh":        "Chandigarh",
  "dnh-daman-diu":     "Dadra & Nagar Haveli and Daman & Diu",
  "delhi":             "Delhi",
  "jammu-kashmir":     "Jammu & Kashmir",
  "ladakh":            "Ladakh",
  "lakshadweep":       "Lakshadweep",
  "puducherry":        "Puducherry",
};

// ISO 3166-2:IN subdivision code → our region id. Used to turn the geo
// headers a CDN attaches to a request (e.g. Vercel's x-vercel-ip-country-region)
// into a region we have content for. Includes a few legacy/alias codes.
export const ISO_TO_REGION = {
  AP: "andhra-pradesh", AR: "arunachal-pradesh", AS: "assam", BR: "bihar",
  CT: "chhattisgarh", CG: "chhattisgarh", GA: "goa", GJ: "gujarat",
  HR: "haryana", HP: "himachal-pradesh", JH: "jharkhand", KA: "karnataka",
  KL: "kerala", MP: "madhya-pradesh", MH: "maharashtra", MN: "manipur",
  ML: "meghalaya", MZ: "mizoram", NL: "nagaland", OR: "odisha", OD: "odisha",
  PB: "punjab", RJ: "rajasthan", SK: "sikkim", TN: "tamil-nadu",
  TG: "telangana", TS: "telangana", TR: "tripura", UP: "uttar-pradesh",
  UT: "uttarakhand", UK: "uttarakhand", WB: "west-bengal",
  AN: "andaman-nicobar", CH: "chandigarh", DH: "dnh-daman-diu",
  DN: "dnh-daman-diu", DD: "dnh-daman-diu", DL: "delhi", JK: "jammu-kashmir",
  LA: "ladakh", LD: "lakshadweep", PY: "puducherry",
};
