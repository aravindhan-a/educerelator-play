import { ISO_TO_REGION, REGION_LABELS } from "../lib/regions.js";

// Resolves the caller's Indian state/UT from the geo headers the CDN attaches
// to the request — no browser permission prompt, no third-party service, and
// we never store the IP. Returns { region: "all" } when it can't be determined
// (outside India, header missing, or a state we have no content for), which the
// frontend treats as generic all-India content.

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // region can change as a user travels; let it cache briefly, not forever
  res.setHeader("Cache-Control", "no-store");
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).end();

  const h = req.headers;
  const country = (h["x-vercel-ip-country"] || "").toUpperCase();
  const rawRegion = (h["x-vercel-ip-country-region"] || "").toUpperCase();
  // Header can be "IN-TN" or just "TN" depending on the edge; take the tail.
  const code = rawRegion.includes("-") ? rawRegion.split("-").pop() : rawRegion;

  let region = "all";
  if (country === "IN" && ISO_TO_REGION[code]) region = ISO_TO_REGION[code];

  res.status(200).json({
    region,
    label: region === "all" ? null : REGION_LABELS[region],
  });
}
