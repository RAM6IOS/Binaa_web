export const MOCK_PROJECTS = [
  {
    id: "p-1",
    name_ar: "بناء ثانوية 1000 مقعد",
    name_fr: "Lycée 1000 places",
    status: "in_progress", // 'planned', 'in_progress', 'delayed', 'completed'
    progress: 45,
    budget: 150000000,
    spent: 65000000,
    wilaya: "Alger (16)",
    deadline: "2026-12-30",
  },
  {
    id: "p-2",
    name_ar: "تعبيد الطريق الولائي رقم 12",
    name_fr: "Revêtement CW 12",
    status: "delayed",
    progress: 20,
    budget: 85000000,
    spent: 40000000,
    wilaya: "Mostaganem (27)",
    deadline: "2026-05-15",
  },
  {
    id: "p-3",
    name_ar: "محطة معالجة المياه",
    name_fr: "Station d'épuration des eaux",
    status: "planned",
    progress: 0,
    budget: 250000000,
    spent: 0,
    wilaya: "Oran (31)",
    deadline: "2027-02-28",
  }
];

export const MOCK_CHART_DATA = [
  { month: "Jan", budget: 1000, spent: 400 },
  { month: "Feb", budget: 1500, spent: 1200 },
  { month: "Mar", budget: 2000, spent: 1800 },
  { month: "Apr", budget: 2500, spent: 2200 },
  { month: "May", budget: 3000, spent: 2400 },
  { month: "Jun", budget: 3500, spent: 2900 },
];
