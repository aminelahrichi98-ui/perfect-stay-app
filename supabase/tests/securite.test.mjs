import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();
const R = new URL("../migrations/", import.meta.url).pathname;

await db.exec(`
  create role authenticated;
  create role anon;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  grant usage on schema public to authenticated;
`);
const FICHIERS = ["0001_fondations.sql", "0002_logements.sql", "0003_calendrier.sql", "0005_comptabilite.sql"];
for (let passe = 0; passe < 2; passe++) {
  for (const f of FICHIERS) await db.exec(readFileSync(R + f, "utf8")); // la 2e passe vérifie que les scripts sont relançables
  if (passe === 0) await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);
}
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);
console.log("✔ scripts 0001, 0002, 0003 et 0005 exécutés deux fois sans erreur");

// Comptes : le premier devient administrateur grâce au déclencheur
const ids = {};
const creer = async (nom, email) => {
  const r = await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, JSON.stringify({ prenom: nom })]);
  ids[nom] = r.rows[0].id;
};
await creer("amine", "amine@x.ma");
const admin = (await db.query(`select is_admin from public.profiles where id=$1`, [ids.amine])).rows[0];
assert.equal(admin.is_admin, true);
console.log("✔ le premier compte est administrateur");

await creer("abdel", "abdel@x.ma"); // pas de profil auto : 2e compte
const nbProfils = (await db.query(`select count(*)::int n from public.profiles`)).rows[0].n;
assert.equal(nbProfils, 1);
await db.query(`insert into public.profiles (id,email,prenom,nom,type) values ($1,'abdel@x.ma','Abdel','K','equipe')`, [ids.abdel]);
await db.query(`insert into public.permissions (user_id,module,can_view,can_edit) values ($1,'logements',true,true),($1,'parametres',true,true)`, [ids.abdel]);
await creer("proprio", "p@x.ma");
await db.query(`insert into public.profiles (id,email,prenom,nom,type) values ($1,'p@x.ma','Pro','P','proprietaire')`, [ids.proprio]);
await creer("equipe2", "e2@x.ma");
await db.query(`insert into public.profiles (id,email,prenom,nom,type) values ($1,'e2@x.ma','E','2','equipe')`, [ids.equipe2]);

const comme = async (qui, sql, params = []) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${ids[qui]}', false);`);
  try { return await db.query(sql, params); }
  finally { await db.exec(`reset role;`); }
};
const echoue = async (qui, sql, params, motif) => {
  let err = null;
  try { await comme(qui, sql, params); } catch (e) { err = e; }
  assert.ok(err, `devrait échouer : ${motif}`);
};

// Abdelkarim crée un logement avec ses tarifs
const lg = (await comme("abdel", `insert into public.logements (nom, ville, frais_menage, taux_commission) values ('Villa Test','Marrakech',300,15) returning id`)).rows[0].id;
console.log("✔ Abdelkarim peut créer un logement");

// Un propriétaire sans droit Logements ne voit rien
assert.equal((await comme("proprio", `select * from public.logements`)).rows.length, 0);
assert.equal((await comme("equipe2", `select * from public.logements`)).rows.length, 0);
console.log("✔ propriétaire et membre sans droit ne voient aucun logement");

// Taux invalide refusé
await echoue("abdel", `insert into public.logements (nom, taux_commission) values ('X', 120)`, [], "taux > 100");
console.log("✔ taux de commission > 100 % refusé");

// Rattachement : seulement un compte propriétaire
await comme("abdel", `insert into public.logement_proprietaires values ($1,$2)`, [lg, ids.proprio]);
await echoue("abdel", `insert into public.logement_proprietaires values ($1,$2)`, [lg, ids.equipe2], "compte non propriétaire");
console.log("✔ seul un compte Propriétaire peut être rattaché");

// Abdelkarim voit la liste des propriétaires (pour les rattacher) mais pas les autres comptes via cette règle
const vus = (await comme("abdel", `select type from public.profiles`)).rows.map(r => r.type);
assert.ok(vus.includes("proprietaire"));
console.log("✔ liste des propriétaires accessible pour le rattachement");

