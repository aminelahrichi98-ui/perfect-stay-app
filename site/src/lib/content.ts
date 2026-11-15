/*
  Tous les textes du site au même endroit : l'équipe Perfect Stay peut les relire et les ajuster
  sans toucher aux composants. Les mentions marquées `aValider` (conditions, frais, engagements)
  doivent être validées avant toute mise en ligne publique.
*/

export type Profil = "longue" | "courte" | "vacant";

export const MARQUE = {
  nom: "Perfect Stay",
  signature: "La location courte durée, version investisseur.",
  promesse: "Vous restez investisseur. Nous pilotons l'exploitation.",
  ville: "Casablanca",
  villesAVenir: ["Marrakech", "Rabat"],
};

/** Coordonnées publiques : à compléter avant la mise en ligne (laisser vide masque l'élément). */
export const CONTACT = {
  whatsapp: "", // ex. « +212 6 00 00 00 00 »
  email: "", // ex. « contact@perfectstay.ma »
  adresse: "Casablanca, Maroc",
};

export const CTA = {
  principal: "Estimer le potentiel de mon appartement",
  secondaire: "Découvrir notre gestion",
};

export const NAVIGATION = [
  { href: "#parcours", label: "Votre situation" },
  { href: "#appartement", label: "Notre gestion" },
  { href: "#application", label: "L'application" },
  { href: "#methode", label: "Méthode" },
  { href: "#faq", label: "Questions" },
];

export const HERO = {
  surtitre: "Gestion locative courte durée · Casablanca",
  titre: "Votre appartement mérite une meilleure stratégie.",
  texte: "Optimisez les revenus de votre bien grâce à une gestion courte durée professionnelle, pilotée par la technologie.",
  question: "Comment exploitez-vous votre appartement aujourd'hui ?",
};

export const PROFILS: Record<Profil, { titre: string; texte: string; court: string }> = {
  longue: { titre: "Location longue durée", texte: "Je loue avec un bail classique ou cherche un locataire.", court: "Longue durée" },
  courte: { titre: "Location courte durée", texte: "Je loue sur Airbnb, Booking ou d'autres plateformes.", court: "Courte durée" },
  vacant: { titre: "Mon logement est vacant", texte: "Je n'ai pas encore meublé mon logement ou je ne trouve pas de locataire.", court: "Vacant" },
};

export type Scene = { id: string; surtitre: string; titre: string; texte: string };

export const PARCOURS: Record<Profil, { intro: string; scenes: Scene[]; conclusion: { titre: string; cta: string } }> = {
  longue: {
    intro: "Le bail classique, vu sous l'angle de l'investisseur.",
    scenes: [
      {
        id: "vacance",
        surtitre: "La vacance",
        titre: "Chaque mois sans locataire est un manque à gagner.",
        texte: "Un appartement vacant continue de générer des charges, sans produire de revenus locatifs.",
      },
      {
        id: "impaye",
        surtitre: "L'impayé",
        titre: "Un loyer prévu n'est pas toujours un loyer encaissé.",
        texte: "Les impayés peuvent fragiliser la rentabilité et la prévisibilité de votre investissement.",
      },
      {
        id: "rendement",
        surtitre: "Le rendement",
        titre: "Votre appartement exploite-t-il réellement son potentiel ?",
        texte: "Selon son emplacement, ses caractéristiques et la demande, une autre stratégie locative peut être intéressante.",
      },
    ],
    conclusion: { titre: "Et si vous repensiez l'exploitation de votre patrimoine ?", cta: "Découvrir le potentiel de mon bien" },
  },
  courte: {
    intro: "Vous connaissez déjà la courte durée. Et sa charge de travail.",
    scenes: [
      {
        id: "messages",
        surtitre: "Les voyageurs",
        titre: "Votre appartement génère des revenus. Mais combien de temps vous demande-t-il ?",
        texte: "Questions d'arrivée, demandes de check-in, ménage, petites pannes : chaque séjour sollicite votre téléphone.",
      },
      {
        id: "operations",
        surtitre: "L'exploitation",
        titre: "Une réservation n'est que le début du travail.",
        texte: "Chaque séjour implique une succession d'opérations qui doivent être exécutées et contrôlées.",
      },
      {
        id: "portefeuille",
        surtitre: "Le portefeuille",
        titre: "Plus votre portefeuille grandit, plus la gestion devient complexe.",
        texte: "Deux, trois appartements : les opérations ne s'additionnent pas, elles se multiplient.",
      },
    ],
    conclusion: { titre: "Passez de la gestion quotidienne au pilotage de votre investissement.", cta: "Découvrir notre solution de gestion" },
  },
  vacant: {
    intro: "Un bien disponible est une décision à prendre, pas un problème.",
    scenes: [
      {
        id: "disponible",
        surtitre: "Aujourd'hui",
        titre: "Votre appartement est disponible. Donnons-lui une stratégie.",
        texte: "Vacant aujourd'hui ou libéré bientôt : c'est le meilleur moment pour choisir la façon dont il sera exploité.",
      },
      {
        id: "strategies",
        surtitre: "Le choix",
        titre: "Longue ou courte durée : comparez avant de décider.",
        texte: "Nous évaluons le potentiel locatif de votre bien selon son emplacement, sa configuration et la demande du quartier.",
      },
      {
        id: "preparation",
        surtitre: "La suite",
        titre: "Une préparation soignée, puis une mise en ligne maîtrisée.",
        texte: "Ameublement, photos, annonce, procédures : nous préparons votre bien avant le premier voyageur.",
      },
    ],
    conclusion: { titre: "Donnez à votre bien une stratégie d'exploitation.", cta: "Évaluer mon appartement" },
  },
};

