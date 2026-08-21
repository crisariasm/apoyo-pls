import * as migration_20260819_120000_add_split_user_roles from './20260819_120000_add_split_user_roles'
import * as migration_20260819_120001_migrate_legacy_shared_role from './20260819_120001_migrate_legacy_shared_role'
import * as migration_20260819_120002_normalize_support_requests from './20260819_120002_normalize_support_requests'
import * as migration_20260819_140000_add_runtime_indexes from './20260819_140000_add_runtime_indexes'
import * as migration_20260821_160519 from './20260821_160519'

export const migrations = [
  {
    up: migration_20260819_120000_add_split_user_roles.up,
    down: migration_20260819_120000_add_split_user_roles.down,
    name: '20260819_120000_add_split_user_roles',
  },
  {
    up: migration_20260819_120001_migrate_legacy_shared_role.up,
    down: migration_20260819_120001_migrate_legacy_shared_role.down,
    name: '20260819_120001_migrate_legacy_shared_role',
  },
  {
    up: migration_20260819_120002_normalize_support_requests.up,
    down: migration_20260819_120002_normalize_support_requests.down,
    name: '20260819_120002_normalize_support_requests',
  },
  {
    up: migration_20260819_140000_add_runtime_indexes.up,
    down: migration_20260819_140000_add_runtime_indexes.down,
    name: '20260819_140000_add_runtime_indexes',
  },
  {
    up: migration_20260821_160519.up,
    down: migration_20260821_160519.down,
    name: '20260821_160519',
  },
]
