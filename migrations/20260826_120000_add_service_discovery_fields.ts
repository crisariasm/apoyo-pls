import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "city" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "service_mode" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "availability" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "pricing_type" varchar;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "featured" boolean;

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
    ALTER TABLE "services" ALTER COLUMN "city" SET DEFAULT 'Pereira';
    ALTER TABLE "services" ALTER COLUMN "city" SET NOT NULL;
    ALTER TABLE "services" ALTER COLUMN "service_mode" SET DEFAULT 'presencial';
    ALTER TABLE "services" ALTER COLUMN "service_mode" SET NOT NULL;
    ALTER TABLE "services" ALTER COLUMN "pricing_type" SET DEFAULT 'gratis';
    ALTER TABLE "services" ALTER COLUMN "pricing_type" SET NOT NULL;
    ALTER TABLE "services" ALTER COLUMN "featured" SET DEFAULT false;
    ALTER TABLE "services" ALTER COLUMN "featured" SET NOT NULL;

    CREATE INDEX IF NOT EXISTS "services_city_idx" ON "services" USING btree ("city");
    CREATE INDEX IF NOT EXISTS "services_pricing_type_idx" ON "services" USING btree ("pricing_type");
    CREATE INDEX IF NOT EXISTS "services_featured_idx" ON "services" USING btree ("featured");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "services_featured_idx";
    DROP INDEX IF EXISTS "services_pricing_type_idx";
    DROP INDEX IF EXISTS "services_city_idx";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "featured";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "pricing_type";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "availability";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "service_mode";
    ALTER TABLE "services" DROP COLUMN IF EXISTS "city";
  `)
}
