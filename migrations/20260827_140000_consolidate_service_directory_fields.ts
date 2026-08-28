import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Cambios de servicios incorporados para el directorio, las solicitudes
 * públicas y el almacenamiento de imágenes. Es idempotente para que también
 * pueda completar una base local en la que se haya usado `push` o una versión
 * previa de estos cambios antes de ejecutar el seeder.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "city" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "service_mode" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "availability" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "pricing_type" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "featured" boolean;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "coverage" jsonb;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "provider_email" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "submission_source" varchar DEFAULT 'staff';
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "approved_by" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "approved_by_user_id" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "approved_at" timestamp(3) with time zone;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "vision" varchar;

    -- En desarrollo Payload puede haber creado estos selects como enums antes
    -- de registrar la migración. Los normalizamos para que el seed funcione
    -- igual en bases nuevas y en bases con cambios dinámicos.
    ALTER TABLE "services" ALTER COLUMN "service_mode" TYPE varchar USING "service_mode"::text;
    ALTER TABLE "services" ALTER COLUMN "pricing_type" TYPE varchar USING "pricing_type"::text;
    ALTER TABLE "services" ALTER COLUMN "submission_source" TYPE varchar USING "submission_source"::text;

    UPDATE "services"
    SET "city" = CASE
      WHEN "location" ILIKE '%pereira%' THEN 'Pereira'
      WHEN "location" ILIKE '%dosquebradas%' THEN 'Dosquebradas'
      WHEN "location" ILIKE '%santa rosa%' THEN 'Santa Rosa de Cabal'
      WHEN "location" ILIKE '%la virginia%' THEN 'La Virginia'
      WHEN "location" ILIKE '%marsella%' THEN 'Marsella'
      WHEN "location" ILIKE '%cartago%' THEN 'Cartago'
      WHEN "location" ILIKE '%armenia%' THEN 'Armenia'
      WHEN "location" ILIKE '%manizales%' THEN 'Manizales'
      WHEN "location" ILIKE '%medellín%' OR "location" ILIKE '%medellin%' THEN 'Medellín'
      WHEN "location" ILIKE '%bogotá%' OR "location" ILIKE '%bogota%' THEN 'Bogotá'
      WHEN "location" ILIKE '%cali%' THEN 'Cali'
      WHEN "location" ILIKE '%barranquilla%' THEN 'Barranquilla'
      WHEN "location" ILIKE '%cartagena%' THEN 'Cartagena'
      WHEN "location" ILIKE '%cúcuta%' OR "location" ILIKE '%cucuta%' THEN 'Cúcuta'
      WHEN "location" ILIKE '%bucaramanga%' THEN 'Bucaramanga'
      WHEN "location" ILIKE '%ibagué%' OR "location" ILIKE '%ibague%' THEN 'Ibagué'
      WHEN "location" ILIKE '%santa marta%' THEN 'Santa Marta'
      WHEN "location" ILIKE '%villavicencio%' THEN 'Villavicencio'
      WHEN "location" ILIKE '%pasto%' THEN 'Pasto'
      WHEN "location" ILIKE '%montería%' OR "location" ILIKE '%monteria%' THEN 'Montería'
      WHEN "location" ILIKE '%neiva%' THEN 'Neiva'
      WHEN "location" ILIKE '%popayán%' OR "location" ILIKE '%popayan%' THEN 'Popayán'
      WHEN "location" ILIKE '%quibdó%' OR "location" ILIKE '%quibdo%' THEN 'Quibdó'
      WHEN "location" ILIKE '%remoto%' THEN 'Remoto / toda Colombia'
      ELSE COALESCE(NULLIF(BTRIM("city"), ''), 'Pereira')
    END
    WHERE "city" IS NULL OR BTRIM("city") = '' OR "city" = 'Pereira';

    UPDATE "services"
    SET "service_mode" = CASE
      WHEN "location" ILIKE '%remoto%' THEN 'remoto'
      WHEN "location" ILIKE '%domicilio%' THEN 'domicilio'
      ELSE COALESCE(NULLIF(BTRIM("service_mode"), ''), 'presencial')
    END
    WHERE "service_mode" IS NULL OR BTRIM("service_mode") = '' OR "service_mode" = 'presencial';

    UPDATE "services"
    SET "pricing_type" = CASE
      WHEN "type" = 'gratuito' OR "price" ILIKE '%sin costo%' OR "price" ILIKE '%gratis%' THEN 'gratis'
      WHEN "price" ILIKE '%a convenir%' OR "price" ILIKE '%negoci%' THEN 'negociable'
      WHEN "price" ILIKE '%intercambio%' OR "price" ILIKE '%aporte%' THEN 'intercambio'
      WHEN "type" = 'necesitado' OR "price" ILIKE '%se necesita%' OR "price" ILIKE '%por definir%' THEN 'por-definir'
      WHEN "price" ~ '[0-9]' OR "price" LIKE '%$%' THEN 'pagado'
      ELSE COALESCE(NULLIF(BTRIM("pricing_type"), ''), 'por-definir')
    END
    WHERE "pricing_type" IS NULL OR BTRIM("pricing_type") = '' OR "pricing_type" = 'gratis';

    UPDATE "services" SET "featured" = false WHERE "featured" IS NULL;

    UPDATE "services"
    SET "coverage" = CASE
      WHEN "city" ILIKE 'Pereira' THEN jsonb_build_array(jsonb_build_object('departmentCode', '66', 'department', 'Risaralda', 'city', 'Pereira'))
      WHEN "city" ILIKE 'Dosquebradas' THEN jsonb_build_array(jsonb_build_object('departmentCode', '66', 'department', 'Risaralda', 'city', 'Dosquebradas'))
      WHEN "city" ILIKE 'Santa Rosa de Cabal' THEN jsonb_build_array(jsonb_build_object('departmentCode', '66', 'department', 'Risaralda', 'city', 'Santa Rosa de Cabal'))
      WHEN "city" ILIKE 'La Virginia' THEN jsonb_build_array(jsonb_build_object('departmentCode', '66', 'department', 'Risaralda', 'city', 'La Virginia'))
      WHEN "city" ILIKE 'Marsella' THEN jsonb_build_array(jsonb_build_object('departmentCode', '66', 'department', 'Risaralda', 'city', 'Marsella'))
      WHEN "city" ILIKE 'Armenia' THEN jsonb_build_array(jsonb_build_object('departmentCode', '63', 'department', 'Quindío', 'city', 'Armenia'))
      WHEN "city" ILIKE 'Manizales' THEN jsonb_build_array(jsonb_build_object('departmentCode', '17', 'department', 'Caldas', 'city', 'Manizales'))
      WHEN "city" ILIKE 'Medellín' OR "city" ILIKE 'Medellin' THEN jsonb_build_array(jsonb_build_object('departmentCode', '05', 'department', 'Antioquia', 'city', 'Medellín'))
      WHEN "city" ILIKE 'Bogotá' OR "city" ILIKE 'Bogota' THEN jsonb_build_array(jsonb_build_object('departmentCode', '11', 'department', 'Bogotá D.C.', 'city', 'Bogotá'))
      WHEN "city" ILIKE 'Cali' THEN jsonb_build_array(jsonb_build_object('departmentCode', '76', 'department', 'Valle del Cauca', 'city', 'Cali'))
      WHEN "city" ILIKE 'Remoto / toda Colombia' THEN jsonb_build_array(jsonb_build_object('departmentCode', 'nacional', 'department', 'Cobertura nacional', 'city', 'Remoto / toda Colombia'))
      ELSE jsonb_build_array(jsonb_build_object('departmentCode', 'legacy', 'department', 'Otra cobertura', 'city', COALESCE(NULLIF(BTRIM("city"), ''), 'Pereira')))
    END
    WHERE "coverage" IS NULL OR jsonb_typeof("coverage") <> 'array' OR jsonb_array_length("coverage") = 0;

    UPDATE "services" SET "submission_source" = 'staff' WHERE "submission_source" IS NULL OR BTRIM("submission_source") = '';
    ALTER TABLE "services" ALTER COLUMN "city" SET DEFAULT 'Pereira';
    ALTER TABLE "services" ALTER COLUMN "city" SET NOT NULL;
    ALTER TABLE "services" ALTER COLUMN "service_mode" SET DEFAULT 'presencial';
    ALTER TABLE "services" ALTER COLUMN "service_mode" SET NOT NULL;
    ALTER TABLE "services" ALTER COLUMN "pricing_type" SET DEFAULT 'gratis';
    ALTER TABLE "services" ALTER COLUMN "pricing_type" SET NOT NULL;
    ALTER TABLE "services" ALTER COLUMN "featured" SET DEFAULT false;
    ALTER TABLE "services" ALTER COLUMN "featured" SET NOT NULL;
    ALTER TABLE "services" ALTER COLUMN "submission_source" SET DEFAULT 'staff';
    ALTER TABLE "services" ALTER COLUMN "submission_source" SET NOT NULL;
    ALTER TABLE "services" ALTER COLUMN "coverage" SET NOT NULL;

    CREATE INDEX IF NOT EXISTS "services_city_idx" ON "services" USING btree ("city");
    CREATE INDEX IF NOT EXISTS "services_pricing_type_idx" ON "services" USING btree ("pricing_type");
    CREATE INDEX IF NOT EXISTS "services_featured_idx" ON "services" USING btree ("featured");
    CREATE INDEX IF NOT EXISTS "services_submission_source_idx" ON "services" USING btree ("submission_source");
    CREATE INDEX IF NOT EXISTS "services_approved_at_idx" ON "services" USING btree ("approved_at");

    -- El nombre original no identifica al recurso: la clave de R2 ya es única.
    DROP INDEX IF EXISTS "media_filename_idx";
    CREATE INDEX IF NOT EXISTS "media_filename_idx" ON "media" USING btree ("filename");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "services_approved_at_idx";
    DROP INDEX IF EXISTS "services_submission_source_idx";
    DROP INDEX IF EXISTS "services_featured_idx";
    DROP INDEX IF EXISTS "services_pricing_type_idx";
    DROP INDEX IF EXISTS "services_city_idx";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "vision";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "approved_at";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "approved_by_user_id";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "approved_by";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "submission_source";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "provider_email";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "coverage";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "featured";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "pricing_type";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "availability";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "service_mode";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "city";
    DROP INDEX IF EXISTS "media_filename_idx";
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM "media"
        WHERE "filename" IS NOT NULL
        GROUP BY "filename"
        HAVING COUNT(*) > 1
      ) THEN
        CREATE INDEX "media_filename_idx" ON "media" USING btree ("filename");
      ELSE
        CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
      END IF;
    END $$;
  `)
}
