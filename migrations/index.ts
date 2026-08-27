import * as migration_20260821_182428_baseline from './20260821_182428_baseline';
import * as migration_20260823_214500_add_support_request_source from './20260823_214500_add_support_request_source';
import * as migration_20260824_120000_add_activity_featured from './20260824_120000_add_activity_featured';
import * as migration_20260824_130000_add_service_contact_and_image from './20260824_130000_add_service_contact_and_image';
import * as migration_20260826_120000_add_service_discovery_fields from './20260826_120000_add_service_discovery_fields';

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
  {
    up: migration_20260824_120000_add_activity_featured.up,
    down: migration_20260824_120000_add_activity_featured.down,
    name: '20260824_120000_add_activity_featured',
  },
  {
    up: migration_20260824_130000_add_service_contact_and_image.up,
    down: migration_20260824_130000_add_service_contact_and_image.down,
    name: '20260824_130000_add_service_contact_and_image',
  },
  {
    up: migration_20260826_120000_add_service_discovery_fields.up,
    down: migration_20260826_120000_add_service_discovery_fields.down,
    name: '20260826_120000_add_service_discovery_fields',
  },
];
