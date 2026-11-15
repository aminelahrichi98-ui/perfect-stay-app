/*
  Données de DÉMONSTRATION du tableau de bord investisseur. Fictives : elles ne décrivent
  aucun logement ni aucun propriétaire réel. Pour brancher de vraies données, remplacer
  `chargerTableauDeBord` par un appel à l'API de l'application de gestion (même forme de retour).
*/

export type Mois = { mois: string; revenus: number; occupation: number; prixMoyen: number };
export type Operation = { quand: string; type: "arrivee" | "menage" | "maintenance" | "voyageur"; libelle: string; statut: "fait" | "en_cours" | "prevu" };
export type Controle = { quand: string; piece: string; statut: "valide" | "a_revoir"; teinte: [string, string] };
export type Document = { libelle: string; date: string; montant?: number; type: "depense" | "dommage" | "document" };

export type TableauDeBord = {
  logement: { nom: string; quartier: string; chambres: number };
  mois: Mois[];
  operations: Operation[];
  controles: Controle[];
  documents: Document[];
};

const MOIS: Mois[] = [
  ["Déc.", 14200, 61, 760],
  ["Janv.", 12100, 55, 720],
  ["Févr.", 12800, 58, 735],
  ["Mars", 15600, 66, 780],
  ["Avr.", 16900, 70, 800],
  ["Mai", 17800, 72, 820],
  ["Juin", 19900, 78, 850],
  ["Juil.", 23400, 86, 905],
  ["Août", 24600, 89, 920],
  ["Sept.", 18700, 74, 840],
  ["Oct.", 17300, 71, 815],
  ["Nov.", 15900, 67, 790],
].map(([mois, revenus, occupation, prixMoyen]) => ({ mois: mois as string, revenus: revenus as number, occupation: occupation as number, prixMoyen: prixMoyen as number }));

const DEMO: TableauDeBord = {
  logement: { nom: "Appartement démo", quartier: "Quartier démo, Casablanca", chambres: 2 },
  mois: MOIS,
  operations: [
    { quand: "Aujourd'hui 11:00", type: "menage", libelle: "Ménage après départ", statut: "fait" },
    { quand: "Aujourd'hui 15:00", type: "arrivee", libelle: "Arrivée · 3 voyageurs, 4 nuits", statut: "prevu" },
    { quand: "Aujourd'hui 09:40", type: "voyageur", libelle: "Question sur le parking", statut: "fait" },
    { quand: "Demain 10:00", type: "maintenance", libelle: "Remplacement d'une ampoule (salle de bain)", statut: "en_cours" },
    { quand: "Ven. 12:00", type: "menage", libelle: "Ménage et changement du linge", statut: "prevu" },
  ],
  controles: [
    { quand: "15/11 · 12:48", piece: "Séjour", statut: "valide", teinte: ["#d9cdbd", "#b69a70"] },
    { quand: "15/11 · 12:51", piece: "Chambre", statut: "valide", teinte: ["#ece7de", "#c9b79c"] },
    { quand: "15/11 · 12:55", piece: "Salle de bain", statut: "a_revoir", teinte: ["#e6e2dc", "#a9aeb3"] },
    { quand: "15/11 · 12:58", piece: "Cuisine", statut: "valide", teinte: ["#e9e1d4", "#8c7350"] },
  ],
  documents: [
    { libelle: "Rapport mensuel d'octobre", date: "01/11", type: "document" },
    { libelle: "Remplacement de la machine à café", date: "28/10", montant: 900, type: "depense" },
    { libelle: "Verre cassé · documenté et refacturé", date: "21/10", montant: 120, type: "dommage" },
    { libelle: "Inventaire du logement", date: "02/10", type: "document" },
  ],
};

/** Point d'entrée unique des données du tableau de bord (démonstration aujourd'hui, API demain). */
export async function chargerTableauDeBord(): Promise<TableauDeBord> {
  return DEMO;
}

export const DEMO_SYNC = DEMO;
