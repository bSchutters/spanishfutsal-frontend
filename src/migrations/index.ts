import * as migration_20260915_214144_initial from './20260915_214144_initial';
import * as migration_20260915_215244_hub from './20260915_215244_hub';
import * as migration_20260916_092458_events_primary_feed from './20260916_092458_events_primary_feed';
import * as migration_20260916_141930_formats_multiples from './20260916_141930_formats_multiples';
import * as migration_20260916_144023_ideas_formats_multiples from './20260916_144023_ideas_formats_multiples';

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
    name: '20260916_144023_ideas_formats_multiples'
  },
];
