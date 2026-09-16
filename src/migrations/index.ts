import * as migration_20260915_214144_initial from './20260915_214144_initial';
import * as migration_20260915_215244_hub from './20260915_215244_hub';
import * as migration_20260916_092458_events_primary_feed from './20260916_092458_events_primary_feed';
import * as migration_20260916_141930_formats_multiples from './20260916_141930_formats_multiples';
import * as migration_20260916_144023_ideas_formats_multiples from './20260916_144023_ideas_formats_multiples';
import * as migration_20260916_154312_visuels_hub from './20260916_154312_visuels_hub';
import * as migration_20260916_154335_visuels_hub_ancien_lien from './20260916_154335_visuels_hub_ancien_lien';
import * as migration_20260916_154751_dossiers_medias from './20260916_154751_dossiers_medias';
import * as migration_20260916_171602_joueurs_second_numero from './20260916_171602_joueurs_second_numero';
import * as migration_20260916_173118_numeros_feuille_de_match from './20260916_173118_numeros_feuille_de_match';
import * as migration_20260916_232426_numero_unique from './20260916_232426_numero_unique';

export const migrations = [
  {
    up: migration_20260915_214144_initial.up,
    down: migration_20260915_214144_initial.down,
    name: '20260915_214144_initial',
  },
  {
    up: migration_20260915_215244_hub.up,
    down: migration_20260915_215244_hub.down,
    name: '20260915_215244_hub',
  },
  {
    up: migration_20260916_092458_events_primary_feed.up,
    down: migration_20260916_092458_events_primary_feed.down,
    name: '20260916_092458_events_primary_feed',
  },
  {
    up: migration_20260916_141930_formats_multiples.up,
    down: migration_20260916_141930_formats_multiples.down,
    name: '20260916_141930_formats_multiples',
  },
  {
    up: migration_20260916_144023_ideas_formats_multiples.up,
    down: migration_20260916_144023_ideas_formats_multiples.down,
    name: '20260916_144023_ideas_formats_multiples',
  },
  {
    up: migration_20260916_154312_visuels_hub.up,
    down: migration_20260916_154312_visuels_hub.down,
    name: '20260916_154312_visuels_hub',
  },
  {
    up: migration_20260916_154335_visuels_hub_ancien_lien.up,
    down: migration_20260916_154335_visuels_hub_ancien_lien.down,
    name: '20260916_154335_visuels_hub_ancien_lien',
  },
  {
    up: migration_20260916_154751_dossiers_medias.up,
    down: migration_20260916_154751_dossiers_medias.down,
    name: '20260916_154751_dossiers_medias',
  },
  {
    up: migration_20260916_171602_joueurs_second_numero.up,
    down: migration_20260916_171602_joueurs_second_numero.down,
    name: '20260916_171602_joueurs_second_numero',
  },
  {
    up: migration_20260916_173118_numeros_feuille_de_match.up,
    down: migration_20260916_173118_numeros_feuille_de_match.down,
    name: '20260916_173118_numeros_feuille_de_match',
  },
  {
    up: migration_20260916_232426_numero_unique.up,
    down: migration_20260916_232426_numero_unique.down,
    name: '20260916_232426_numero_unique'
  },
];
