// Competitive-exam taxonomy for the PYQ (previous-year-question) tracks.
// Mirrors content/curriculum.js. Drives the exam → subject → topic navigation
// and (later) the timed-mock pattern. Content lives in content/exams/<exam>/<subject>.json.

export const EXAMS = [
  {
    id: "neet",
    label: "NEET",
    emoji: "🩺",
    // official pattern — used by the timed-mock engine (Phase C)
    pattern: { total: 180, durationMin: 200, marking: { correct: 4, wrong: -1 } },
    subjects: [
      { id: "physics",   label: "Physics",   emoji: "⚛️", topics: [] },
      { id: "chemistry", label: "Chemistry", emoji: "🧪", topics: [] },
      {
        id: "biology", label: "Biology", emoji: "🧬",
        topics: [
          "diversity-in-living-world",
          "structural-organisation",
          "cell-structure-function",
          "plant-physiology",
          "human-physiology",
          "reproduction",
          "genetics-evolution",
          "biology-in-human-welfare",
          "biotechnology",
          "ecology",
        ],
      },
    ],
  },
  {
    id: "jee", label: "JEE", emoji: "📐",
    pattern: { total: 90, durationMin: 180, marking: { correct: 4, wrong: -1 } },
    subjects: [
      { id: "physics",     label: "Physics",     emoji: "⚛️", topics: [] },
      { id: "chemistry",   label: "Chemistry",   emoji: "🧪", topics: [] },
      { id: "mathematics", label: "Mathematics", emoji: "📐", topics: [] },
    ],
  },
  {
    id: "upsc", label: "UPSC", emoji: "🏛️",
    pattern: { total: 100, durationMin: 120, marking: { correct: 2, wrong: -0.66 } },
    subjects: [
      { id: "polity",          label: "Polity",          emoji: "⚖️", topics: [] },
      { id: "history",         label: "History",         emoji: "📜", topics: [] },
      { id: "geography",       label: "Geography",       emoji: "🌍", topics: [] },
      { id: "economy",         label: "Economy",         emoji: "📊", topics: [] },
      { id: "environment",     label: "Environment",     emoji: "🌱", topics: [] },
      { id: "current-affairs", label: "Current Affairs", emoji: "🗞️", topics: [] },
    ],
  },
];

const TOPIC_LABELS = {
  "diversity-in-living-world": "Diversity in Living World",
  "structural-organisation":   "Structural Organisation",
  "cell-structure-function":   "Cell Structure & Function",
  "plant-physiology":          "Plant Physiology",
  "human-physiology":          "Human Physiology",
  "reproduction":              "Reproduction",
  "genetics-evolution":        "Genetics & Evolution",
  "biology-in-human-welfare":  "Biology in Human Welfare",
  "biotechnology":             "Biotechnology",
  "ecology":                   "Ecology & Environment",
};

export function getExam(id) {
  return EXAMS.find((e) => e.id === id) || null;
}
export function getExamSubject(examId, subjectId) {
  const exam = getExam(examId);
  return exam ? exam.subjects.find((s) => s.id === subjectId) || null : null;
}
export function topicLabel(id) {
  return TOPIC_LABELS[id] || id;
}
