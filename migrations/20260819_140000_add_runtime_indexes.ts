import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Índices para las lecturas públicas y los conteos del portal de equipo.
 *
 * Se comprueba la existencia de cada tabla y columna porque esta migración
 * también puede ejecutarse sobre una base local de una versión anterior.
 * Las sentencias son constantes: no reciben nombres ni SQL desde peticiones.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  const tablesResult = await db.execute(sql`
    SELECT table_name AS "tableName"
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `)
  const tables = new Set(tablesResult.rows.map((row) => String(row.tableName)))
  const columnsResult = await db.execute(sql`
    SELECT table_name AS "tableName", column_name AS "columnName"
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `)
  const columns = new Set(columnsResult.rows.map((row) => `${String(row.tableName)}.${String(row.columnName)}`))

  const indexes = [
    { table: 'resources', required: ['public_visible', 'featured', 'updated_at', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "resources_public_featured_updated_idx" ON "resources" ("public_visible", "featured", "updated_at", "created_at")` },
    { table: 'resources', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "resources_registered_by_idx" ON "resources" ("registered_by_user_id")` },
    { table: 'aid_intakes', required: ['public_visible', 'featured', 'received_at', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "aid_intakes_public_featured_received_idx" ON "aid_intakes" ("public_visible", "featured", "received_at", "created_at")` },
    { table: 'aid_intakes', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "aid_intakes_registered_by_idx" ON "aid_intakes" ("registered_by_user_id")` },
    { table: 'needs', required: ['public_visible', 'status', 'featured', 'updated_at', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "needs_public_status_featured_idx" ON "needs" ("public_visible", "status", "featured", "updated_at", "created_at")` },
    { table: 'needs', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "needs_registered_by_idx" ON "needs" ("registered_by_user_id")` },
    { table: 'announcements', required: ['status', 'public_visible', 'featured', 'published_at', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "announcements_public_status_idx" ON "announcements" ("status", "public_visible", "featured", "published_at", "created_at")` },
    { table: 'announcements', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "announcements_registered_by_idx" ON "announcements" ("registered_by_user_id")` },
    { table: 'bulletins', required: ['status', 'public_visible', 'featured', 'published_at', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "bulletins_public_status_idx" ON "bulletins" ("status", "public_visible", "featured", "published_at", "created_at")` },
    { table: 'bulletins', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "bulletins_registered_by_idx" ON "bulletins" ("registered_by_user_id")` },
    { table: 'community_notices', required: ['status', 'public_visible', 'featured', 'published_at', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "community_notices_public_status_idx" ON "community_notices" ("status", "public_visible", "featured", "published_at", "created_at")` },
    { table: 'community_notices', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "community_notices_registered_by_idx" ON "community_notices" ("registered_by_user_id")` },
    { table: 'services', required: ['status', 'public_visible', 'published_at', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "services_public_status_idx" ON "services" ("status", "public_visible", "published_at", "created_at")` },
    { table: 'services', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "services_registered_by_idx" ON "services" ("registered_by_user_id")` },
    { table: 'volunteer_activities', required: ['status', 'public_visible', 'date', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "volunteer_activities_public_date_idx" ON "volunteer_activities" ("status", "public_visible", "date", "created_at")` },
    { table: 'volunteer_activities', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "volunteer_activities_registered_by_idx" ON "volunteer_activities" ("registered_by_user_id")` },
    { table: 'distributions', required: ['public_visible', 'date', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "distributions_public_date_idx" ON "distributions" ("public_visible", "date", "created_at")` },
    { table: 'distributions', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "distributions_registered_by_idx" ON "distributions" ("registered_by_user_id")` },
    { table: 'distribution_evidence', required: ['status', 'public_visible', 'published_at', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "distribution_evidence_public_status_idx" ON "distribution_evidence" ("status", "public_visible", "published_at", "created_at")` },
    { table: 'distribution_evidence', required: ['distribution_id'], query: sql`CREATE INDEX IF NOT EXISTS "distribution_evidence_distribution_idx" ON "distribution_evidence" ("distribution_id")` },
    { table: 'distribution_evidence', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "distribution_evidence_registered_by_idx" ON "distribution_evidence" ("registered_by_user_id")` },
    { table: 'support_requests', required: ['status', 'created_at'], query: sql`CREATE INDEX IF NOT EXISTS "support_requests_status_created_idx" ON "support_requests" ("status", "created_at")` },
    { table: 'support_requests', required: ['registered_by_user_id'], query: sql`CREATE INDEX IF NOT EXISTS "support_requests_registered_by_idx" ON "support_requests" ("registered_by_user_id")` },
  ]

  for (const index of indexes) {
    if (!tables.has(index.table)) continue
    if (!index.required.every((column) => columns.has(`${index.table}.${column}`))) continue
    await db.execute(index.query)
  }
}

export async function down(): Promise<void> {
  // Se conservan los índices al revertir una migración de datos para no
  // degradar el rendimiento de la aplicación de forma inesperada.
}
