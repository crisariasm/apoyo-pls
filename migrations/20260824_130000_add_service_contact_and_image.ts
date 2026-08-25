import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "image_id" uuid;
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "whatsapp_country_code" varchar DEFAULT '+57';
    ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "whatsapp_number" varchar;
    UPDATE "services"
    SET "whatsapp_country_code" = '+57'
    WHERE "whatsapp_country_code" IS NULL OR btrim("whatsapp_country_code") = '';
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM "services"
        WHERE "whatsapp_number" IS NULL OR btrim("whatsapp_number") = ''
      ) THEN
        RAISE EXCEPTION 'No se puede hacer obligatorio WhatsApp: existen servicios sin número. Complétalos antes de migrar.';
      END IF;
    END $$;
    ALTER TABLE "services" ALTER COLUMN "whatsapp_country_code" SET DEFAULT '+57';
    ALTER TABLE "services" ALTER COLUMN "whatsapp_country_code" SET NOT NULL;
    ALTER TABLE "services" ALTER COLUMN "whatsapp_number" SET NOT NULL;
    DO $$
    BEGIN
      ALTER TABLE "services" ADD CONSTRAINT "services_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS "services_image_idx" ON "services" USING btree ("image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "services_image_idx";
    ALTER TABLE "services" DROP CONSTRAINT "services_image_id_media_id_fk";
    ALTER TABLE "services" DROP COLUMN "whatsapp_number";
    ALTER TABLE "services" DROP COLUMN "whatsapp_country_code";
    ALTER TABLE "services" DROP COLUMN "image_id";
  `)
}