// Documents
await comme("abdel", `insert into public.documents (logement_id,type,nom,chemin,televerse_par) values ($1,'etat_des_lieux','EDL','a/b.jpg',$2)`, [lg, ids.abdel]);
await echoue("abdel", `insert into public.documents (logement_id,type,nom,chemin) values ($1,'fiche_police','FP','a/c.pdf')`, [lg], "fiche de police sans droit");
await db.query(`insert into public.documents (logement_id,type,nom,chemin) values ($1,'fiche_police','FP','a/c.pdf')`, [lg]);
const vusDocs = (await comme("abdel", `select type from public.documents`)).rows.map(r => r.type);
assert.deepEqual(vusDocs, ["etat_des_lieux"]);
console.log("✔ fiches de police invisibles et non ajoutables sans droit explicite");

const maj = await comme("abdel", `update public.documents set horodatage = now() - interval '1 day' where type='etat_des_lieux' returning id`);
assert.equal(maj.rows.length, 0); // la règle de sécurité ignore la tentative : rien n'est modifié
// Même avec un accès « serveur » (qui contourne les règles), le déclencheur interdit la modification
let trig = null; try { await db.query(`update public.documents set horodatage = now() - interval '1 day'`); } catch (e) { trig = e; }
assert.ok(trig && /ne peut pas être modifié/.test(trig.message));
const del = await comme("abdel", `delete from public.documents where type='etat_des_lieux' returning id`);
assert.equal(del.rows.length, 0);
console.log("✔ état des lieux : horodatage non modifiable, suppression réservée à l'administrateur");
const delAdmin = await comme("amine", `delete from public.documents where type='etat_des_lieux' returning id`);
assert.equal(delAdmin.rows.length, 1);
console.log("✔ l'administrateur peut le supprimer");

// Droit aux fiches de police
await db.query(`insert into public.permissions values ($1,'documents_sensibles',true,true)`, [ids.abdel]);
await comme("abdel", `insert into public.documents (logement_id,type,nom,chemin) values ($1,'fiche_police','FP2','a/d.pdf')`, [lg]);
console.log("✔ avec le droit explicite, les fiches de police sont accessibles");

// Versements : invisibles pour Abdelkarim
await db.query(`insert into public.versements (logement_id,date_versement,montant_recu,taux_commission) values ($1,'2026-09-01',5000,20)`, [lg]);
assert.equal((await comme("abdel", `select * from public.versements`)).rows.length, 0);
assert.equal((await comme("amine", `select * from public.versements`)).rows.length, 1);
await echoue("abdel", `insert into public.versements (logement_id,date_versement,montant_recu,taux_commission) values ($1,'2026-09-02',100,20)`, [lg], "versement sans droit comptabilité");
console.log("✔ versements invisibles et non saisissables pour Abdelkarim");

// Identifiant d'ancienne app unique (pas de doublon à la relance)
await db.query(`insert into public.logements (nom, ancien_id) values ('Ancien 1','old-1')`);
let dup = null; try { await db.query(`insert into public.logements (nom, ancien_id) values ('Ancien 1 bis','old-1')`); } catch (e) { dup = e; }
assert.ok(dup);
console.log("✔ un même logement de l'ancienne app ne peut pas être importé deux fois");

// Suppression d'un logement : administrateur seulement
assert.equal((await comme("abdel", `delete from public.logements where id=$1 returning id`, [lg])).rows.length, 0);
console.log("✔ Abdelkarim ne peut pas supprimer un logement");

// ---------- Phase 3 : réservations et ménages ----------
await db.query(`insert into public.permissions values ($1,'calendrier',true,true),($1,'menage',true,true)`, [ids.abdel]);
const ical = (await db.query(`insert into public.logement_ical (logement_id, url) values ($1,'https://example.com/a.ics') returning id`, [lg])).rows[0].id;
const resa = (await db.query(`insert into public.reservations (logement_id, ical_id, uid, arrivee, depart) values ($1,$2,'uid-1','2026-10-10','2026-10-14') returning id`, [lg, ical])).rows[0].id;
assert.equal((await comme("abdel", `select * from public.reservations`)).rows.length, 1);
assert.equal((await comme("equipe2", `select * from public.reservations`)).rows.length, 0);
assert.equal((await comme("proprio", `select * from public.reservations`)).rows.length, 0);
console.log("✔ réservations lisibles avec le droit Calendrier seulement");

await echoue("abdel", `insert into public.reservations (logement_id, uid, arrivee, depart) values ($1,'x','2026-11-01','2026-11-03')`, [lg], "écriture directe");
const maj2 = await comme("abdel", `update public.reservations set statut='annulee' returning id`);
assert.equal(maj2.rows.length, 0);
console.log("✔ aucune écriture directe sur les réservations (seule la synchronisation serveur le peut)");

