import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "volunteer_activities" ADD COLUMN "featured" boolean DEFAULT false;
    CREATE INDEX "volunteer_activities_featured_idx" ON "volunteer_activities" USING btree ("featured");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "volunteer_activities_featured_idx";
    ALTER TABLE "volunteer_activities" DROP COLUMN "featured";
  `)
}
