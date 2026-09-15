import * as migration_20260915_214144_initial from './20260915_214144_initial';
import * as migration_20260915_215244_hub from './20260915_215244_hub';

export const migrations = [
  {
    up: migration_20260915_214144_initial.up,
    down: migration_20260915_214144_initial.down,
    name: '20260915_214144_initial',
  },
  {
    up: migration_20260915_215244_hub.up,
    down: migration_20260915_215244_hub.down,
    name: '20260915_215244_hub'
  },
];
