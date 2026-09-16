import type { CollectionConfig } from 'payload'
import { canWrite, canDelete, isAuthenticated, isHidden, withFieldPermissions } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidateCache'
import { annulerMatchSupprime, chargerContexte, synchroniserMatch } from '@/hub/matchs/synchro'
import type { MatchLffs } from '@/hub/matchs/construction'

export const Matches: CollectionConfig = {
  slug: 'matches',
  labels: { singular: 'Match', plural: 'Matchs' },
  hooks: {
    afterChange: [
      revalidateAfterChange(['matches', 'players']),
      /**
       * Le calendrier du Hub suit chaque match : creation, deplacement, score.
       * Dans la transaction du match, pour que l'evenement puisse pointer vers
       * lui. Un echec est consigne sans faire echouer l'import LFFS, la
       * reconciliation quotidienne du Hub rattrape ce qui a ete manque.
       */
      async ({ doc, req }) => {
        try {
          const contexte = await chargerContexte(req.payload, req)
          await synchroniserMatch(req.payload, doc as MatchLffs, contexte, req)
        } catch (erreur) {
          req.payload.logger.error({ err: erreur, msg: `Hub : synchronisation du match ${doc.lffs_id ?? doc.id} echouee` })
        }
        return doc
      },
    ],
    afterDelete: [
      revalidateAfterDelete(['matches', 'players']),
      /** Un match supprime ici est annule dans le Hub, jamais efface. */
      async ({ doc, req }) => {
        try {
          if (typeof doc.lffs_id === 'number') await annulerMatchSupprime(req.payload, doc.lffs_id, req)
        } catch (erreur) {
          req.payload.logger.error({ err: erreur, msg: `Hub : annulation du match ${doc.lffs_id ?? doc.id} echouee` })
        }
        return doc
      },
    ],
  },
  admin: {
    useAsTitle: 'home_team',
    defaultColumns: ['home_team', 'away_team', 'score_home', 'score_away', 'date', 'serie_reference'],
    hidden: isHidden('matches'),
  },
  access: {
    read: isAuthenticated,
    create: canWrite('matches'),
    update: canWrite('matches'),
    delete: canDelete('matches'),
  },
  fields: withFieldPermissions('matches', [
    {
      name: 'lffs_id',
      type: 'number',
      unique: true,
      index: true,
      label: 'Identifiant LFFS',
      admin: {
        readOnly: true,
        description:
          "Identifiant du match chez la LFFS. C'est lui qui permet de retrouver le match d'un import a l'autre, meme si les equipes ou la date changent.",
      },
    },
    {
      name: 'home_team',
      type: 'text',
      required: true,
      label: 'Equipe domicile',
    },
    {
      name: 'away_team',
      type: 'text',
      required: true,
      label: 'Equipe exterieur',
    },
    {
      name: 'score_home',
      type: 'number',
      label: 'Score domicile',
    },
    {
      name: 'score_away',
      type: 'number',
      label: 'Score exterieur',
    },
    {
      name: 'date',
      type: 'date',
      label: 'Date',
    },
    {
      name: 'time',
      type: 'text',
      label: 'Heure (HH:MM:SS)',
    },
    {
      name: 'venue_id',
      type: 'number',
      label: 'ID Salle',
    },
    {
      name: 'venue_name',
      type: 'text',
      label: 'Nom Salle',
    },
    {
      name: 'live_link',
      type: 'text',
      label: 'Lien Live',
    },
    {
      name: 'replay_link',
      type: 'text',
      label: 'Lien Replay',
    },
    {
      name: 'serie_reference',
      type: 'text',
      label: 'Competition',
    },
    {
      name: 'season',
      type: 'relationship',
      relationTo: 'seasons',
      label: 'Saison',
    },
    {
      name: 'essai',
      type: 'checkbox',
      defaultValue: false,
      label: "Match d'essai",
      admin: {
        position: 'sidebar',
        description:
          "Sert a eprouver le direct sans rencontre, depuis /api/salle-essai en developpement. Jamais affiche sur le site ni dans les API publiques ; ses traces d'audience et son rapport restent a part des vrais. Un seul suffit, le site le cree lui-meme.",
      },
    },
    {
      name: 'field_players_stats',
      type: 'array',
      label: 'Stats joueurs de champ',
      fields: [
        {
          name: 'joueur',
          type: 'relationship',
          relationTo: 'players',
          required: true,
          label: 'Joueur',
          filterOptions: {
            poste: { equals: 'Joueur' },
          },
        },
        {
          name: 'goals',
          type: 'number',
          defaultValue: 0,
          label: 'Buts',
        },
        {
          name: 'assists',
          type: 'number',
          defaultValue: 0,
          label: 'Assists',
        },
        {
          name: 'yellow_cards',
          type: 'number',
          defaultValue: 0,
          label: 'Cartons jaunes',
        },
        {
          name: 'red_cards',
          type: 'number',
          defaultValue: 0,
          label: 'Cartons rouges',
        },
      ],
    },
    {
      name: 'goalkeeper_stats',
      type: 'array',
      label: 'Stats gardiens',
      fields: [
        {
          name: 'joueur',
          type: 'relationship',
          relationTo: 'players',
          required: true,
          label: 'Gardien',
          filterOptions: {
            poste: { equals: 'Gardien' },
          },
        },
        {
          name: 'goals',
          type: 'number',
          defaultValue: 0,
          label: 'Buts',
        },
        {
          name: 'assists',
          type: 'number',
          defaultValue: 0,
          label: 'Assists',
        },
        {
          name: 'clean_sheet',
          type: 'checkbox',
          defaultValue: false,
          label: 'Clean sheet',
        },
        {
          name: 'yellow_cards',
          type: 'number',
          defaultValue: 0,
          label: 'Cartons jaunes',
        },
        {
          name: 'red_cards',
          type: 'number',
          defaultValue: 0,
          label: 'Cartons rouges',
        },
      ],
    },
  ]),
}
