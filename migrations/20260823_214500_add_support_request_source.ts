import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_support_requests_source" AS ENUM('public-form', 'need-offer');
    ALTER TABLE "support_requests" ADD COLUMN "source" "public"."enum_support_requests_source" DEFAULT 'public-form' NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "support_requests" DROP COLUMN "source";
    DROP TYPE "public"."enum_support_requests_source";
  `)
}
