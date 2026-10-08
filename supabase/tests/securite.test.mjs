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
  grant usage on schema auth to authenticated;
`);
const FICHIERS = ["0001_fondations.sql", "0002_logements.sql", "0003_calendrier.sql", "0005_comptabilite.sql", "0007_operations.sql", "0008_taches.sql"];
for (let passe = 0; passe < 2; passe++) {
  for (const f of FICHIERS) await db.exec(readFileSync(R + f, "utf8")); // la 2e passe vérifie que les scripts sont relançables
  if (passe === 0) await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);
}
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);
console.log("✔ scripts 0001, 0002, 0003, 0005, 0007 et 0008 exécutés deux fois sans erreur");

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
assert.deepEqual(maint, []); // la maintenance vient des frais d'incidents (testés plus bas), jamais des dépenses internes
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

// ============================ Phase 5 : opérations ============================
await creer("presta", "presta@x.ma");
await db.query(`insert into public.profiles (id,email,prenom,nom,type) values ($1,'presta@x.ma','Pres','Ta','prestataire')`, [ids.presta]);
await db.query(`insert into public.permissions values ($1,'menage',true,true),($1,'checklists',true,true),($1,'taches',true,true)`, [ids.presta]);
await creer("chef", "chef@x.ma");
await db.query(`insert into public.profiles (id,email,prenom,nom,type) values ($1,'chef@x.ma','Chef','C','equipe')`, [ids.chef]);
await db.query(
  `insert into public.permissions values ($1,'menage',true,true),($1,'maintenance',true,true),($1,'stock',true,true),($1,'checklists',true,true),($1,'onboarding',true,true)`,
  [ids.chef],
);

// Ménages : le prestataire ne voit que les siens, même avec les droits « Ménage » et « Tâches »
const t1 = (await db.query(`insert into public.taches (titre,type,logement_id,responsable_id,echeance) values ('Ménage A','menage',$1,$2,'2026-10-10') returning id`, [lg, ids.presta])).rows[0].id;
const t2 = (await db.query(`insert into public.taches (titre,type,logement_id,echeance) values ('Ménage B','menage',$1,'2026-10-11') returning id`, [lg2])).rows[0].id;
assert.deepEqual((await comme("presta", `select titre from public.taches`)).rows.map((r) => r.titre), ["Ménage A"]);
assert.equal((await comme("chef", `select * from public.taches where titre in ('Ménage A','Ménage B')`)).rows.length, 2);
assert.equal((await comme("equipe2", `select * from public.taches where titre in ('Ménage A','Ménage B')`)).rows.length, 0);
console.log("✔ un prestataire ne voit que les ménages qui lui sont attribués");

// Le prestataire avance sa tâche, rien d'autre
await comme("presta", `update public.taches set statut='en_cours' where id=$1`, [t1]);
await echoue("presta", `update public.taches set echeance='2026-12-01' where id=$1`, [t1], "changer l'échéance");
await echoue("presta", `update public.taches set responsable_id=null where id=$1`, [t1], "se retirer la tâche");
await echoue("presta", `update public.taches set controle='valide' where id=$1`, [t1], "se valider lui-même");
await echoue("presta", `update public.taches set statut='annule' where id=$1`, [t1], "annuler");
assert.equal((await comme("presta", `update public.taches set statut='termine' where id=$1 returning controle, termine_le`, [t1])).rows[0].controle, "en_attente");
const autre = await comme("presta", `update public.taches set statut='termine' where id=$1 returning id`, [t2]);
assert.equal(autre.rows.length, 0);
console.log("✔ le prestataire change l'avancement de sa tâche (jamais le reste) ; terminé = à contrôler");

// Le contrôle qualité appartient à l'équipe
await comme("chef", `update public.taches set controle='valide', controle_par=$2, controle_le=now() where id=$1`, [t1, ids.chef]);
assert.equal((await comme("chef", `select controle from public.taches where id=$1`, [t1])).rows[0].controle, "valide");
await comme("chef", `update public.taches set statut='a_faire', controle='a_refaire', controle_note='Salle de bain' where id=$1`, [t1]);
assert.equal((await comme("presta", `select controle from public.taches where id=$1`, [t1])).rows[0].controle, "a_refaire");
console.log("✔ Abdelkarim valide ou renvoie un ménage à refaire");

// Check-lists
const modeles = (await comme("chef", `select id, nom from public.checklist_modeles order by nom`)).rows;
assert.equal(modeles.length, 3);
assert.equal((await comme("presta", `select * from public.checklist_modeles`)).rows.length, 0);
const cl = (await comme("chef", `insert into public.checklists (nom, logement_id, tache_id) values ('Ménage A',$1,$2) returning id`, [lg, t1])).rows[0].id;
const pt = (await comme("chef", `insert into public.checklist_points (checklist_id, ordre, libelle) values ($1,1,'Lits'),($1,2,'Sols') returning id`, [cl])).rows;
const cl2 = (await comme("chef", `insert into public.checklists (nom, logement_id, tache_id) values ('Ménage B',$1,$2) returning id`, [lg2, t2])).rows[0].id;
await comme("chef", `insert into public.checklist_points (checklist_id, ordre, libelle) values ($1,1,'Lits')`, [cl2]);
assert.equal((await comme("presta", `select * from public.checklists`)).rows.length, 1);
assert.equal((await comme("presta", `select * from public.checklist_points`)).rows.length, 2);
const coche = (await comme("presta", `update public.checklist_points set fait=true where id=$1 returning fait_le, fait_par`, [pt[0].id])).rows[0];
assert.ok(coche.fait_le);
assert.equal(coche.fait_par, ids.presta);
await echoue("presta", `update public.checklist_points set libelle='Rien' where id=$1`, [pt[0].id], "changer le libellé");
await echoue("presta", `insert into public.checklists (nom, logement_id, tache_id) values ('X',$1,$2)`, [lg2, t2], "créer une check-list sur la tâche d'un autre");
await comme("presta", `insert into public.checklist_photos (checklist_id, point_id, chemin, chemin_vignette) values ($1,$2,'a.jpg','b.jpg')`, [cl, pt[0].id]);
await echoue("presta", `insert into public.checklist_photos (checklist_id, chemin, chemin_vignette) values ($1,'a.jpg','b.jpg')`, [cl2], "photo sur la check-list d'un autre");
assert.equal((await comme("presta", `update public.checklist_photos set pris_le = now() - interval '1 day' returning id`)).rows.length, 0); // antidater : aucune ligne modifiable
console.log("✔ check-lists : copies des modèles, cochage horodaté par la base, photos, cloisonnement des prestataires");

// Logements vus par les opérations
const opsPresta = (await comme("presta", `select id, code_acces from public.operations_logements`)).rows;
assert.equal(opsPresta.length, 1);
assert.equal(opsPresta[0].id, lg);
assert.equal((await comme("equipe2", `select * from public.operations_logements`)).rows.length, 0);
const opsChef = (await comme("chef", `select id, code_acces from public.operations_logements`)).rows;
assert.ok(opsChef.length >= 2);
assert.ok(opsChef.every((l) => l.code_acces === null));
console.log("✔ les opérations voient les logements utiles ; le code d'accès seulement pour le prestataire concerné ou avec le droit Logements");

// Maintenance : frais avancés, visibles du propriétaire concerné seulement
const inc = (await comme("chef", `insert into public.incidents (logement_id, titre, type) values ($1,'Chauffe-eau HS','panne') returning id`, [lg])).rows[0].id;
await comme("chef", `insert into public.incident_frais (incident_id, description, montant) values ($1,'Pièce',450),($1,'Main d''œuvre',300)`, [inc]);
assert.equal((await comme("chef", `select count(*)::int n from public.incident_frais`)).rows[0].n, 2);
assert.equal((await comme("proprio", `select sum(montant)::numeric s from public.proprietaire_maintenance`)).rows[0].s, "750.00");
assert.equal((await comme("proprio2", `select * from public.proprietaire_maintenance`)).rows.length, 0);
assert.equal((await comme("proprio", `select * from public.incidents`)).rows.length, 0);
assert.equal((await comme("presta", `select * from public.incidents`)).rows.length, 0);
assert.equal((await comme("equipe2", `select * from public.incident_frais`)).rows.length, 0);
await comme("chef", `update public.incidents set remboursement='sans_objet' where id=$1`, [inc]);
assert.equal((await comme("proprio", `select * from public.proprietaire_maintenance`)).rows.length, 0);
await comme("chef", `update public.incidents set remboursement='a_rembourser' where id=$1`, [inc]);
await echoue("chef", `insert into public.incident_frais (incident_id, montant) values ($1,0)`, [inc], "frais à zéro");
console.log("✔ maintenance : frais avancés visibles du propriétaire concerné uniquement");

// Stock : historique non modifiable, niveaux calculés
const art = (await comme("chef", `select id, nom from public.stock_articles order by nom`)).rows;
assert.equal(art.length, 7);
const draps = art.find((a) => a.nom === "Draps").id;
await comme("chef", `insert into public.stock_mouvements (article_id, logement_id, type, quantite) values ($1,null,'entree',20)`, [draps]);
await comme("chef", `insert into public.stock_mouvements (article_id, logement_id, type, quantite) values ($1,null,'transfert',-6),($1,$2,'transfert',6)`, [draps, lg]);
const niveaux = (await comme("chef", `select logement_id, quantite from public.stock_niveaux where article_id=$1 order by quantite`, [draps])).rows;
assert.deepEqual(niveaux.map((n) => n.quantite), [6, 14]);
assert.equal((await comme("chef", `update public.stock_mouvements set quantite=99 returning id`)).rows.length, 0); // historique non modifiable
assert.equal((await comme("chef", `delete from public.stock_mouvements returning id`)).rows.length, 0); // historique non effaçable
assert.equal((await db.query(`select count(*)::int n from public.stock_mouvements`)).rows[0].n, 3);
assert.equal((await comme("equipe2", `select * from public.stock_niveaux`)).rows.length, 0);
assert.equal((await comme("equipe2", `select * from public.stock_articles`)).rows.length, 0);
console.log("✔ stock : historique infalsifiable, niveaux calculés, droit Stock requis");

// Onboarding
await comme("chef", `insert into public.onboarding_etapes (logement_id, cle) values ($1,'visite')`, [lg]);
const et = (await comme("chef", `update public.onboarding_etapes set fait=true where logement_id=$1 and cle='visite' returning fait_le, fait_par`, [lg])).rows[0];
assert.ok(et.fait_le);
assert.equal(et.fait_par, ids.chef);
await echoue("equipe2", `insert into public.onboarding_etapes (logement_id, cle) values ($1,'photos')`, [lg], "onboarding sans le droit");
await echoue("chef", `insert into public.onboarding_etapes (logement_id, cle) values ($1,'inconnue')`, [lg], "étape inconnue");
console.log("✔ onboarding : étapes horodatées, droit Onboarding requis");

// ============================ Phase 6 : tâches ============================
await creer("collab", "collab@x.ma");
await db.query(`insert into public.profiles (id,email,prenom,nom,type) values ($1,'collab@x.ma','Col','Lab','equipe')`, [ids.collab]);
await db.query(`insert into public.permissions values ($1,'taches',true,true)`, [ids.collab]);
const tp = (await comme("collab", `insert into public.taches (titre, pole, echeance) values ('Relancer le syndic','Opérations','2026-10-12') returning id`)).rows[0].id;
await comme("collab", `insert into public.tache_sous_taches (tache_id, libelle) values ($1,'Appeler'),($1,'Écrire')`, [tp]);
const sous = (await comme("collab", `select id from public.tache_sous_taches where tache_id=$1 order by libelle`, [tp])).rows;
assert.equal(sous.length, 2);
const coche2 = (await comme("collab", `update public.tache_sous_taches set fait=true where id=$1 returning fait_le`, [sous[0].id])).rows[0];
assert.ok(coche2.fait_le);
// Sans le droit Tâches : rien (ni la tâche, ni ses sous-tâches, ni les récurrences)
assert.equal((await comme("equipe2", `select * from public.tache_sous_taches`)).rows.length, 0);
assert.equal((await comme("equipe2", `select * from public.tache_recurrences`)).rows.length, 0);
await echoue("equipe2", `insert into public.tache_sous_taches (tache_id, libelle) values ($1,'X')`, [tp], "sous-tâche sans droit");
// Le prestataire n'accède qu'aux éléments des tâches qui lui sont attribuées
assert.equal((await comme("presta", `select * from public.tache_sous_taches where tache_id=$1`, [tp])).rows.length, 0);
await db.query(`insert into public.tache_sous_taches (tache_id, libelle) values ($1,'Détail ménage')`, [t1]);
assert.equal((await comme("presta", `select * from public.tache_sous_taches`)).rows.length, 1);
assert.equal((await comme("presta", `select * from public.tache_recurrences`)).rows.length, 0);
// La récurrence demandée d'office existe, et une règle ne crée jamais deux fois la même date
const rec = (await comme("collab", `select id, titre, frequence from public.tache_recurrences`)).rows;
assert.equal(rec.length, 1);
assert.equal(rec[0].titre, "Comptabilité du mois");
assert.equal(rec[0].frequence, "dernier_jour_mois");
await db.query(`insert into public.taches (titre, echeance, recurrence_id) values ('Comptabilité du mois','2026-10-31',$1)`, [rec[0].id]);
let doublonRec = null; try { await db.query(`insert into public.taches (titre, echeance, recurrence_id) values ('Comptabilité du mois','2026-10-31',$1)`, [rec[0].id]); } catch (e) { doublonRec = e; }
assert.ok(doublonRec);
console.log("✔ tâches : sous-tâches horodatées, droits Tâches, prestataire cloisonné, récurrence sans doublon");

console.log("\nTOUS LES CONTRÔLES SQL SONT OK");