export const CONVERGENCE = {
  titre: "Perfect Stay.",
  signature: "La location courte durée, version investisseur.",
  texte: "Une équipe dédiée. Une technologie propriétaire. Une exploitation maîtrisée.",
};

export type GroupeService = "revenus" | "sejours" | "patrimoine";

export const GROUPES_SERVICES: { id: GroupeService; label: string }[] = [
  { id: "revenus", label: "Revenus" },
  { id: "sejours", label: "Séjours" },
  { id: "patrimoine", label: "Patrimoine" },
];

export type Service = {
  id: string;
  groupe: GroupeService;
  titre: string;
  description: string;
  benefice: string;
  etapes: [string, string, string];
};

/** Les services présentés dans l'appartement 3D (la position de chaque point est dans la scène). */
export const SERVICES: Service[] = [
  {
    id: "revenus",
    groupe: "revenus",
    titre: "Optimisation des revenus",
    description: "Tarification dynamique, gestion du calendrier et optimisation de l'annonce selon la saison, les événements et la demande du quartier.",
    benefice: "Votre prix suit le marché, jour après jour.",
    etapes: ["Analyse de la demande", "Ajustement des prix", "Calendrier optimisé"],
  },
  {
    id: "reservations",
    groupe: "revenus",
    titre: "Réservations",
    description: "Coordination des réservations sur les plateformes et gestion centralisée des disponibilités.",
    benefice: "Un calendrier unique, sans double réservation.",
    etapes: ["Demande reçue", "Disponibilité vérifiée", "Séjour confirmé"],
  },
  {
    id: "reporting",
    groupe: "revenus",
    titre: "Reporting propriétaire",
    description: "Suivi des revenus, indicateurs de performance et rapport mensuel détaillé, dans votre espace propriétaire.",
    benefice: "Vous savez ce que rapporte votre bien, chaque mois.",
    etapes: ["Versements rapprochés", "Indicateurs calculés", "Rapport mensuel"],
  },
  {
    id: "verification",
    groupe: "sejours",
    titre: "Vérification des voyageurs",
    description: "Sélection des voyageurs et collecte des documents nécessaires avant l'arrivée.",
    benefice: "Vous savez qui séjourne chez vous.",
    etapes: ["Profil examiné", "Documents collectés", "Arrivée validée"],
  },
  {
    id: "communication",
    groupe: "sejours",
    titre: "Communication voyageurs",
    description: "Assistance centralisée avant, pendant et après le séjour : questions, arrivée, besoins sur place.",
    benefice: "Votre téléphone ne sonne plus à chaque séjour.",
    etapes: ["Message reçu", "Réponse de l'équipe", "Demande résolue"],
  },
  {
    id: "menage",
    groupe: "sejours",
    titre: "Ménage",
    description: "Ménage professionnel et planification des interventions entre chaque séjour, linge compris.",
    benefice: "Un appartement prêt pour chaque arrivée.",
    etapes: ["Départ du voyageur", "Ménage planifié", "Appartement prêt"],
  },
  {
    id: "qualite",
    groupe: "patrimoine",
    titre: "Contrôle qualité",
    description: "Contrôles photographiques horodatés après chaque ménage et supervision des opérations sur le terrain.",
    benefice: "Chaque intervention laisse une preuve datée.",
    etapes: ["Photos horodatées", "Contrôle par un responsable", "Validation"],
  },
  {
    id: "maintenance",
    groupe: "patrimoine",
    titre: "Maintenance",
    description: "Suivi des incidents, coordination des interventions et des réparations, avec historique par logement.",
    benefice: "Les petites pannes ne deviennent pas de gros problèmes.",
    etapes: ["Incident signalé", "Intervention planifiée", "Réparation tracée"],
  },
  {
    id: "dommages",
    groupe: "patrimoine",
    titre: "Gestion des dommages",
    description: "Inspection au départ, documentation, démarches de réclamation et coordination des remplacements.",
    benefice: "Votre bien est protégé et chaque dommage est documenté.",
    etapes: ["Inspection de sortie", "Dommage documenté", "Réclamation suivie"],
  },
];