let sens = null; try { await db.query(`insert into public.reservations (logement_id, uid, arrivee, depart) values ($1,'y','2026-11-05','2026-11-05')`, [lg]); } catch (e) { sens = e; }
assert.ok(sens);
let doublon = null; try { await db.query(`insert into public.reservations (logement_id, ical_id, uid, arrivee, depart) values ($1,$2,'uid-1','2026-12-01','2026-12-03')`, [lg, ical]); } catch (e) { doublon = e; }
assert.ok(doublon);
console.log("✔ départ avant arrivée refusé, pas de doublon pour un même événement iCal");

// Tâches : un ménage automatique par réservation, visible via le droit Ménage
await db.query(`insert into public.taches (titre, type, logement_id, reservation_id, responsable_id, echeance, cree_auto) values ('Ménage — Villa Test','menage',$1,$2,$3,'2026-10-14',true)`, [lg, resa, ids.abdel]);
await db.query(`insert into public.taches (titre, type, pole) values ('Relancer le comptable','tache','Comptabilité')`);
const vuesAbdel = (await comme("abdel", `select titre from public.taches`)).rows.map((r) => r.titre);
assert.deepEqual(vuesAbdel, ["Ménage — Villa Test"]);
console.log("✔ avec le droit Ménage, on voit les ménages mais pas les autres tâches");
let deuxMenages = null; try { await db.query(`insert into public.taches (titre, type, logement_id, reservation_id) values ('Doublon','menage',$1,$2)`, [lg, resa]); } catch (e) { deuxMenages = e; }
assert.ok(deuxMenages);
console.log("✔ un seul ménage automatique par réservation");

// Un prestataire ne voit que les tâches qui lui sont attribuées
await db.query(`insert into public.profiles (id,email,prenom,nom,type) values ($1,'pr@x.ma','Pre','S','prestataire')`, [ (await db.query(`insert into auth.users (email) values ('pr@x.ma') returning id`)).rows[0].id ]);
const prest = (await db.query(`select id from public.profiles where email='pr@x.ma'`)).rows[0].id;
ids.prest = prest;
await db.query(`insert into public.taches (titre, type, responsable_id) values ('Ménage assigné','menage',$1)`, [prest]);
const vuesPrest = (await comme("prest", `select titre from public.taches`)).rows.map((r) => r.titre);
assert.deepEqual(vuesPrest, ["Ménage assigné"]);
const majPrest = await comme("prest", `update public.taches set statut='termine' where titre='Ménage assigné' returning id`);
assert.equal(majPrest.rows.length, 1);
const majAutre = await comme("prest", `update public.taches set statut='termine' where titre='Relancer le comptable' returning id`);
assert.equal(majAutre.rows.length, 0);
console.log("✔ un prestataire ne voit et ne termine que ses propres tâches");

// Réglage « responsable des ménages »
await db.query(`update public.entreprise set responsable_menage=$1 where id=1`, [ids.abdel]);
assert.equal((await comme("abdel", `select responsable_menage from public.entreprise`)).rows[0].responsable_menage, ids.abdel);
console.log("✔ le responsable des ménages par défaut est lisible pour le calendrier");


// ---------- Phase 4 : comptabilité, factures, Espace propriétaire ----------
await creer("proprio2", "p2@x.ma");
await db.query(`insert into public.profiles (id,email,prenom,nom,type) values ($1,'p2@x.ma','Pro','Deux','proprietaire')`, [ids.proprio2]);
const lg2 = (await db.query(`insert into public.logements (nom, ville) values ('Appart Autre','Casablanca') returning id`)).rows[0].id;
await db.query(`insert into public.logement_proprietaires values ($1,$2)`, [lg2, ids.proprio2]);
await db.query(`insert into public.versements (logement_id,date_versement,montant_recu,frais_menage,taux_commission) values ($1,'2026-09-05',3000,200,18)`, [lg2]);
await db.query(
  `insert into public.depenses (date_depense, logement_id, categorie, description, montant) values
   ('2026-09-10',$1,'maintenance','Plomberie',450), ('2026-09-11',$1,'marketing','Publicité',1000), ('2026-09-12',$2,'maintenance','Serrure',300)`,
  [lg, lg2],
);

