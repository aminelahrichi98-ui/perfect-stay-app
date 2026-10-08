export const CATEGORIES_DEPENSE = [
  { value: "linge", label: "Linge" },
  { value: "menage", label: "Ménage" },
  { value: "maintenance", label: "Maintenance" },
  { value: "prestataires", label: "Prestataires" },
  { value: "salaires", label: "Salaires" },
  { value: "deplacement", label: "Déplacement" },
  { value: "marketing", label: "Marketing" },
] as const;

export const libelleCategorie = (v: string) => CATEGORIES_DEPENSE.find((c) => c.value === v)?.label ?? v;
