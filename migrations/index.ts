import * as migration_20260821_182428_baseline from './20260821_182428_baseline';

export const migrations = [
  {
    up: migration_20260821_182428_baseline.up,
    down: migration_20260821_182428_baseline.down,
    name: '20260821_182428_baseline',
  },
];