// Dépenses : comptabilité seulement
assert.equal((await comme("abdel", `select * from public.depenses`)).rows.length, 0);
assert.equal((await comme("amine", `select * from public.depenses`)).rows.length, 3);
await echoue("abdel", `insert into public.depenses (date_depense, categorie, montant) values ('2026-09-20','linge',100)`, [], "dépense sans droit comptabilité");
let negatif = null; try { await db.query(`insert into public.depenses (date_depense, categorie, montant) values ('2026-09-20','linge',-5)`); } catch (e) { negatif = e; }
assert.ok(negatif);
let categorieInconnue = null; try { await db.query(`insert into public.depenses (date_depense, categorie, montant) values ('2026-09-20','vacances',50)`); } catch (e) { categorieInconnue = e; }
assert.ok(categorieInconnue);
console.log("✔ dépenses : comptabilité seulement, montant positif, catégories contrôlées");

// Espace propriétaire : chacun ne voit QUE ses logements, via des vues limitées
const vue = async (qui, nom) => (await comme(qui, `select * from public.${nom}`)).rows;
const l1 = await vue("proprio", "proprietaire_logements");
assert.deepEqual(l1.map((r) => r.nom), ["Villa Test"]);
assert.ok(!("code_acces" in l1[0]) && !("wifi_mot_de_passe" in l1[0]) && !("notes" in l1[0]) && !("taux_commission" in l1[0]));
assert.deepEqual((await vue("proprio2", "proprietaire_logements")).map((r) => r.nom), ["Appart Autre"]);
assert.equal((await vue("equipe2", "proprietaire_logements")).length, 0);
assert.equal((await vue("proprio", "proprietaire_versements")).length, 1);
assert.equal(Number((await vue("proprio2", "proprietaire_versements"))[0].montant_recu), 3000);
const maint = await vue("proprio", "proprietaire_maintenance");
assert.deepEqual(maint.map((r) => r.description), ["Plomberie"]); // ni la publicité, ni le logement voisin
assert.equal((await vue("proprio", "proprietaire_reservations")).length, 1);
assert.equal((await vue("proprio2", "proprietaire_reservations")).length, 0);
console.log("✔ chaque propriétaire ne voit que ses logements, ses versements, sa maintenance et son calendrier");

for (const t of ["logements", "versements", "depenses", "reservations", "documents"]) {
  assert.equal((await comme("proprio", `select * from public.${t}`)).rows.length, 0, `le propriétaire ne doit pas lire ${t}`);
}
console.log("✔ un propriétaire ne peut lire aucune table interne directement");

await db.exec(`set role anon;`);
let anonErr = null; try { await db.query(`select * from public.proprietaire_logements`); } catch (e) { anonErr = e; }
await db.exec(`reset role;`);
assert.ok(anonErr);
console.log("✔ un visiteur non connecté ne voit rien des vues propriétaire");

// Factures : numérotation continue, sans trou, chronologique
const emettre = (logement, mois, date, ttc = 940) =>
  db.query(
    `select * from public.emettre_facture($1,$2,$3,'{"nom":"M. Alami"}','{"raison_sociale":"Perfect Stay"}','[]',$4,20,$5,$6,$7)`,
    [logement, mois, date, Math.round((ttc / 1.2) * 100) / 100, Math.round((ttc - ttc / 1.2) * 100) / 100, ttc, ids.amine],
  );
const f1 = (await emettre(lg, "2026-09-01", "2026-10-01")).rows[0];
const f2 = (await emettre(lg2, "2026-09-01", "2026-10-01")).rows[0];
assert.equal(f1.numero, "PS-2026-0001");
assert.equal(f2.numero, "PS-2026-0002");
let doublonFacture = null; try { await emettre(lg, "2026-09-01", "2026-10-02"); } catch (e) { doublonFacture = e; }
assert.ok(doublonFacture, "une seule facture active par logement et par mois");
const f3 = (await emettre(lg2, "2026-08-01", "2026-10-02")).rows[0];
assert.equal(f3.numero, "PS-2026-0003", "l'échec précédent ne doit pas consommer de numéro");
let antidatee = null; try { await emettre(lg, "2026-07-01", "2026-09-15"); } catch (e) { antidatee = e; }
assert.ok(antidatee, "pas de facture antidatée");
const f4 = (await emettre(lg, "2026-07-01", "2026-10-03")).rows[0];
assert.equal(f4.numero, "PS-2026-0004", "pas de trou dans la numérotation");
const f5 = (await emettre(lg, "2027-01-01", "2027-01-05")).rows[0];
assert.equal(f5.numero, "PS-2027-0001", "la numérotation repart à 1 chaque année");
console.log("✔ factures : PS-AAAA-NNNN continues, sans trou, chronologiques, une seule par logement et par mois");

