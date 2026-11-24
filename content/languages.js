// Every language EC Play speaks, in the order the language menu lists them.
//
// status "reviewed": checked by native speakers (the original 13).
// status "preview":  drafted with AI (Nov 2026) for Class 1 and labelled
//   "Preview" in the app until a native speaker reviews it. Its Class 1
//   strings live in content/i18n/class1-preview.json; when a review is done,
//   set the status there and here to "reviewed".
// dir "rtl" languages render right to left.

export const LANGUAGES = [
  { code: "en", native: "English", english: "English", status: "reviewed" },
  { code: "hi", native: "हिन्दी", english: "Hindi", status: "reviewed" },
  { code: "bn", native: "বাংলা", english: "Bengali", status: "reviewed" },
  { code: "te", native: "తెలుగు", english: "Telugu", status: "reviewed" },
  { code: "mr", native: "मराठी", english: "Marathi", status: "reviewed" },
  { code: "ta", native: "தமிழ்", english: "Tamil", status: "reviewed" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", status: "reviewed" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", status: "reviewed" },
  { code: "ml", native: "മലയാളം", english: "Malayalam", status: "reviewed" },
  { code: "or", native: "ଓଡ଼ିଆ", english: "Odia", status: "reviewed" },
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi", status: "reviewed" },
  { code: "ur", native: "اردو", english: "Urdu", status: "reviewed", dir: "rtl" },
  { code: "ne", native: "नेपाली", english: "Nepali", status: "reviewed" },
  { code: "si", native: "සිංහල", english: "Sinhala", status: "preview" },
  { code: "ar", native: "العربية", english: "Arabic", status: "preview", dir: "rtl" },
  { code: "ms", native: "Bahasa Melayu", english: "Malay", status: "preview" },
  { code: "zh", native: "中文", english: "Chinese", status: "preview" },
  { code: "es", native: "Español", english: "Spanish", status: "preview" },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));
export const getLanguage = (code) => BY_CODE.get(code) || null;
export const isPreview = (code) => BY_CODE.get(code)?.status === "preview";
export const isRtl = (code) => BY_CODE.get(code)?.dir === "rtl";
