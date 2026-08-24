import * as migration_20260821_182428_baseline from './20260821_182428_baseline';
import * as migration_20260823_214500_add_support_request_source from './20260823_214500_add_support_request_source';

export const migrations = [
  {
    up: migration_20260821_182428_baseline.up,
    down: migration_20260821_182428_baseline.down,
    name: '20260821_182428_baseline',
  },
  {
    up: migration_20260823_214500_add_support_request_source.up,
    down: migration_20260823_214500_add_support_request_source.down,
    name: '20260823_214500_add_support_request_source',
  },
];
