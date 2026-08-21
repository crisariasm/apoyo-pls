import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Añade exclusivamente el historial de auditoría del administrador.
 * No modifica tablas operativas ni transforma datos existentes.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_audit_logs_action" AS ENUM (
      'login', 'logout', 'create', 'update', 'delete', 'error'
    );

    CREATE TYPE "public"."enum_audit_logs_source" AS ENUM (
      'payload-admin', 'equipo', 'sistema'
    );

    CREATE TYPE "public"."enum_audit_logs_entity_type" AS ENUM (
      'collection', 'global', 'auth', 'system'
    );

    CREATE TABLE "audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "occurred_at" timestamp(3) with time zone NOT NULL,
      "action" "enum_audit_logs_action" NOT NULL,
      "source" "enum_audit_logs_source" NOT NULL,
      "actor_name" varchar NOT NULL,
      "actor_email" varchar,
      "actor_role" varchar,
      "actor_id" varchar,
      "entity_type" "enum_audit_logs_entity_type" NOT NULL,
      "entity_slug" varchar NOT NULL,
      "document_id" varchar,
      "document_label" varchar,
      "changed_fields" varchar,
      "summary" varchar NOT NULL,
      "path" varchar,
      "method" varchar,
      "ip_address" varchar,
      "user_agent" varchar,
      "success" boolean DEFAULT true NOT NULL,
      "status_code" numeric,
      "error_name" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs" ("occurred_at");
    CREATE INDEX "audit_logs_action_idx" ON "audit_logs" ("action");
    CREATE INDEX "audit_logs_source_idx" ON "audit_logs" ("source");
    CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" ("actor_id");
    CREATE INDEX "audit_logs_entity_slug_idx" ON "audit_logs" ("entity_slug");
    CREATE INDEX "audit_logs_document_id_idx" ON "audit_logs" ("document_id");
    CREATE INDEX "audit_logs_success_idx" ON "audit_logs" ("success");
    CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" ("updated_at");
    CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");
    CREATE INDEX "audit_logs_actor_occurred_idx" ON "audit_logs" ("actor_id", "occurred_at");
    CREATE INDEX "audit_logs_entity_occurred_idx" ON "audit_logs" ("entity_slug", "occurred_at");
    CREATE INDEX "audit_logs_action_occurred_idx" ON "audit_logs" ("action", "occurred_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "audit_logs" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_audit_logs_action";
    DROP TYPE IF EXISTS "public"."enum_audit_logs_source";
    DROP TYPE IF EXISTS "public"."enum_audit_logs_entity_type";
  `)
}
