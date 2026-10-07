import {
  BedDouble,
  Briefcase,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  ClipboardCheck,
  Compass,
  Home,
  LayoutDashboard,
  Megaphone,
  PackageOpen,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "dashboard"
  | "taches"
  | "strategie"
  | "marketing"
  | "crm"
  | "onboarding"
  | "logements"
  | "calendrier"
  | "menage"
  | "maintenance"
  | "stock"
  | "checklists"
  | "comptabilite"
  | "rh"
  | "parametres"
  | "documents_sensibles";

export type ModuleDef = {
  key: ModuleKey;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Phase de construction (cahier des charges §11) */
  phase: number;
  /** Description courte, affichée dans les droits et sur le tableau de bord */
  description: string;
  /** Regroupe les sous-pages d'Opérations */
  groupe?: "operations";
  /** Droit sans page propre : n'apparaît ni dans le menu ni sur le tableau de bord */
  masque?: boolean;
};

export const MODULES: ModuleDef[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, phase: 8, description: "Chiffres clés du jour" },
  { key: "taches", label: "Tâches", href: "/taches", icon: CheckSquare, phase: 6, description: "To-do par pôle, semaine et Kanban" },
  { key: "strategie", label: "Stratégie entreprise", href: "/strategie", icon: Compass, phase: 8, description: "Décisions et avancement par pôle" },
  { key: "marketing", label: "Marketing", href: "/marketing", icon: Megaphone, phase: 7, description: "Dépenses pub et publications" },
  { key: "crm", label: "CRM", href: "/crm", icon: Users, phase: 7, description: "Prospects propriétaires" },
  { key: "onboarding", label: "Onboarding", href: "/onboarding", icon: Rocket, phase: 5, description: "Intégration d'un nouveau logement" },
  { key: "logements", label: "Logements", href: "/logements", icon: Home, phase: 2, description: "Fiches, documents, contacts" },
  { key: "calendrier", label: "Calendrier", href: "/calendrier", icon: CalendarDays, phase: 3, description: "Réservations et synchronisation Airbnb" },
  { key: "menage", label: "Ménage", href: "/operations/menage", icon: Sparkles, phase: 5, description: "Planning des ménages", groupe: "operations" },
  { key: "maintenance", label: "Maintenance", href: "/operations/maintenance", icon: Wrench, phase: 5, description: "Incidents et réparations", groupe: "operations" },
  { key: "stock", label: "Stock", href: "/operations/stock", icon: PackageOpen, phase: 5, description: "Linge et consommables", groupe: "operations" },
  { key: "checklists", label: "Check-lists", href: "/operations/check-lists", icon: ClipboardCheck, phase: 5, description: "Check-lists à cocher sur téléphone", groupe: "operations" },
  { key: "comptabilite", label: "Comptabilité", href: "/comptabilite", icon: Wallet, phase: 4, description: "Versements, commissions, rapports" },
  { key: "rh", label: "RH", href: "/rh", icon: Briefcase, phase: 8, description: "Équipe et recrutements" },
  { key: "parametres", label: "Paramètres", href: "/parametres", icon: Settings, phase: 1, description: "Utilisateurs, droits, informations de l'entreprise" },
  { key: "documents_sensibles", label: "Fiches de police", href: "/logements", icon: ShieldCheck, phase: 2, description: "Pièces d'identité des voyageurs (données personnelles)", masque: true },
];

/** Dernière phase livrée : les modules de cette phase ou des précédentes sont « Disponibles » */
export const PHASE_ACTUELLE = 4;

export const MODULE_KEYS = MODULES.map((m) => m.key);

export const MODULE_BY_KEY = Object.fromEntries(MODULES.map((m) => [m.key, m])) as Record<ModuleKey, ModuleDef>;

export const OPERATIONS = { label: "Opérations", icon: BedDouble, href: "/operations" } as const;
export const CALENDAR_ICON = CalendarRange;

