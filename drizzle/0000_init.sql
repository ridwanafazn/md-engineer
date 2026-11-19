CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "idea" text NOT NULL,
  "status" text DEFAULT 'intake' NOT NULL,
  "language" text DEFAULT 'id' NOT NULL,
  "analysis" jsonb,
  "stack" jsonb,
  "doc_plan" jsonb,
  "spec_model" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_idx" ON "projects" ("slug");

CREATE TABLE IF NOT EXISTS "interview_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "position" integer DEFAULT 0 NOT NULL,
  "question" text NOT NULL,
  "options" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "allow_custom" boolean DEFAULT true NOT NULL,
  "rationale" text DEFAULT '' NOT NULL,
  "depends_on" jsonb,
  "answer" text,
  "answered_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "interview_project_idx" ON "interview_questions" ("project_id", "position");

CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL,
  "content_md" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "word_count" integer DEFAULT 0 NOT NULL,
  "generated_at" timestamptz,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "documents_project_type_idx" ON "documents" ("project_id", "type");
CREATE INDEX IF NOT EXISTS "documents_project_idx" ON "documents" ("project_id");

CREATE TABLE IF NOT EXISTS "document_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "content_md" text NOT NULL,
  "reason" text DEFAULT '' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "document_versions_doc_idx" ON "document_versions" ("document_id", "version");

CREATE TABLE IF NOT EXISTS "document_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "from_type" text NOT NULL,
  "to_type" text NOT NULL,
  "kind" text DEFAULT 'references' NOT NULL,
  "ref" text DEFAULT '' NOT NULL
);

CREATE INDEX IF NOT EXISTS "document_links_project_idx" ON "document_links" ("project_id");

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "impact_plan" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "chat_messages_project_idx" ON "chat_messages" ("project_id", "created_at");

CREATE TABLE IF NOT EXISTS "runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE,
  "stage" text NOT NULL,
  "document_type" text,
  "model" text DEFAULT 'deepseek-v4.1-flash' NOT NULL,
  "input_tokens" integer DEFAULT 0 NOT NULL,
  "output_tokens" integer DEFAULT 0 NOT NULL,
  "reasoning_tokens" integer DEFAULT 0 NOT NULL,
  "cost_usd" numeric(12,6) DEFAULT '0' NOT NULL,
  "duration_ms" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'ok' NOT NULL,
  "error" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "runs_project_idx" ON "runs" ("project_id", "created_at");

CREATE TABLE IF NOT EXISTS "share_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "token" text NOT NULL,
  "revoked_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "share_links_token_idx" ON "share_links" ("token");

CREATE TABLE IF NOT EXISTS "settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