// Factures figées
let modif = null; try { await db.query(`update public.factures set total_ttc = 1 where id=$1`, [f1.id]); } catch (e) { modif = e; }
assert.ok(modif);
let supp = null; try { await db.query(`delete from public.factures where id=$1`, [f1.id]); } catch (e) { supp = e; }
assert.ok(supp);
await db.query(`update public.factures set chemin_pdf='lg/f1.pdf' where id=$1`, [f1.id]);
await db.query(`update public.factures set statut='annulee' where id=$1`, [f4.id]);
console.log("✔ une facture émise ne se modifie ni ne se supprime (seuls le PDF et l'annulation changent)");

// Personne ne peut émettre une facture depuis l'application des utilisateurs
let emissionDirecte = null;
try {
  await comme("amine", `select public.emettre_facture($1,'2026-06-01','2026-10-04','{}','{}','[]',1,20,0.17,1,null)`, [lg]);
} catch (e) { emissionDirecte = e; }
assert.ok(emissionDirecte);
assert.equal((await comme("amine", `select * from public.facture_sequences`)).rows.length, 0);
console.log("✔ l'émission d'une facture et ses numéros ne sont pas accessibles aux utilisateurs");

// Qui lit les factures et les rapports ?
await db.query(`insert into public.rapports_mensuels (logement_id, mois, resume) values ($1,'2026-09-01','{}'), ($2,'2026-09-01','{}')`, [lg, lg2]);
assert.deepEqual((await comme("proprio", `select numero from public.factures order by numero`)).rows.map((r) => r.numero), ["PS-2026-0001", "PS-2026-0004", "PS-2027-0001"]);
assert.deepEqual((await comme("proprio2", `select numero from public.factures order by numero`)).rows.map((r) => r.numero), ["PS-2026-0002", "PS-2026-0003"]);
assert.equal((await comme("proprio", `select * from public.rapports_mensuels`)).rows.length, 1);
assert.equal((await comme("abdel", `select * from public.factures`)).rows.length, 0);
assert.equal((await comme("amine", `select * from public.factures`)).rows.length, 5);
await db.query(`insert into public.permissions values ($1,'comptabilite',true,false)`, [ids.equipe2]);
assert.equal((await comme("equipe2", `select * from public.factures`)).rows.length, 5);
assert.equal((await comme("equipe2", `select * from public.rapports_mensuels`)).rows.length, 2);
console.log("✔ factures et rapports : propriétaire (les siens), comptabilité (tous), les autres rien");

// Un logement supprimé ne fait pas disparaître sa facture
const lg3 = (await db.query(`insert into public.logements (nom) values ('Éphémère') returning id`)).rows[0].id;
const f6 = (await emettre(lg3, "2027-02-01", "2027-02-02")).rows[0];
await db.query(`delete from public.logements where id=$1`, [lg3]);
const restante = (await db.query(`select numero, logement_id from public.factures where id=$1`, [f6.id])).rows[0];
assert.equal(restante.numero, f6.numero);
assert.equal(restante.logement_id, null);
console.log("✔ supprimer un logement conserve ses factures (obligation de conservation)");

// Vues de la comptabilité : uniquement avec le droit Comptabilité, et sans données sensibles
assert.equal((await comme("abdel", `select * from public.comptabilite_logements`)).rows.length, 0);
assert.equal((await comme("proprio", `select * from public.comptabilite_logements`)).rows.length, 0);
const vuesCompta = (await comme("equipe2", `select * from public.comptabilite_logements`)).rows;
assert.ok(vuesCompta.length >= 2);
assert.ok(!("code_acces" in vuesCompta[0]) && !("wifi_mot_de_passe" in vuesCompta[0]) && !("notes" in vuesCompta[0]));
assert.ok((await comme("equipe2", `select * from public.comptabilite_reservations`)).rows.length >= 1);
assert.equal((await comme("abdel", `select * from public.comptabilite_reservations`)).rows.length, 0);
console.log("✔ le comptable voit les logements utiles à la saisie, sans codes d'accès ni notes ; les autres rien");

console.log("\nTOUS LES CONTRÔLES SQL SONT OK");