export function isModuleKey(valeur: string): valeur is ModuleKey {
  return (MODULE_KEYS as string[]).includes(valeur);
}

/** Pôles de l'équipe (cahier des charges §4.1) */
export const POLES = [
  "Stratégie",
  "Recrutement",
  "Marketing",
  "Sales / CRM",
  "Opérations",
  "Relations clients",
  "Automatisations",
  "Comptabilité",
  "RH",
] as const;

export type TypeUtilisateur = "equipe" | "proprietaire" | "prestataire";

export const TYPES_UTILISATEUR: { value: TypeUtilisateur; label: string; description: string }[] = [
  { value: "equipe", label: "Équipe", description: "Accède aux modules cochés ci-dessous" },
  { value: "proprietaire", label: "Propriétaire", description: "Voit uniquement l'Espace propriétaire, limité à ses logements" },
  { value: "prestataire", label: "Prestataire", description: "Ménage, maintenance : seulement les tâches qui lui sont attribuées" },
];

export type Droit = { voir: boolean; modifier: boolean };
export type Droits = Partial<Record<ModuleKey, Droit>>;

/** Modèles de droits proposés à la création d'un compte (gain de temps, modifiables) */
export const MODELES_DROITS: { id: string; label: string; droits: Droits }[] = [
  {
    id: "terrain",
    label: "Opérations terrain",
    droits: {
      onboarding: { voir: true, modifier: true },
      logements: { voir: true, modifier: true },
      calendrier: { voir: true, modifier: true },
      menage: { voir: true, modifier: true },
      maintenance: { voir: true, modifier: true },
      stock: { voir: true, modifier: true },
      checklists: { voir: true, modifier: true },
    },
  },
  {
    id: "prestataire",
    label: "Prestataire ménage",
    droits: {
      taches: { voir: true, modifier: true },
      menage: { voir: true, modifier: true },
      checklists: { voir: true, modifier: true },
    },
  },
  {
    id: "lecture",
    label: "Tout en lecture",
    droits: Object.fromEntries(MODULE_KEYS.filter((k) => k !== "parametres" && k !== "documents_sensibles").map((k) => [k, { voir: true, modifier: false }])),
  },
];

export type Accordant = { admin: boolean; droits: Droits };

/**
 * Règle de sécurité (cahier des charges §4.3) : on ne peut jamais donner un droit
 * qu'on n'a pas soi-même. Cette fonction décide, module par module, des droits
 * finaux d'un compte lorsque `accordant` (Abdelkarim, par exemple) le crée ou le modifie.
 *
 * - Pour un droit que l'accordant possède : la valeur demandée est appliquée.
 * - Pour un droit qu'il ne possède pas : la valeur existante est conservée
 *   (rien pour un nouveau compte). Si la demande tente de l'ajouter, le module est
 *   listé dans `refuses` et l'enregistrement doit être refusé.
 * - « Modifier » implique toujours « Voir ».
 */
export function fusionnerDroits(
  demandes: Droits,
  existants: Droits,
  accordant: Accordant,
): { droits: Droits; refuses: ModuleKey[] } {
  const droits: Droits = {};
  const refuses: ModuleKey[] = [];

  for (const key of MODULE_KEYS) {
    const demande = demandes[key] ?? { voir: false, modifier: false };
    const existant = existants[key] ?? { voir: false, modifier: false };
    const possede = accordant.droits[key] ?? { voir: false, modifier: false };

    const peutVoir = accordant.admin || possede.voir;
    const peutModifier = accordant.admin || possede.modifier;

    if ((demande.voir && !existant.voir && !peutVoir) || (demande.modifier && !existant.modifier && !peutModifier)) {
      refuses.push(key);
    }

    const modifier = peutModifier ? demande.modifier : existant.modifier;
    const voir = (peutVoir ? demande.voir : existant.voir) || modifier;
    if (voir || modifier) droits[key] = { voir, modifier };
  }
  return { droits, refuses };
}
