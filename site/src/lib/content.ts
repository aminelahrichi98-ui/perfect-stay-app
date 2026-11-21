/*
  Tous les textes du site au même endroit : l'équipe Perfect Stay peut les relire et les ajuster
  sans toucher aux composants. Les mentions marquées `aValider` (conditions, frais, engagements)
  doivent être validées avant toute mise en ligne publique.
*/

export type Profil = "longue" | "courte" | "vacant";

export const MARQUE = {
  nom: "Perfect Stay",
  signature: "Optimisez vos revenus. Nous nous occupons du reste.",
  promesse: "Votre appartement a un potentiel de revenus. Nous savons comment l'exploiter.",
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
  principal: "Découvrir le potentiel de mon appartement",
  secondaire: "Comment fonctionne Perfect Stay ?",
  audit: "Recevoir mon audit de rentabilité offert",
  court: "Mon audit offert",
};

export const NAVIGATION = [
  { href: "/methode", label: "Notre méthode" },
  { href: "/etudes-de-cas", label: "Études de cas" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/a-propos", label: "Notre expertise" },
  { href: "/audit", label: "Revenue Audit" },
];

export const HERO = {
  surtitre: "Location courte durée · Casablanca",
  titre: "Votre appartement vous rapporte-t-il vraiment tout ce qu'il pourrait ?",
  texte: "Découvrez le véritable potentiel locatif de votre bien à Casablanca grâce à notre expertise en location courte durée, optimisation des revenus et gestion immobilière.",
  question: "Quelle est la situation actuelle de votre appartement ?",
};

export const PROFILS: Record<Profil, { titre: string; texte: string; court: string }> = {
  longue: { titre: "Mon appartement est loué en longue durée", texte: "Vous louez actuellement votre bien à un locataire avec un bail classique.", court: "Longue durée" },
  vacant: { titre: "Mon appartement est actuellement vide", texte: "Votre bien est inoccupé ou vous envisagez de commencer à le louer.", court: "Vacant" },
  courte: { titre: "Je loue déjà sur Airbnb ou Booking", texte: "Votre logement est déjà exploité en courte durée, seul ou avec une conciergerie.", court: "Courte durée" },
};

export type Scene = { id: string; surtitre: string; titre: string; texte: string };

export type Probleme = { titre: string; texte: string };
export type ParcoursProfil = {
  usp: string;
  sousTitre: string;
  titreProblemes: string;
  problemes: Probleme[];
  solution: { titre: string; intro?: string; points: string[]; ordonne?: boolean; mention?: string };
  cta: string;
};

export const PARCOURS: Record<Profil, ParcoursProfil> = {
  longue: {
    usp: "Vous connaissez le loyer de votre appartement. Mais connaissez-vous son véritable potentiel locatif ?",
    sousTitre: "Découvrez si la location courte durée pourrait vous permettre d'améliorer la rentabilité de votre bien, sans avoir à gérer les voyageurs et les réservations.",
    titreProblemes: "Votre investissement immobilier pourrait-il travailler davantage pour vous ?",
    problemes: [
      { titre: "Vacance locative", texte: "Chaque mois sans locataire représente un revenu potentiel perdu, alors que les charges continuent." },
      { titre: "Loyers impayés", texte: "Un seul locataire qui ne paie plus peut fragiliser les revenus de votre investissement pendant plusieurs mois." },
      { titre: "Dégradations", texte: "Certains incidents peuvent entraîner des réparations coûteuses, des litiges et une immobilisation prolongée du logement." },
      { titre: "Rentabilité limitée", texte: "Votre loyer est généralement fixé pour une période prolongée, alors que la demande et les prix du marché évoluent." },
    ],
    solution: {
      titre: "Et si votre appartement pouvait générer davantage de revenus grâce à une autre stratégie locative ?",
      intro: "Le Perfect Stay Investor Program compare les deux stratégies, chiffres à l'appui, avant toute décision.",
      points: ["Analyse comparative longue durée / courte durée", "Étude de la demande locative", "Optimisation du positionnement du bien", "Stratégie tarifaire dynamique", "Gestion complète de l'exploitation", "Reporting transparent"],
      mention: "La courte durée n'est pas toujours la stratégie la plus rentable : l'audit vous le dit pour votre bien.",
    },
    cta: "Comparer mes revenus en longue durée et courte durée",
  },
  vacant: {
    usp: "Chaque mois où votre appartement reste vide, son potentiel de revenus reste inexploité.",
    sousTitre: "Transformez votre appartement inutilisé en investissement locatif opérationnel grâce à un accompagnement complet, de sa préparation à sa gestion quotidienne.",
    titreProblemes: "Un appartement vide continue de coûter.",
    problemes: [
      { titre: "Revenus inexistants", texte: "Votre appartement ne génère aucun revenu pendant qu'il reste inoccupé." },
      { titre: "Charges permanentes", texte: "Charges de copropriété, entretien et autres dépenses continuent même lorsque votre logement est vide." },
      { titre: "Manque de temps", texte: "Préparer un appartement, publier des annonces et gérer des voyageurs demande du temps et de l'organisation." },
      { titre: "Manque d'expertise", texte: "Sans connaissance du marché, du pricing et des attentes des voyageurs, il est difficile d'exploiter pleinement le potentiel du logement." },
    ],
    solution: {
      titre: "De votre appartement vide à un investissement locatif prêt à accueillir ses premiers voyageurs.",
      points: ["Analyse du potentiel locatif", "Audit du logement", "Recommandations d'ameublement et de design", "Préparation du logement", "Photographie professionnelle", "Création des annonces", "Stratégie tarifaire", "Mise en ligne et ouverture des réservations", "Gestion complète"],
      ordonne: true,
    },
    cta: "Découvrir le potentiel de mon appartement vide",
  },
  courte: {
    usp: "Votre Airbnb vous rapporte de l'argent. Mais combien vous coûte-t-il en temps et en revenus manqués ?",
    sousTitre: "Nous analysons vos tarifs, votre taux d'occupation, votre annonce et votre positionnement pour identifier les opportunités d'amélioration de votre rentabilité.",
    titreProblemes: "Ce qui freine la performance d'une annonce.",
    problemes: [
      { titre: "Pricing inefficace", texte: "Un tarif trop élevé peut réduire les réservations. Un tarif trop faible peut vous faire perdre des revenus." },
      { titre: "Mauvaise connaissance du marché", texte: "La saisonnalité, les événements, les périodes de forte demande et la concurrence influencent directement les performances." },
      { titre: "Annonce peu attractive", texte: "Des photographies moyennes, un design peu différenciant ou une annonce mal optimisée peuvent réduire votre attractivité." },
      { titre: "Gestion chronophage", texte: "Messages, arrivées, départs, ménage, maintenance et incidents demandent une disponibilité permanente." },
      { titre: "Expérience voyageur insuffisante", texte: "Une mauvaise expérience peut affecter les avis, la visibilité et les réservations futures." },
    ],
    solution: {
      titre: "Votre appartement est déjà sur Airbnb. Passons maintenant à l'optimisation de sa performance.",
      points: ["Audit des performances existantes", "Benchmark concurrentiel", "Optimisation du prix moyen par nuit", "Analyse du taux d'occupation", "Optimisation des annonces OTA", "Recommandations de design et de photographie", "Gestion de l'expérience voyageur", "Automatisation et gestion opérationnelle", "Reporting mensuel"],
    },
    cta: "Auditer les performances de mon Airbnb",
  },
};

export const PROGRAMME = {
  surtitre: "Perfect Stay Investor Program",
  titre: "Une méthode complète pour exploiter le potentiel de votre investissement immobilier.",
  piliers: [
    { id: "audit", nom: "Revenue Audit", accroche: "Savoir avant de décider.", texte: "Analyse du bien, de son marché, de son potentiel locatif et de ses perspectives de revenus.", details: ["Étude du quartier et de la demande", "Potentiel de chiffre d'affaires et d'occupation", "Comparaison avec la longue durée lorsque pertinente", "Estimation du revenu net propriétaire"] },
    { id: "upgrade", nom: "Property Upgrade", accroche: "Un logement qui donne envie de réserver.", texte: "Valorisation du logement : design d'intérieur, équipements, décoration, photographies et optimisation de la présentation.", details: ["Recommandations de design et d'ameublement", "Équipements attendus par les voyageurs", "Photographie professionnelle", "Présentation de l'annonce"] },
    { id: "optimisation", nom: "Revenue Optimization", accroche: "Le bon prix, chaque nuit.", texte: "Pricing dynamique, optimisation des annonces, stratégie de distribution et suivi des indicateurs de performance.", details: ["Pricing dynamique selon saison et événements", "Optimisation des annonces Airbnb et Booking", "Stratégie de distribution", "Suivi du prix moyen et de l'occupation"] },
    { id: "gestion", nom: "Performance Management", accroche: "L'exploitation, sans vous.", texte: "Gestion des voyageurs, ménage, maintenance, contrôle qualité et rapports propriétaires.", details: ["Sélection et accueil des voyageurs", "Ménage professionnel et contrôles qualité", "Maintenance coordonnée", "Rapport propriétaire mensuel"] },
  ],
};

export const AUDIT = {
  nom: "Perfect Stay Revenue Audit",
  titre: "Combien votre appartement pourrait-il réellement vous rapporter ?",
  texte: "Recevez une analyse personnalisée du potentiel locatif de votre appartement à Casablanca, réalisée par notre équipe.",
  contenu: [
    "Le potentiel de chiffre d'affaires en courte durée",
    "Une estimation du taux d'occupation",
    "Le prix moyen par nuit envisageable",
    "Une comparaison avec la location longue durée lorsque pertinente",
    "Une estimation des charges d'exploitation",
    "Une estimation du revenu net propriétaire",
    "Les opportunités de valorisation de votre appartement",
    "Les recommandations pour améliorer votre positionnement sur Airbnb et Booking",
  ],
  /** L'audit est réellement facturé 500 MAD (confirmé par Perfect Stay) : le prix barré est légitime. */
  prixHabituel: 500,
  prixActuel: 0,
  description: "Une analyse personnalisée pour comprendre le potentiel locatif de votre appartement et identifier les opportunités d'amélioration de sa rentabilité.",
};

/** Tarifs confirmés par Perfect Stay. Ne rien ajouter ici qui n'ait été validé. */
export const TARIFS = {
  commissions: [
    { bien: "Appartements", taux: "20 % HT" },
    { bien: "Villas et riads", taux: "15 % HT" },
  ],
  base: "La commission est calculée sur les revenus locatifs après déduction des frais de plateforme (Airbnb, Booking).",
  /** Postes non encore chiffrés publiquement : présentés tels quels, sans montant inventé. */
  autresPostes: [
    { titre: "Frais de ménage", texte: "Selon le logement, ils sont réglés par le voyageur à chaque séjour. Leur montant et leur affectation sont fixés avec vous et figurent sur votre relevé." },
    { titre: "Préparation et mise en service", texte: "Ameublement, équipements, photos : les besoins sont chiffrés dans votre audit, avant tout engagement." },
    { titre: "Maintenance et prestations complémentaires", texte: "Les interventions sont réalisées avec votre accord et détaillées ligne par ligne sur votre relevé." },
  ],
};

/*
  Études de cas RÉELLES. Laisser le tableau vide tant qu'aucune donnée validée n'est disponible :
  le site affiche alors un état d'attente, sans aucun chiffre. `nature` distingue un résultat
  observé d'une estimation ou d'une projection.
*/
export type EtudeDeCas = {
  id: string;
  quartier: string;
  typologie: string;
  surface: number;
  chambres: number;
  periode: string;
  nature: "reel" | "estimation" | "projection";
  loyerLongueDuree: number; // MAD / mois, référence
  chiffreAffairesMensuel: number; // MAD / mois, courte durée
  tauxOccupation: number; // %
  adr: number; // MAD / nuit
  chargesMensuelles: number; // MAD / mois
  revenuNetMensuel: number; // MAD / mois
  commentaire?: string;
};
export const ETUDES_DE_CAS: EtudeDeCas[] = [];

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
  cta: "Recevoir mon audit de rentabilité offert",
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
  titre: "La preuve par les chiffres.",
  texte: "Témoignages vérifiés, études de cas et exemples de rapports : cette section accueillera uniquement des éléments réels et validés.",
};
