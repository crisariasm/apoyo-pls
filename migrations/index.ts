import * as migration_20260819_120000_add_split_user_roles from './20260819_120000_add_split_user_roles'
import * as migration_20260819_120001_migrate_legacy_shared_role from './20260819_120001_migrate_legacy_shared_role'

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
]
