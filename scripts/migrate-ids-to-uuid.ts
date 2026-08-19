import { Pool, type PoolClient } from 'pg'

const COLLECTION_TABLES = [
  'users',
  'aid_intakes',
  'resources',
  'needs',
  'distributions',
  'announcements',
  'community_notices',
  'services',
  'bulletins',
  'volunteer_activities',
  'support_requests',
  'media',
  'payload_kv',
  'payload_locked_documents',
  'payload_preferences',
]

const NESTED_ID_TABLES = ['users_sessions', 'distributions_evidence']

type CollectionTable = {
  name: string
  idType: string
}

type ForeignKey = {
  constraintName: string
  childTable: string
  childColumn: string
  parentTable: string
  parentColumn: string
  definition: string
  columnCount: number | null
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function tableIdentifier(value: string) {
  return `public.${quoteIdentifier(value)}`
}

async function getExistingTables(client: PoolClient): Promise<CollectionTable[]> {
  const result = await client.query<{ table_name: string; udt_name: string }>(
    `SELECT table_name, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND column_name = 'id'
       AND table_name = ANY($1::text[])`,
    [COLLECTION_TABLES],
  )

  return result.rows.map((row) => ({ name: row.table_name, idType: row.udt_name }))
}

async function getExistingTableNames(client: PoolClient, names: string[]) {
  const result = await client.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])`,
    [names],
  )
  return new Set(result.rows.map((row) => row.table_name))
}

async function getForeignKeys(client: PoolClient, convertedTables: Set<string>): Promise<ForeignKey[]> {
  const result = await client.query<ForeignKey>(
    `SELECT
       cons.conname AS "constraintName",
       child.relname AS "childTable",
       child_column.attname AS "childColumn",
       parent.relname AS "parentTable",
       parent_column.attname AS "parentColumn",
       pg_get_constraintdef(cons.oid) AS definition,
       array_length(cons.conkey, 1) AS "columnCount"
     FROM pg_constraint AS cons
     JOIN pg_class AS child ON child.oid = cons.conrelid
     JOIN pg_namespace AS child_schema ON child_schema.oid = child.relnamespace
     JOIN pg_class AS parent ON parent.oid = cons.confrelid
     JOIN pg_namespace AS parent_schema ON parent_schema.oid = parent.relnamespace
     JOIN pg_attribute AS child_column ON child_column.attrelid = cons.conrelid AND child_column.attnum = cons.conkey[1]
     JOIN pg_attribute AS parent_column ON parent_column.attrelid = cons.confrelid AND parent_column.attnum = cons.confkey[1]
     WHERE cons.contype = 'f'
       AND child_schema.nspname = 'public'
       AND parent_schema.nspname = 'public'
       AND parent.relname = ANY($1::text[])`,
    [[...convertedTables]],
  )

  const invalid = result.rows.filter((row) => Number(row.columnCount) > 1)
  if (invalid.length) {
    throw new Error(`No se pueden convertir claves foráneas compuestas automáticamente: ${invalid.map((row) => row.constraintName).join(', ')}`)
  }

  return result.rows
}

async function migrate() {
  if (process.env.UUID_MIGRATION_CONFIRM !== 'YES') {
    throw new Error('La migración es destructiva para el tipo de las columnas, aunque conserva los registros. Define UUID_MIGRATION_CONFIRM=YES después de crear un respaldo de PostgreSQL.')
  }

  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()

  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')
    const existingTables = await getExistingTables(client)
    const existingNestedTables = await getExistingTableNames(client, NESTED_ID_TABLES)
    const tablesToConvert = existingTables.filter((table) => table.idType !== 'uuid')

    if (!tablesToConvert.length) {
      for (const table of NESTED_ID_TABLES) {
        if (existingNestedTables.has(table)) {
          await client.query(`UPDATE ${tableIdentifier(table)} SET ${quoteIdentifier('id')} = gen_random_uuid()::text WHERE ${quoteIdentifier('id')} IS NOT NULL`)
        }
      }
      console.log('La base ya tiene UUID en las colecciones. No fue necesario convertir IDs principales.')
      return
    }

    const convertedNames = new Set(tablesToConvert.map((table) => table.name))
    const foreignKeys = await getForeignKeys(client, convertedNames)
    const mapNames = new Map<string, string>()

    await client.query('BEGIN')
    try {
      for (const table of tablesToConvert) {
        const mapName = `uuid_migration_${table.name}`
        mapNames.set(table.name, mapName)
        await client.query(`CREATE TEMP TABLE ${quoteIdentifier(mapName)} (old_id text PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP`)
        await client.query(`INSERT INTO ${quoteIdentifier(mapName)} (old_id, new_id) SELECT id::text, gen_random_uuid() FROM ${tableIdentifier(table.name)} WHERE id IS NOT NULL`)
        await client.query(`ALTER TABLE ${tableIdentifier(table.name)} ADD COLUMN ${quoteIdentifier('__uuid_migration_id')} uuid`)
        await client.query(`UPDATE ${tableIdentifier(table.name)} AS target SET ${quoteIdentifier('__uuid_migration_id')} = map.new_id FROM ${quoteIdentifier(mapName)} AS map WHERE target.id::text = map.old_id`)
      }

      for (const foreignKey of foreignKeys) {
        await client.query(`ALTER TABLE ${tableIdentifier(foreignKey.childTable)} DROP CONSTRAINT ${quoteIdentifier(foreignKey.constraintName)}`)
      }

      for (const foreignKey of foreignKeys) {
        const mapName = mapNames.get(foreignKey.parentTable)
        if (!mapName) continue

        const childTable = tableIdentifier(foreignKey.childTable)
        const childColumn = quoteIdentifier(foreignKey.childColumn)
        const mapTable = quoteIdentifier(mapName)
        const orphanResult = await client.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM ${childTable} AS child
           LEFT JOIN ${mapTable} AS map ON child.${childColumn}::text = map.old_id
           WHERE child.${childColumn} IS NOT NULL
             AND NULLIF(child.${childColumn}::text, '') IS NOT NULL
             AND map.old_id IS NULL`,
        )
        if (Number(orphanResult.rows[0]?.count || 0) > 0) {
          throw new Error(`La relación ${foreignKey.childTable}.${foreignKey.childColumn} tiene registros huérfanos frente a ${foreignKey.parentTable}. Corrige esos datos antes de migrar.`)
        }

        await client.query(`ALTER TABLE ${childTable} ALTER COLUMN ${childColumn} TYPE text USING ${childColumn}::text`)
        await client.query(`UPDATE ${childTable} AS child SET ${childColumn} = map.new_id::text FROM ${mapTable} AS map WHERE child.${childColumn} = map.old_id`)
        await client.query(`ALTER TABLE ${childTable} ALTER COLUMN ${childColumn} TYPE uuid USING NULLIF(${childColumn}, '')::uuid`)
      }

      for (const table of tablesToConvert) {
        const tableName = tableIdentifier(table.name)
        const idColumn = quoteIdentifier('id')
        const tempColumn = quoteIdentifier('__uuid_migration_id')
        await client.query(`ALTER TABLE ${tableName} ALTER COLUMN ${idColumn} DROP DEFAULT`)
        await client.query(`ALTER TABLE ${tableName} ALTER COLUMN ${idColumn} TYPE uuid USING ${tempColumn}`)
        await client.query(`ALTER TABLE ${tableName} ALTER COLUMN ${idColumn} SET DEFAULT gen_random_uuid()`)
        await client.query(`ALTER TABLE ${tableName} DROP COLUMN ${tempColumn}`)
      }

      for (const table of NESTED_ID_TABLES) {
        if (existingNestedTables.has(table)) {
          await client.query(`UPDATE ${tableIdentifier(table)} SET ${quoteIdentifier('id')} = gen_random_uuid()::text WHERE ${quoteIdentifier('id')} IS NOT NULL`)
        }
      }

      for (const foreignKey of foreignKeys) {
        await client.query(`ALTER TABLE ${tableIdentifier(foreignKey.childTable)} ADD CONSTRAINT ${quoteIdentifier(foreignKey.constraintName)} ${foreignKey.definition}`)
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }

    console.log(`Migración completada: ${tablesToConvert.length} colecciones convertidas a UUID y ${foreignKeys.length} relaciones actualizadas.`)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
