import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    idea: text("idea").notNull(),
    status: text("status").notNull().default("intake"),
    language: text("language").notNull().default("id"),
    analysis: jsonb("analysis"),
    stack: jsonb("stack"),
    docPlan: jsonb("doc_plan"),
    specModel: jsonb("spec_model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("projects_slug_idx").on(table.slug)],
);

export const interviewQuestions = pgTable(
  "interview_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    question: text("question").notNull(),
    options: jsonb("options").notNull().default([]),
    allowCustom: boolean("allow_custom").notNull().default(true),
    rationale: text("rationale").notNull().default(""),
    dependsOn: jsonb("depends_on"),
    answer: text("answer"),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("interview_project_idx").on(table.projectId, table.position)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    contentMd: text("content_md").notNull().default(""),
    status: text("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    wordCount: integer("word_count").notNull().default(0),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("documents_project_type_idx").on(table.projectId, table.type),
    index("documents_project_idx").on(table.projectId),
  ],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    contentMd: text("content_md").notNull(),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("document_versions_doc_idx").on(table.documentId, table.version)],
);

export const documentLinks = pgTable(
  "document_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fromType: text("from_type").notNull(),
    toType: text("to_type").notNull(),
    kind: text("kind").notNull().default("references"),
    ref: text("ref").notNull().default(""),
  },
  (table) => [index("document_links_project_idx").on(table.projectId)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    impactPlan: jsonb("impact_plan"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chat_messages_project_idx").on(table.projectId, table.createdAt)],
);

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    documentType: text("document_type"),
    model: text("model").notNull().default("deepseek-v4.1-flash"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    durationMs: integer("duration_ms").notNull().default(0),
    status: text("status").notNull().default("ok"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("runs_project_idx").on(table.projectId, table.createdAt)],
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("share_links_token_idx").on(table.token)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
