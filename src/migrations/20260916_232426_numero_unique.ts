import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Un seul numero par joueur, celui de la collection Joueurs que le site
 * affiche deja : les deux colonnes de feuille de match, nees quelques heures
 * plus tot, disparaissent.
 *
 * Les seize numeros deja saisis dans le Hub sont recopies dans `numero`
 * avant la suppression : c'est le plan de numerotation le plus recent, et
 * six joueurs n'avaient encore que le 99 de remplissage. Le `down` remet les
 * colonnes, y replace ces valeurs et rend a `numero` ce qu'il portait
 * avant, joueur par joueur.
 */

/** Ce que `numero` valait avant la migration, pour les seuls joueurs modifies. Vide = aucun numero. */
const AVANT: ReadonlyArray<{ nom: string; prenom: string; feuille: number; numero: number | null }> = [
  { nom: 'Kante', prenom: 'Amad', feuille: 1, numero: 13 },
  { nom: 'Marias', prenom: 'Valadi', feuille: 1, numero: 1 },
  { nom: 'HERVERA REY', prenom: 'Jordy', feuille: 2, numero: 16 },
  { nom: 'Zimmermann', prenom: 'Esteban', feuille: 3, numero: 3 },
  { nom: 'LOPEZ MENDEZ', prenom: 'Jonathan', feuille: 4, numero: 17 },
  { nom: 'Fernandez', prenom: 'Jordi', feuille: 5, numero: 5 },
  { nom: 'Richard', prenom: 'Dorian', feuille: 6, numero: 9 },
  { nom: 'Parent', prenom: 'Théo', feuille: 7, numero: 12 },
  { nom: 'Parent', prenom: 'Lucas', feuille: 8, numero: 99 },
  { nom: 'FOZIN TEMBOU', prenom: 'James', feuille: 9, numero: 99 },
  { nom: 'Menendez', prenom: 'Enrique', feuille: 10, numero: 10 },
  { nom: 'Bakajika', prenom: 'Joseph', feuille: 11, numero: 99 },
  { nom: 'DE OLIVEIRA PEREIRA', prenom: 'Vasco', feuille: 12, numero: 99 },
  { nom: 'Villaverde', prenom: 'Ruben', feuille: 13, numero: 99 },
  { nom: 'Cirino', prenom: 'Diego', feuille: 14, numero: 99 },
  { nom: 'Schutters', prenom: 'Bryan', feuille: 21, numero: 21 },
]

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "players" SET "numero" = "numero_feuille_1" WHERE "numero_feuille_1" IS NOT NULL;
  ALTER TABLE "users" DROP COLUMN "permissions_players_fields_numero_feuille_1";
  ALTER TABLE "users" DROP COLUMN "permissions_players_fields_numero_feuille_2";
  ALTER TABLE "players" DROP COLUMN "numero_feuille_1";
  ALTER TABLE "players" DROP COLUMN "numero_feuille_2";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "permissions_players_fields_numero_feuille_1" boolean DEFAULT true;
  ALTER TABLE "users" ADD COLUMN "permissions_players_fields_numero_feuille_2" boolean DEFAULT true;
  ALTER TABLE "players" ADD COLUMN "numero_feuille_1" numeric;
  ALTER TABLE "players" ADD COLUMN "numero_feuille_2" numeric;`)

  for (const ligne of AVANT) {
    await db.execute(sql`
      UPDATE "players"
      SET "numero_feuille_1" = ${ligne.feuille}, "numero" = ${ligne.numero}
      WHERE "nom" = ${ligne.nom} AND "prenom" = ${ligne.prenom};`)
  }
}
