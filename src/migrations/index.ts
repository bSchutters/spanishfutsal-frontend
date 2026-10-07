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
import * as migration_20260917_130723_postes_staff from './20260917_130723_postes_staff';
import * as migration_20260917_131029_poste_adjoint from './20260917_131029_poste_adjoint';
import * as migration_20260917_161038_module_direct from './20260917_161038_module_direct';
import * as migration_20260917_173247_sans_discord from './20260917_173247_sans_discord';
import * as migration_20261003_111747_module_pack from './20261003_111747_module_pack';
import * as migration_20261003_161720_pack_reference_modele from './20261003_161720_pack_reference_modele';
import * as migration_20261003_163143_pack_remise from './20261003_163143_pack_remise';
import * as migration_20261003_164148_pack_photos from './20261003_164148_pack_photos';
import * as migration_20261004_111729_pack_apercu_flocage from './20261004_111729_pack_apercu_flocage';
import * as migration_20261006_144326_pack_logo_variante from './20261006_144326_pack_logo_variante';
import * as migration_20261006_181503_pack_nom_joma from './20261006_181503_pack_nom_joma';
import * as migration_20261006_223637_pack_tags from './20261006_223637_pack_tags';
import * as migration_20261006_230941_super_admin from './20261006_230941_super_admin';
import * as migration_20261007_091431_pack_commandes_joma from './20261007_091431_pack_commandes_joma';

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
    name: '20260916_232426_numero_unique',
  },
  {
    up: migration_20260917_130723_postes_staff.up,
    down: migration_20260917_130723_postes_staff.down,
    name: '20260917_130723_postes_staff',
  },
  {
    up: migration_20260917_131029_poste_adjoint.up,
    down: migration_20260917_131029_poste_adjoint.down,
    name: '20260917_131029_poste_adjoint',
  },
  {
    up: migration_20260917_161038_module_direct.up,
    down: migration_20260917_161038_module_direct.down,
    name: '20260917_161038_module_direct',
  },
  {
    up: migration_20260917_173247_sans_discord.up,
    down: migration_20260917_173247_sans_discord.down,
    name: '20260917_173247_sans_discord',
  },
  {
    up: migration_20261003_111747_module_pack.up,
    down: migration_20261003_111747_module_pack.down,
    name: '20261003_111747_module_pack',
  },
  {
    up: migration_20261003_161720_pack_reference_modele.up,
    down: migration_20261003_161720_pack_reference_modele.down,
    name: '20261003_161720_pack_reference_modele',
  },
  {
    up: migration_20261003_163143_pack_remise.up,
    down: migration_20261003_163143_pack_remise.down,
    name: '20261003_163143_pack_remise',
  },
  {
    up: migration_20261003_164148_pack_photos.up,
    down: migration_20261003_164148_pack_photos.down,
    name: '20261003_164148_pack_photos',
  },
  {
    up: migration_20261004_111729_pack_apercu_flocage.up,
    down: migration_20261004_111729_pack_apercu_flocage.down,
    name: '20261004_111729_pack_apercu_flocage',
  },
  {
    up: migration_20261006_144326_pack_logo_variante.up,
    down: migration_20261006_144326_pack_logo_variante.down,
    name: '20261006_144326_pack_logo_variante',
  },
  {
    up: migration_20261006_181503_pack_nom_joma.up,
    down: migration_20261006_181503_pack_nom_joma.down,
    name: '20261006_181503_pack_nom_joma',
  },
  {
    up: migration_20261006_223637_pack_tags.up,
    down: migration_20261006_223637_pack_tags.down,
    name: '20261006_223637_pack_tags',
  },
  {
    up: migration_20261006_230941_super_admin.up,
    down: migration_20261006_230941_super_admin.down,
    name: '20261006_230941_super_admin',
  },
  {
    up: migration_20261007_091431_pack_commandes_joma.up,
    down: migration_20261007_091431_pack_commandes_joma.down,
    name: '20261007_091431_pack_commandes_joma'
  },
];
