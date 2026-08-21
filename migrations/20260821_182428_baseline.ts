import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'super-admin', 'que-tenemos', 'que-necesitamos', 'anuncios', 'boletin', 'servicios', 'inventario', 'distribucion', 'comunicados', 'administracion');
  CREATE TYPE "public"."enum_aid_intakes_category" AS ENUM('alimentos', 'agua', 'aseo', 'salud', 'abrigo', 'bebes', 'herramientas', 'mascotas', 'cocina', 'higiene', 'transporte', 'alojamiento', 'energia', 'construccion', 'otros');
  CREATE TYPE "public"."enum_aid_intakes_source_type" AS ENUM('donacion', 'alianza', 'compra', 'prestamo', 'otro');
  CREATE TYPE "public"."enum_aid_intakes_status" AS ENUM('recibida', 'en-clasificacion', 'incorporada', 'no-apta');
  CREATE TYPE "public"."enum_resources_category" AS ENUM('alimentos', 'agua', 'aseo', 'salud', 'abrigo', 'bebes', 'herramientas', 'mascotas', 'cocina', 'higiene', 'transporte', 'alojamiento', 'energia', 'construccion', 'otros');
  CREATE TYPE "public"."enum_resources_status" AS ENUM('disponible', 'limitado', 'agotado');
  CREATE TYPE "public"."enum_needs_category" AS ENUM('alimentos', 'agua', 'aseo', 'salud', 'abrigo', 'bebes', 'herramientas', 'mascotas', 'cocina', 'higiene', 'transporte', 'alojamiento', 'energia', 'construccion', 'otros');
  CREATE TYPE "public"."enum_needs_priority" AS ENUM('critica', 'alta', 'media');
  CREATE TYPE "public"."enum_needs_status" AS ENUM('abierta', 'en-gestion', 'cubierta', 'cerrada');
  CREATE TYPE "public"."enum_distributions_status" AS ENUM('pendiente', 'en-ruta', 'entregado');
  CREATE TYPE "public"."enum_distribution_evidence_source_type" AS ENUM('distribucion', 'otro');
  CREATE TYPE "public"."enum_distribution_evidence_status" AS ENUM('borrador', 'publicado', 'archivado');
  CREATE TYPE "public"."enum_announcements_type" AS ENUM('horario', 'necesidad', 'distribucion', 'voluntariado', 'oficial', 'impacto');
  CREATE TYPE "public"."enum_announcements_status" AS ENUM('borrador', 'publicado', 'archivado');
  CREATE TYPE "public"."enum_community_notices_category" AS ENUM('mascota-perdida', 'mascota-encontrada', 'apoyo-comunitario', 'objeto-perdido', 'informacion-comunitaria', 'vivienda', 'otro');
  CREATE TYPE "public"."enum_community_notices_status" AS ENUM('borrador', 'publicado', 'archivado');
  CREATE TYPE "public"."enum_services_type" AS ENUM('gratuito', 'ofrecido', 'necesitado');
  CREATE TYPE "public"."enum_services_status" AS ENUM('borrador', 'publicado', 'archivado');
  CREATE TYPE "public"."enum_bulletins_status" AS ENUM('borrador', 'publicado', 'archivado');
  CREATE TYPE "public"."enum_volunteer_activities_status" AS ENUM('abierta', 'llena', 'finalizada');
  CREATE TYPE "public"."enum_support_requests_help_type" AS ENUM('necesitar-ayuda', 'ofrecer-ayuda');
  CREATE TYPE "public"."enum_support_requests_request_type" AS ENUM('recursos', 'oferta', 'transporte', 'voluntariado');
  CREATE TYPE "public"."enum_support_requests_quantity_unit" AS ENUM('unidades', 'cajas', 'kits', 'paquetes', 'bultos', 'pares', 'pacas', 'canecas', 'litros', 'turnos', 'horas', 'recorridos', 'cupos', 'jornadas');
  CREATE TYPE "public"."enum_support_requests_status" AS ENUM('pendiente', 'en-revision', 'asignada', 'atendida', 'cerrada');
  CREATE TYPE "public"."enum_audit_logs_action" AS ENUM('login', 'logout', 'create', 'update', 'delete', 'error');
  CREATE TYPE "public"."enum_audit_logs_source" AS ENUM('payload-admin', 'equipo', 'sistema');
  CREATE TYPE "public"."enum_audit_logs_entity_type" AS ENUM('collection', 'global', 'auth', 'system');
  CREATE TYPE "public"."enum_site_settings_center_status" AS ENUM('abierto', 'limitado', 'cerrado');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'admin' NOT NULL,
  	"phone" varchar,
  	"active" boolean DEFAULT true,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "aid_intakes" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"resource_name" varchar NOT NULL,
  	"category" "enum_aid_intakes_category" NOT NULL,
  	"quantity" numeric NOT NULL,
  	"unit" varchar NOT NULL,
  	"source_type" "enum_aid_intakes_source_type" NOT NULL,
  	"source_reference" varchar,
  	"received_at" timestamp(3) with time zone NOT NULL,
  	"status" "enum_aid_intakes_status" DEFAULT 'recibida' NOT NULL,
  	"public_visible" boolean DEFAULT true,
  	"featured" boolean DEFAULT false,
  	"notes" varchar,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "resources" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"category" "enum_resources_category" NOT NULL,
  	"quantity" numeric NOT NULL,
  	"unit" varchar NOT NULL,
  	"status" "enum_resources_status" DEFAULT 'disponible' NOT NULL,
  	"public_visible" boolean DEFAULT true,
  	"featured" boolean DEFAULT false,
  	"notes" varchar,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "needs" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"detail" varchar NOT NULL,
  	"category" "enum_needs_category" NOT NULL,
  	"quantity" numeric,
  	"unit" varchar,
  	"priority" "enum_needs_priority" DEFAULT 'media' NOT NULL,
  	"status" "enum_needs_status" DEFAULT 'abierta' NOT NULL,
  	"zone" varchar,
  	"public_visible" boolean DEFAULT true,
  	"featured" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "distributions_evidence" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" uuid NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL
  );
  
  CREATE TABLE "distributions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"resource_name" varchar NOT NULL,
  	"quantity" numeric NOT NULL,
  	"unit" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"destination" varchar NOT NULL,
  	"organization" varchar NOT NULL,
  	"status" "enum_distributions_status" DEFAULT 'pendiente' NOT NULL,
  	"public_visible" boolean DEFAULT true,
  	"notes" varchar,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "distribution_evidence" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"source_type" "enum_distribution_evidence_source_type" DEFAULT 'distribucion' NOT NULL,
  	"distribution_id" uuid,
  	"other_reference" varchar,
  	"image_id" uuid,
  	"public_image_path" varchar,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"status" "enum_distribution_evidence_status" DEFAULT 'publicado' NOT NULL,
  	"public_visible" boolean DEFAULT true,
  	"published_at" timestamp(3) with time zone,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "announcements" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"type" "enum_announcements_type" NOT NULL,
  	"status" "enum_announcements_status" DEFAULT 'borrador' NOT NULL,
  	"featured" boolean DEFAULT false,
  	"public_visible" boolean DEFAULT true,
  	"published_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "community_notices" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"category" "enum_community_notices_category" NOT NULL,
  	"image_id" uuid,
  	"public_image_path" varchar,
  	"location" varchar NOT NULL,
  	"contact" varchar NOT NULL,
  	"status" "enum_community_notices_status" DEFAULT 'borrador' NOT NULL,
  	"featured" boolean DEFAULT false,
  	"public_visible" boolean DEFAULT true,
  	"published_at" timestamp(3) with time zone,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "services" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"type" "enum_services_type" NOT NULL,
  	"category" varchar NOT NULL,
  	"provider" varchar NOT NULL,
  	"location" varchar NOT NULL,
  	"price" varchar,
  	"status" "enum_services_status" DEFAULT 'publicado' NOT NULL,
  	"public_visible" boolean DEFAULT true,
  	"published_at" timestamp(3) with time zone,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bulletins" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"summary" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"category" varchar NOT NULL,
  	"author" varchar NOT NULL,
  	"status" "enum_bulletins_status" DEFAULT 'borrador' NOT NULL,
  	"featured" boolean DEFAULT false,
  	"public_visible" boolean DEFAULT true,
  	"published_at" timestamp(3) with time zone,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "volunteer_activities" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"start_time" varchar NOT NULL,
  	"end_time" varchar NOT NULL,
  	"location" varchar NOT NULL,
  	"capacity" numeric NOT NULL,
  	"registered" numeric DEFAULT 0,
  	"status" "enum_volunteer_activities_status" DEFAULT 'abierta' NOT NULL,
  	"public_visible" boolean DEFAULT true,
  	"lead" varchar,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "support_requests" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"help_type" "enum_support_requests_help_type" DEFAULT 'necesitar-ayuda' NOT NULL,
  	"request_type" "enum_support_requests_request_type" NOT NULL,
  	"category" varchar NOT NULL,
  	"zone" varchar NOT NULL,
  	"quantity" numeric,
  	"quantity_unit" "enum_support_requests_quantity_unit",
  	"description" varchar NOT NULL,
  	"contact_name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"status" "enum_support_requests_status" DEFAULT 'pendiente' NOT NULL,
  	"internal_notes" varchar,
  	"privacy_accepted" boolean DEFAULT false NOT NULL,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"alt" varchar NOT NULL,
  	"r2_key" varchar,
  	"r2_filename" varchar,
  	"r2_mime_type" varchar,
  	"r2_filesize" numeric,
  	"uploaded_by_user_id" varchar,
  	"uploaded_by_name" varchar,
  	"registered_by" varchar,
  	"registered_by_user_id" varchar,
  	"updated_by" varchar,
  	"updated_by_user_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
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
  
  CREATE TABLE "payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid,
  	"aid_intakes_id" uuid,
  	"resources_id" uuid,
  	"needs_id" uuid,
  	"distributions_id" uuid,
  	"distribution_evidence_id" uuid,
  	"announcements_id" uuid,
  	"community_notices_id" uuid,
  	"services_id" uuid,
  	"bulletins_id" uuid,
  	"volunteer_activities_id" uuid,
  	"support_requests_id" uuid,
  	"media_id" uuid
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"center_name" varchar DEFAULT 'Centro de acopio PLs al llamado' NOT NULL,
  	"address" varchar DEFAULT 'Pereira, Risaralda · Dirección por confirmar' NOT NULL,
  	"hours" varchar DEFAULT 'Lun — Sáb · 8:00 a.m. — 6:00 p.m.' NOT NULL,
  	"center_status" "enum_site_settings_center_status" DEFAULT 'abierto' NOT NULL,
  	"donation_instructions" varchar DEFAULT 'Trae los recursos limpios, separados y marcados por categoría. Antes de salir, revisa la lista de necesidades urgentes.' NOT NULL,
  	"hero_message" varchar DEFAULT 'Estamos coordinando la recepción, organización y distribución de ayudas para las comunidades afectadas.' NOT NULL,
  	"phone" varchar DEFAULT '300 000 0000' NOT NULL,
  	"last_operational_update" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "distributions_evidence" ADD CONSTRAINT "distributions_evidence_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "distributions_evidence" ADD CONSTRAINT "distributions_evidence_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "distribution_evidence" ADD CONSTRAINT "distribution_evidence_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "distribution_evidence" ADD CONSTRAINT "distribution_evidence_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "community_notices" ADD CONSTRAINT "community_notices_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_aid_intakes_fk" FOREIGN KEY ("aid_intakes_id") REFERENCES "public"."aid_intakes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_resources_fk" FOREIGN KEY ("resources_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_needs_fk" FOREIGN KEY ("needs_id") REFERENCES "public"."needs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_distributions_fk" FOREIGN KEY ("distributions_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_distribution_evidence_fk" FOREIGN KEY ("distribution_evidence_id") REFERENCES "public"."distribution_evidence"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_announcements_fk" FOREIGN KEY ("announcements_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_community_notices_fk" FOREIGN KEY ("community_notices_id") REFERENCES "public"."community_notices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bulletins_fk" FOREIGN KEY ("bulletins_id") REFERENCES "public"."bulletins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_volunteer_activities_fk" FOREIGN KEY ("volunteer_activities_id") REFERENCES "public"."volunteer_activities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_support_requests_fk" FOREIGN KEY ("support_requests_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_registered_by_user_id_idx" ON "users" USING btree ("registered_by_user_id");
  CREATE INDEX "users_updated_by_user_id_idx" ON "users" USING btree ("updated_by_user_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "aid_intakes_received_at_idx" ON "aid_intakes" USING btree ("received_at");
  CREATE INDEX "aid_intakes_status_idx" ON "aid_intakes" USING btree ("status");
  CREATE INDEX "aid_intakes_public_visible_idx" ON "aid_intakes" USING btree ("public_visible");
  CREATE INDEX "aid_intakes_featured_idx" ON "aid_intakes" USING btree ("featured");
  CREATE INDEX "aid_intakes_registered_by_user_id_idx" ON "aid_intakes" USING btree ("registered_by_user_id");
  CREATE INDEX "aid_intakes_updated_by_user_id_idx" ON "aid_intakes" USING btree ("updated_by_user_id");
  CREATE INDEX "aid_intakes_updated_at_idx" ON "aid_intakes" USING btree ("updated_at");
  CREATE INDEX "aid_intakes_created_at_idx" ON "aid_intakes" USING btree ("created_at");
  CREATE INDEX "resources_status_idx" ON "resources" USING btree ("status");
  CREATE INDEX "resources_public_visible_idx" ON "resources" USING btree ("public_visible");
  CREATE INDEX "resources_featured_idx" ON "resources" USING btree ("featured");
  CREATE INDEX "resources_registered_by_user_id_idx" ON "resources" USING btree ("registered_by_user_id");
  CREATE INDEX "resources_updated_by_user_id_idx" ON "resources" USING btree ("updated_by_user_id");
  CREATE INDEX "resources_updated_at_idx" ON "resources" USING btree ("updated_at");
  CREATE INDEX "resources_created_at_idx" ON "resources" USING btree ("created_at");
  CREATE INDEX "needs_status_idx" ON "needs" USING btree ("status");
  CREATE INDEX "needs_public_visible_idx" ON "needs" USING btree ("public_visible");
  CREATE INDEX "needs_featured_idx" ON "needs" USING btree ("featured");
  CREATE INDEX "needs_registered_by_user_id_idx" ON "needs" USING btree ("registered_by_user_id");
  CREATE INDEX "needs_updated_by_user_id_idx" ON "needs" USING btree ("updated_by_user_id");
  CREATE INDEX "needs_updated_at_idx" ON "needs" USING btree ("updated_at");
  CREATE INDEX "needs_created_at_idx" ON "needs" USING btree ("created_at");
  CREATE INDEX "distributions_evidence_order_idx" ON "distributions_evidence" USING btree ("_order");
  CREATE INDEX "distributions_evidence_parent_id_idx" ON "distributions_evidence" USING btree ("_parent_id");
  CREATE INDEX "distributions_evidence_image_idx" ON "distributions_evidence" USING btree ("image_id");
  CREATE INDEX "distributions_date_idx" ON "distributions" USING btree ("date");
  CREATE INDEX "distributions_status_idx" ON "distributions" USING btree ("status");
  CREATE INDEX "distributions_public_visible_idx" ON "distributions" USING btree ("public_visible");
  CREATE INDEX "distributions_registered_by_user_id_idx" ON "distributions" USING btree ("registered_by_user_id");
  CREATE INDEX "distributions_updated_by_user_id_idx" ON "distributions" USING btree ("updated_by_user_id");
  CREATE INDEX "distributions_updated_at_idx" ON "distributions" USING btree ("updated_at");
  CREATE INDEX "distributions_created_at_idx" ON "distributions" USING btree ("created_at");
  CREATE INDEX "distribution_evidence_distribution_idx" ON "distribution_evidence" USING btree ("distribution_id");
  CREATE INDEX "distribution_evidence_image_idx" ON "distribution_evidence" USING btree ("image_id");
  CREATE INDEX "distribution_evidence_status_idx" ON "distribution_evidence" USING btree ("status");
  CREATE INDEX "distribution_evidence_public_visible_idx" ON "distribution_evidence" USING btree ("public_visible");
  CREATE INDEX "distribution_evidence_published_at_idx" ON "distribution_evidence" USING btree ("published_at");
  CREATE INDEX "distribution_evidence_registered_by_user_id_idx" ON "distribution_evidence" USING btree ("registered_by_user_id");
  CREATE INDEX "distribution_evidence_updated_by_user_id_idx" ON "distribution_evidence" USING btree ("updated_by_user_id");
  CREATE INDEX "distribution_evidence_updated_at_idx" ON "distribution_evidence" USING btree ("updated_at");
  CREATE INDEX "distribution_evidence_created_at_idx" ON "distribution_evidence" USING btree ("created_at");
  CREATE INDEX "announcements_status_idx" ON "announcements" USING btree ("status");
  CREATE INDEX "announcements_featured_idx" ON "announcements" USING btree ("featured");
  CREATE INDEX "announcements_public_visible_idx" ON "announcements" USING btree ("public_visible");
  CREATE INDEX "announcements_published_at_idx" ON "announcements" USING btree ("published_at");
  CREATE INDEX "announcements_registered_by_user_id_idx" ON "announcements" USING btree ("registered_by_user_id");
  CREATE INDEX "announcements_updated_by_user_id_idx" ON "announcements" USING btree ("updated_by_user_id");
  CREATE INDEX "announcements_updated_at_idx" ON "announcements" USING btree ("updated_at");
  CREATE INDEX "announcements_created_at_idx" ON "announcements" USING btree ("created_at");
  CREATE INDEX "community_notices_image_idx" ON "community_notices" USING btree ("image_id");
  CREATE INDEX "community_notices_status_idx" ON "community_notices" USING btree ("status");
  CREATE INDEX "community_notices_featured_idx" ON "community_notices" USING btree ("featured");
  CREATE INDEX "community_notices_public_visible_idx" ON "community_notices" USING btree ("public_visible");
  CREATE INDEX "community_notices_published_at_idx" ON "community_notices" USING btree ("published_at");
  CREATE INDEX "community_notices_registered_by_user_id_idx" ON "community_notices" USING btree ("registered_by_user_id");
  CREATE INDEX "community_notices_updated_by_user_id_idx" ON "community_notices" USING btree ("updated_by_user_id");
  CREATE INDEX "community_notices_updated_at_idx" ON "community_notices" USING btree ("updated_at");
  CREATE INDEX "community_notices_created_at_idx" ON "community_notices" USING btree ("created_at");
  CREATE INDEX "services_status_idx" ON "services" USING btree ("status");
  CREATE INDEX "services_public_visible_idx" ON "services" USING btree ("public_visible");
  CREATE INDEX "services_published_at_idx" ON "services" USING btree ("published_at");
  CREATE INDEX "services_registered_by_user_id_idx" ON "services" USING btree ("registered_by_user_id");
  CREATE INDEX "services_updated_by_user_id_idx" ON "services" USING btree ("updated_by_user_id");
  CREATE INDEX "services_updated_at_idx" ON "services" USING btree ("updated_at");
  CREATE INDEX "services_created_at_idx" ON "services" USING btree ("created_at");
  CREATE INDEX "bulletins_status_idx" ON "bulletins" USING btree ("status");
  CREATE INDEX "bulletins_featured_idx" ON "bulletins" USING btree ("featured");
  CREATE INDEX "bulletins_public_visible_idx" ON "bulletins" USING btree ("public_visible");
  CREATE INDEX "bulletins_published_at_idx" ON "bulletins" USING btree ("published_at");
  CREATE INDEX "bulletins_registered_by_user_id_idx" ON "bulletins" USING btree ("registered_by_user_id");
  CREATE INDEX "bulletins_updated_by_user_id_idx" ON "bulletins" USING btree ("updated_by_user_id");
  CREATE INDEX "bulletins_updated_at_idx" ON "bulletins" USING btree ("updated_at");
  CREATE INDEX "bulletins_created_at_idx" ON "bulletins" USING btree ("created_at");
  CREATE INDEX "volunteer_activities_date_idx" ON "volunteer_activities" USING btree ("date");
  CREATE INDEX "volunteer_activities_status_idx" ON "volunteer_activities" USING btree ("status");
  CREATE INDEX "volunteer_activities_public_visible_idx" ON "volunteer_activities" USING btree ("public_visible");
  CREATE INDEX "volunteer_activities_registered_by_user_id_idx" ON "volunteer_activities" USING btree ("registered_by_user_id");
  CREATE INDEX "volunteer_activities_updated_by_user_id_idx" ON "volunteer_activities" USING btree ("updated_by_user_id");
  CREATE INDEX "volunteer_activities_updated_at_idx" ON "volunteer_activities" USING btree ("updated_at");
  CREATE INDEX "volunteer_activities_created_at_idx" ON "volunteer_activities" USING btree ("created_at");
  CREATE INDEX "support_requests_status_idx" ON "support_requests" USING btree ("status");
  CREATE INDEX "support_requests_registered_by_user_id_idx" ON "support_requests" USING btree ("registered_by_user_id");
  CREATE INDEX "support_requests_updated_by_user_id_idx" ON "support_requests" USING btree ("updated_by_user_id");
  CREATE INDEX "support_requests_updated_at_idx" ON "support_requests" USING btree ("updated_at");
  CREATE INDEX "support_requests_created_at_idx" ON "support_requests" USING btree ("created_at");
  CREATE INDEX "media_registered_by_user_id_idx" ON "media" USING btree ("registered_by_user_id");
  CREATE INDEX "media_updated_by_user_id_idx" ON "media" USING btree ("updated_by_user_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs" USING btree ("occurred_at");
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_source_idx" ON "audit_logs" USING btree ("source");
  CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");
  CREATE INDEX "audit_logs_entity_slug_idx" ON "audit_logs" USING btree ("entity_slug");
  CREATE INDEX "audit_logs_document_id_idx" ON "audit_logs" USING btree ("document_id");
  CREATE INDEX "audit_logs_success_idx" ON "audit_logs" USING btree ("success");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  CREATE INDEX "actorId_occurredAt_idx" ON "audit_logs" USING btree ("actor_id","occurred_at");
  CREATE INDEX "entitySlug_occurredAt_idx" ON "audit_logs" USING btree ("entity_slug","occurred_at");
  CREATE INDEX "action_occurredAt_idx" ON "audit_logs" USING btree ("action","occurred_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_aid_intakes_id_idx" ON "payload_locked_documents_rels" USING btree ("aid_intakes_id");
  CREATE INDEX "payload_locked_documents_rels_resources_id_idx" ON "payload_locked_documents_rels" USING btree ("resources_id");
  CREATE INDEX "payload_locked_documents_rels_needs_id_idx" ON "payload_locked_documents_rels" USING btree ("needs_id");
  CREATE INDEX "payload_locked_documents_rels_distributions_id_idx" ON "payload_locked_documents_rels" USING btree ("distributions_id");
  CREATE INDEX "payload_locked_documents_rels_distribution_evidence_id_idx" ON "payload_locked_documents_rels" USING btree ("distribution_evidence_id");
  CREATE INDEX "payload_locked_documents_rels_announcements_id_idx" ON "payload_locked_documents_rels" USING btree ("announcements_id");
  CREATE INDEX "payload_locked_documents_rels_community_notices_id_idx" ON "payload_locked_documents_rels" USING btree ("community_notices_id");
  CREATE INDEX "payload_locked_documents_rels_services_id_idx" ON "payload_locked_documents_rels" USING btree ("services_id");
  CREATE INDEX "payload_locked_documents_rels_bulletins_id_idx" ON "payload_locked_documents_rels" USING btree ("bulletins_id");
  CREATE INDEX "payload_locked_documents_rels_volunteer_activities_id_idx" ON "payload_locked_documents_rels" USING btree ("volunteer_activities_id");
  CREATE INDEX "payload_locked_documents_rels_support_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("support_requests_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "aid_intakes" CASCADE;
  DROP TABLE "resources" CASCADE;
  DROP TABLE "needs" CASCADE;
  DROP TABLE "distributions_evidence" CASCADE;
  DROP TABLE "distributions" CASCADE;
  DROP TABLE "distribution_evidence" CASCADE;
  DROP TABLE "announcements" CASCADE;
  DROP TABLE "community_notices" CASCADE;
  DROP TABLE "services" CASCADE;
  DROP TABLE "bulletins" CASCADE;
  DROP TABLE "volunteer_activities" CASCADE;
  DROP TABLE "support_requests" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_aid_intakes_category";
  DROP TYPE "public"."enum_aid_intakes_source_type";
  DROP TYPE "public"."enum_aid_intakes_status";
  DROP TYPE "public"."enum_resources_category";
  DROP TYPE "public"."enum_resources_status";
  DROP TYPE "public"."enum_needs_category";
  DROP TYPE "public"."enum_needs_priority";
  DROP TYPE "public"."enum_needs_status";
  DROP TYPE "public"."enum_distributions_status";
  DROP TYPE "public"."enum_distribution_evidence_source_type";
  DROP TYPE "public"."enum_distribution_evidence_status";
  DROP TYPE "public"."enum_announcements_type";
  DROP TYPE "public"."enum_announcements_status";
  DROP TYPE "public"."enum_community_notices_category";
  DROP TYPE "public"."enum_community_notices_status";
  DROP TYPE "public"."enum_services_type";
  DROP TYPE "public"."enum_services_status";
  DROP TYPE "public"."enum_bulletins_status";
  DROP TYPE "public"."enum_volunteer_activities_status";
  DROP TYPE "public"."enum_support_requests_help_type";
  DROP TYPE "public"."enum_support_requests_request_type";
  DROP TYPE "public"."enum_support_requests_quantity_unit";
  DROP TYPE "public"."enum_support_requests_status";
  DROP TYPE "public"."enum_audit_logs_action";
  DROP TYPE "public"."enum_audit_logs_source";
  DROP TYPE "public"."enum_audit_logs_entity_type";
  DROP TYPE "public"."enum_site_settings_center_status";`)
}