export const APPLICATION = {
  titre: "Votre patrimoine. Vos performances. Une visibilité complète.",
  texte: "Suivez l'exploitation de votre appartement grâce à un système de gestion centralisé.",
  mention: "Démonstration : données fictives, à des fins d'illustration uniquement.",
};

export const METHODE = [
  { titre: "Évaluation du bien", texte: "Visite, configuration, emplacement et potentiel du quartier." },
  { titre: "Stratégie locative", texte: "Positionnement, cible de voyageurs et politique tarifaire." },
  { titre: "Préparation", texte: "Équipement, linge, mise en conformité et petits travaux." },
  { titre: "Création de l'annonce", texte: "Photos, textes et paramétrage sur les plateformes." },
  { titre: "Lancement et optimisation", texte: "Premiers séjours, ajustements des prix et du calendrier." },
  { titre: "Opérations quotidiennes", texte: "Voyageurs, ménage, contrôle qualité et maintenance." },
  { titre: "Suivi de la performance", texte: "Indicateurs suivis et actions d'amélioration." },
  { titre: "Reporting propriétaire", texte: "Revenus, dépenses et rapport mensuel dans votre espace." },
];

export const OFFRE = {
  titre: "Confiez-nous votre appartement. Gardez le contrôle.",
  offre: "Votre premier mois de gestion offert pour tout nouveau mandat éligible.",
  cta: "Estimer mon potentiel locatif",
  /** Conditions d'éligibilité : texte à valider par Perfect Stay avant publication. */
  conditions: "",
};

export type Question = { question: string; reponse: string; aValider?: boolean };

export const FAQ: Question[] = [
  {
    question: "Quels sont vos frais de gestion ?",
    reponse:
      "Notre rémunération est une commission sur les revenus locatifs, précisée dans le mandat de gestion. Le taux dépend du bien et des services retenus : nous vous le communiquons lors de l'évaluation.",
    aValider: true,
  },
  {
    question: "Comment les voyageurs sont-ils sélectionnés ?",
    reponse: "Nous examinons chaque demande de réservation et collectons les documents nécessaires avant l'arrivée, conformément aux obligations en vigueur.",
  },
  {
    question: "Que se passe-t-il en cas de dommage ?",
    reponse:
      "Une inspection est réalisée au départ de chaque voyageur. Tout dommage est documenté (photos datées) et nous menons les démarches de réclamation auprès du voyageur ou de la plateforme, puis coordonnons la réparation ou le remplacement.",
  },
  {
    question: "Qui s'occupe du ménage et du linge ?",
    reponse: "Nos équipes réalisent le ménage entre chaque séjour, avec un contrôle photographique horodaté. Le linge est géré par nos soins.",
  },
  {
    question: "Comment est gérée la maintenance ?",
    reponse: "Les incidents sont signalés et suivis dans notre système. Nous coordonnons les interventions ; les frais engagés pour votre bien vous sont détaillés.",
  },
  {
    question: "Quelles sont mes obligations légales ?",
    reponse:
      "La location de courte durée est encadrée (déclaration des voyageurs, fiscalité des revenus locatifs, règlement de copropriété). Nous vous présentons les démarches applicables à votre bien lors de l'évaluation. Ces informations ne remplacent pas un conseil juridique ou fiscal.",
    aValider: true,
  },
  {
    question: "Comment suis-je informé de la performance de mon bien ?",
    reponse: "Vous accédez à un espace propriétaire avec vos réservations, vos revenus et un rapport mensuel détaillé.",
  },
  {
    question: "Suis-je engagé sur une longue durée ?",
    reponse: "La durée du mandat et ses conditions de résiliation sont précisées dans le contrat de gestion, présenté avant toute signature.",
    aValider: true,
  },
  {
    question: "Combien de temps faut-il pour démarrer ?",
    reponse: "Après l'évaluation et la signature du mandat, nous préparons le bien, réalisons les photos et créons l'annonce. Le délai dépend de l'état et de l'équipement de l'appartement.",
  },
];

export const PREUVES = {
  titre: "La preuve par l'exploitation.",
  texte: "Témoignages vérifiés, études de cas et exemples de rapports : cette section accueillera uniquement des éléments réels et validés.",
};
