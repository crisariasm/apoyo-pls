import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'

const usersTableExists = async (db: MigrateUpArgs['db']) => {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'role'
    ) AS "exists"
  `)

  return Boolean(result.rows[0]?.exists)
}

/**
 * Convierte los usuarios que tenían el rol combinado anterior.
 * Se ejecuta después de `add_split_user_roles` para que `anuncios` ya exista
 * y pueda utilizarse dentro de una transacción independiente.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (!(await usersTableExists(db))) return

  await db.execute(sql`
    UPDATE "users"
    SET "role" = 'anuncios'
    WHERE "role" = 'anuncios-boletin'
  `)
}

export async function down(): Promise<void> {
  // La conversión de roles separados a uno combinado no es reversible sin
  // perder la decisión de acceso de cada usuario.
}
