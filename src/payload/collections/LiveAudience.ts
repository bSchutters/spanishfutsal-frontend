import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

/**
 * Les spectateurs du direct, un enregistrement par personne et par rencontre.
 *
 * Le compteur venait du diffuseur, qui compte les gens sur SA page. Depuis que
 * le match se regarde ici, ce nombre ne veut plus rien dire : il tombe vers zero
 * pendant que la tribune est chez nous. On compte donc nous-memes.
 *
 * Rien de personnel n'est conserve. L'identifiant du visiteur est tire au hasard
 * par son navigateur, vit le temps de l'onglet et n'est relie a aucun compte, a
 * aucune adresse IP et a aucun cookie : deux visites de la meme personne sont
 * deux inconnus. C'est tout ce qu'il faut pour compter une audience, et cela
 * evite d'avoir a demander un consentement pour la regarder.
 *
 * L'ecriture ne passe jamais par l'API publique : la route du battement utilise
 * l'API locale, qui ne repond qu'au serveur. Les droits ci-dessous ferment donc
 * la collection a tout le monde.
 */
export const LiveAudience: CollectionConfig = {
  slug: 'live-audience',
  labels: { singular: 'Spectateur', plural: 'Audience des directs' },
  admin: {
    useAsTitle: 'visiteur',
    defaultColumns: ['match', 'debut', 'fin', 'battements'],
    hidden: ({ user }) => user?.role !== 'admin',
    description:
      "Les traces brutes du comptage, conservees pour recalculer un rapport. Rien ne se saisit ici a la main.",
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'match',
      type: 'relationship',
      relationTo: 'matches',
      required: true,
      index: true,
      label: 'Rencontre',
    },
    {
      // Tire au hasard par le navigateur, sans lien avec une personne.
      name: 'visiteur',
      type: 'text',
      required: true,
      index: true,
      label: 'Visiteur',
    },
    {
      name: 'debut',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      label: 'Arrive a',
    },
    {
      // Le dernier battement recu. C'est ce champ qui dit qui est encore la :
      // un spectateur present est un spectateur dont la derniere trace est
      // fraiche, car un onglet ferme ne previent pas toujours.
      name: 'fin',
      type: 'date',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      label: 'Dernier signe a',
    },
    {
      name: 'battements',
      type: 'number',
      defaultValue: 1,
      label: 'Battements recus',
    },
    {
      // Le seul renseignement d'appareil retenu, et le plus grossier qui soit :
      // assez pour savoir si on developpe d'abord pour le telephone, trop peu
      // pour reconnaitre quelqu'un.
      name: 'mobile',
      type: 'checkbox',
      defaultValue: false,
      label: 'Sur telephone',
    },
  ],
}
