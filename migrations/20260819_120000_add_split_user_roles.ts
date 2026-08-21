import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'

const roleEnumExists = async (db: MigrateUpArgs['db']) => {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_type AS types
      INNER JOIN pg_namespace AS namespaces ON namespaces.oid = types.typnamespace
      WHERE namespaces.nspname = 'public'
        AND types.typname = 'enum_users_role'
    ) AS "exists"
  `)

  return Boolean(result.rows[0]?.exists)
}

/**
 * Prepara el enum de usuarios para separar el rol antiguo compartido.
 *
 * Esta migración no intenta eliminar valores del enum: PostgreSQL no permite
 * hacerlo de forma segura. El `push` de desarrollo o una migración de esquema
 * posterior puede retirar el valor antiguo una vez que los datos fueron
 * convertidos por la siguiente migración.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (!(await roleEnumExists(db))) return

  await db.execute(sql`
    ALTER TYPE "public"."enum_users_role"
    ADD VALUE IF NOT EXISTS 'anuncios'
  `)
  await db.execute(sql`
    ALTER TYPE "public"."enum_users_role"
    ADD VALUE IF NOT EXISTS 'boletin'
  `)
}

export async function down(): Promise<void> {
  // Los valores de un enum PostgreSQL no se eliminan de forma reversible.
}
