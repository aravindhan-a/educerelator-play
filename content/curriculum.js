// Curriculum config — shared by both builds.
// Defines subjects per class group, curriculum options, and helper functions.

export const CURRICULA = [
  { id: "cbse",          label: "CBSE" },
  { id: "state",         label: "State Board" },
  { id: "international", label: "International" },
];

const GROUPS = [
  {
    range: [1, 2],
    groupLabel: "Primary",
    colorClass: "group-primary-low",
    subjects: [
      { id: "math",    label: "Mathematics",        emoji: "🔢" },
      { id: "english", label: "English",             emoji: "📖" },
      { id: "evs",     label: "Env. Science",        emoji: "🌿" },
    ],
  },
  {
    range: [3, 5],
    groupLabel: "Primary",
    colorClass: "group-primary",
    subjects: [
      { id: "math",          label: "Mathematics",   emoji: "🔢" },
      { id: "english",       label: "English",       emoji: "📖" },
      { id: "science",       label: "Science",       emoji: "🔬" },
      { id: "social-studies",label: "Social Studies",emoji: "🗺️" },
    ],
  },
  {
    range: [6, 8],
    groupLabel: "Middle",
    colorClass: "group-middle",
    subjects: [
      { id: "math",          label: "Mathematics",   emoji: "🔢" },
      { id: "science",       label: "Science",       emoji: "🔬" },
      { id: "english",       label: "English",       emoji: "📖" },
      { id: "social-studies",label: "Social Studies",emoji: "🗺️" },
      { id: "hindi",         label: "Hindi",         emoji: "🇮🇳" },
      { id: "tamil",         label: "Tamil",         emoji: "🌺" },
    ],
  },
  {
    range: [9, 10],
    groupLabel: "Secondary",
    colorClass: "group-secondary",
    subjects: [
      { id: "math",             label: "Mathematics",      emoji: "📐" },
      { id: "science",          label: "Science",          emoji: "🔬" },
      { id: "english",          label: "English",          emoji: "📖" },
      { id: "social-studies",   label: "Social Studies",   emoji: "🗺️" },
      { id: "computer-science", label: "Computer Science", emoji: "💻" },
    ],
  },
  {
    range: [11, 12],
    groupLabel: "Senior",
    colorClass: "group-senior",
    subjects: [
      { id: "math",              label: "Mathematics",       emoji: "📐" },
      { id: "physics",           label: "Physics",           emoji: "⚡" },
      { id: "chemistry",         label: "Chemistry",         emoji: "🧪" },
      { id: "biology",           label: "Biology",           emoji: "🧬" },
      { id: "english",           label: "English",           emoji: "📖" },
      { id: "economics",         label: "Economics",         emoji: "📊" },
      { id: "business-studies",  label: "Business Studies",  emoji: "💼" },
      { id: "history",           label: "History",           emoji: "📜" },
      { id: "geography",         label: "Geography",         emoji: "🌍" },
      { id: "political-science", label: "Political Science", emoji: "⚖️" },
      { id: "computer-science",  label: "Computer Science",  emoji: "💻" },
      { id: "psychology",        label: "Psychology",        emoji: "🧠" },
      { id: "sociology",         label: "Sociology",         emoji: "👥" },
    ],
  },
];

export function getGroupForClass(classNum) {
  return GROUPS.find(
    (g) => classNum >= g.range[0] && classNum <= g.range[1]
  );
}

export function getSubjectsForClass(classNum) {
  return getGroupForClass(classNum)?.subjects ?? [];
}

export const ALL_CLASSES = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const group = getGroupForClass(n);
  return {
    num: n,
    groupLabel: group.groupLabel,
    colorClass: group.colorClass,
  };
});
