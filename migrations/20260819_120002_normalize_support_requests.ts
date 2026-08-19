import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'

const columnExists = async (db: MigrateUpArgs['db'], columnName: string) => {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'support_requests'
        AND column_name = ${columnName}
    ) AS "exists"
  `)

  return Boolean(result.rows[0]?.exists)
}

const globalColumnExists = async (db: MigrateUpArgs['db'], columnName: string) => {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'site_settings'
        AND column_name = ${columnName}
    ) AS "exists"
  `)

  return Boolean(result.rows[0]?.exists)
}

/**
 * Adapta las solicitudes antiguas a los campos tipados de los formularios
 * públicos: teléfono, cantidad numérica y unidad separada.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  const hasLegacyContact = await columnExists(db, 'contact_channel')
  const hasPhone = await columnExists(db, 'phone')

  if (hasLegacyContact && !hasPhone) {
    await db.execute(sql`ALTER TABLE "support_requests" RENAME COLUMN "contact_channel" TO "phone"`)
  } else if (!hasPhone) {
    await db.execute(sql`ALTER TABLE "support_requests" ADD COLUMN "phone" varchar(20)`)
  }

  await db.execute(sql`
    UPDATE "support_requests"
    SET "phone" = CASE
      WHEN regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g') ~ '^[0-9]{7,15}$'
        THEN regexp_replace("phone", '[^0-9]', '', 'g')
      ELSE '3000000000'
    END
    WHERE "phone" IS NULL
      OR regexp_replace("phone", '[^0-9]', '', 'g') !~ '^[0-9]{7,15}$'
  `)
  await db.execute(sql`ALTER TABLE "support_requests" ALTER COLUMN "phone" TYPE varchar(20) USING LEFT("phone", 20)`)
  await db.execute(sql`ALTER TABLE "support_requests" ALTER COLUMN "phone" SET NOT NULL`)

  if (!(await columnExists(db, 'quantity_unit'))) {
    await db.execute(sql`ALTER TABLE "support_requests" ADD COLUMN "quantity_unit" varchar(40)`)
  }

  const quantityType = await db.execute(sql`
    SELECT data_type AS "dataType"
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'support_requests'
      AND column_name = 'quantity'
  `)
  if (quantityType.rows[0]?.dataType !== 'numeric') {
    await db.execute(sql`
      ALTER TABLE "support_requests"
      ALTER COLUMN "quantity" TYPE numeric
      USING NULLIF(substring(COALESCE("quantity"::text, '') FROM '^[0-9]+'), '')::numeric
    `)
  }

  const hasLegacyCenterContact = await globalColumnExists(db, 'contact_channel')
  const hasCenterPhone = await globalColumnExists(db, 'phone')
  if (hasLegacyCenterContact && !hasCenterPhone) {
    await db.execute(sql`ALTER TABLE "site_settings" RENAME COLUMN "contact_channel" TO "phone"`)
  } else if (!hasCenterPhone && (await globalColumnExists(db, 'center_name'))) {
    await db.execute(sql`ALTER TABLE "site_settings" ADD COLUMN "phone" varchar(20) DEFAULT '300 000 0000'`)
  }
  if (await globalColumnExists(db, 'phone')) {
    await db.execute(sql`UPDATE "site_settings" SET "phone" = '300 000 0000' WHERE "phone" IS NULL OR BTRIM("phone") = ''`)
    await db.execute(sql`ALTER TABLE "site_settings" ALTER COLUMN "phone" TYPE varchar(20) USING LEFT("phone", 20)`)
    await db.execute(sql`ALTER TABLE "site_settings" ALTER COLUMN "phone" SET NOT NULL`)
  }
}

export async function down(): Promise<void> {
  // La migración conserva los datos en los campos nuevos; no se revierte para
  // evitar volver a mezclar el teléfono con el texto de contacto.
}
