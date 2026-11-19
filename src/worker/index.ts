import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { documentVersions, documents, interviewQuestions, projects } from "../db/schema";
import { DOC_TYPES, type DocType } from "../shared/types";

type Bindings = {
  DATABASE_URL?: string;
  OPENCODE_API_KEY?: string;
  OPENCODE_BASE_URL?: string;
  OPENCODE_MODEL?: string;
  OPENCODE_REASONING_EFFORT?: string;
  MDZS_PASSCODE?: string;
  MDZS_SESSION_SECRET?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_COOKIE = "mdzs_session";
const SESSION_DAYS = 30;

const docTypeSchema = z.enum([...DOC_TYPES] as [DocType, ...DocType[]]);

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(secret: string, payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

async function createSession(secret: string): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 })),
  );
  const signature = toBase64Url(await hmac(secret, payload));
  return `${payload}.${signature}`;
}

async function verifySession(token: string, secret: string): Promise<boolean> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = toBase64Url(await hmac(secret, payload));
  if (!constantTimeEqual(encoder.encode(signature), encoder.encode(expected))) return false;
  try {
    const data = JSON.parse(decoder.decode(fromBase64Url(payload))) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

async function verifyPasscode(input: string, expected: string | undefined): Promise<boolean> {
  if (!expected) return false;
  return constantTimeEqual(await sha256(input), await sha256(expected));
}

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    app: "mdzs",
    db: Boolean(c.env.DATABASE_URL),
    ai: Boolean(c.env.OPENCODE_API_KEY),
  }),
);

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ passcode: z.string().min(1).max(512) }).safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
  if (!c.env.MDZS_SESSION_SECRET || !c.env.MDZS_PASSCODE) {
    return c.json({ error: "auth_not_configured" }, 503);
  }
  if (!(await verifyPasscode(parsed.data.passcode, c.env.MDZS_PASSCODE))) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const token = await createSession(c.env.MDZS_SESSION_SECRET);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return c.json({ ok: true });
});

app.post("/api/auth/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path === "/api/health" || path === "/api/auth/login") return next();
  const token = getCookie(c, SESSION_COOKIE);
  if (!token || !c.env.MDZS_SESSION_SECRET || !(await verifySession(token, c.env.MDZS_SESSION_SECRET))) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
});

app.get("/api/auth/me", (c) => c.json({ ok: true }));

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "project"}-${crypto.randomUUID().slice(0, 6)}`;
}

const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  idea: z.string().min(10).max(50_000),
  language: z.enum(["id", "en"]).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  idea: z.string().min(10).max(50_000).optional(),
  status: z.string().min(1).max(40).optional(),
  language: z.enum(["id", "en"]).optional(),
  analysis: z.unknown().optional(),
  stack: z.unknown().optional(),
  docPlan: z.unknown().optional(),
  specModel: z.unknown().optional(),
});

const upsertDocumentSchema = z.object({
  type: docTypeSchema,
  title: z.string().min(1).max(160),
  contentMd: z.string().default(""),
  status: z.enum(["draft", "generating", "verified", "stale"]).optional(),
});

app.get("/api/projects", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const db = getDb(c.env.DATABASE_URL);
  const rows = await db.select().from(projects).orderBy(desc(projects.updatedAt));
  return c.json({ projects: rows });
});

app.post("/api/projects", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const parsed = createProjectSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [project] = await db
    .insert(projects)
    .values({
      name: parsed.data.name,
      slug: slugify(parsed.data.name),
      idea: parsed.data.idea,
      language: parsed.data.language ?? "id",
    })
    .returning();
  return c.json({ project }, 201);
});

app.get("/api/projects/:id", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const db = getDb(c.env.DATABASE_URL);
  const [project] = await db.select().from(projects).where(eq(projects.id, c.req.param("id")));
  if (!project) return c.json({ error: "not_found" }, 404);
  const docs = await db.select().from(documents).where(eq(documents.projectId, project.id));
  const interview = await db
    .select()
    .from(interviewQuestions)
    .where(eq(interviewQuestions.projectId, project.id))
    .orderBy(interviewQuestions.position);
  return c.json({ project, documents: docs, interview });
});

const interviewQuestionInput = z.object({
  id: z.string().min(1).max(80),
  question: z.string().min(1).max(2_000),
  options: z
    .array(
      z.object({
        value: z.string().min(1).max(200),
        label: z.string().min(1).max(400),
        consequence: z.string().max(1_000).optional(),
      }),
    )
    .max(8)
    .default([]),
  allowCustom: z.boolean().default(true),
  rationale: z.string().max(2_000).default(""),
  dependsOn: z.unknown().optional(),
});

app.get("/api/projects/:id/interview", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const db = getDb(c.env.DATABASE_URL);
  const rows = await db
    .select()
    .from(interviewQuestions)
    .where(eq(interviewQuestions.projectId, c.req.param("id")))
    .orderBy(interviewQuestions.position);
  return c.json({ questions: rows });
});

app.put("/api/projects/:id/interview", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const parsed = z
    .object({ questions: z.array(interviewQuestionInput).min(1).max(12) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request", details: parsed.error.flatten() }, 400);

  const projectId = c.req.param("id");
  const db = getDb(c.env.DATABASE_URL);
  await db.delete(interviewQuestions).where(eq(interviewQuestions.projectId, projectId));
  const rows = await db
    .insert(interviewQuestions)
    .values(
      parsed.data.questions.map((question, index) => ({
        projectId,
        position: index,
        question: question.question,
        options: question.options,
        allowCustom: question.allowCustom,
        rationale: question.rationale,
        dependsOn: question.dependsOn ?? null,
      })),
    )
    .returning();
  return c.json({ questions: rows }, 201);
});

app.patch("/api/projects/:id/interview/:questionId", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const parsed = z
    .object({ answer: z.string().min(1).max(10_000) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [question] = await db
    .update(interviewQuestions)
    .set({ answer: parsed.data.answer, answeredAt: new Date() })
    .where(
      and(
        eq(interviewQuestions.id, c.req.param("questionId")),
        eq(interviewQuestions.projectId, c.req.param("id")),
      ),
    )
    .returning();
  if (!question) return c.json({ error: "not_found" }, 404);
  return c.json({ question });
});

app.patch("/api/projects/:id", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const parsed = updateProjectSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [project] = await db
    .update(projects)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(projects.id, c.req.param("id")))
    .returning();
  if (!project) return c.json({ error: "not_found" }, 404);
  return c.json({ project });
});

app.delete("/api/projects/:id", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const db = getDb(c.env.DATABASE_URL);
  await db.delete(projects).where(eq(projects.id, c.req.param("id")));
  return c.json({ ok: true });
});

app.get("/api/projects/:id/documents", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const db = getDb(c.env.DATABASE_URL);
  const docs = await db.select().from(documents).where(eq(documents.projectId, c.req.param("id")));
  return c.json({ documents: docs });
});

app.put("/api/projects/:id/documents", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const parsed = upsertDocumentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const projectId = c.req.param("id");
  const wordCount = parsed.data.contentMd.trim() ? parsed.data.contentMd.trim().split(/\s+/).length : 0;
  const status = parsed.data.status ?? "draft";

  const [existing] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.type, parsed.data.type)));

  if (existing) {
    if (existing.contentMd === parsed.data.contentMd) {
      const [updated] = await db
        .update(documents)
        .set({
          title: parsed.data.title,
          status,
          wordCount,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, existing.id))
        .returning();
      return c.json({ document: updated });
    }

    await db.insert(documentVersions).values({
      documentId: existing.id,
      version: existing.version,
      contentMd: existing.contentMd,
      reason: "before update",
    });

    const [updated] = await db
      .update(documents)
      .set({
        title: parsed.data.title,
        contentMd: parsed.data.contentMd,
        status,
        wordCount,
        version: existing.version + 1,
        generatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(documents.id, existing.id))
      .returning();
    return c.json({ document: updated });
  }

  const [created] = await db
    .insert(documents)
    .values({
      projectId,
      type: parsed.data.type,
      title: parsed.data.title,
      slug: `${parsed.data.type.toLowerCase()}.md`,
      contentMd: parsed.data.contentMd,
      status,
      wordCount,
      generatedAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  await db.insert(documentVersions).values({
    documentId: created.id,
    version: created.version,
    contentMd: created.contentMd,
    reason: "initial",
  });

  return c.json({ document: created });
});

app.patch("/api/projects/:id/documents/:type", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const parsed = z
    .object({ status: z.enum(["draft", "generating", "verified", "stale"]) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
  const db = getDb(c.env.DATABASE_URL);
  const [document] = await db
    .update(documents)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(
      and(
        eq(documents.projectId, c.req.param("id")),
        eq(documents.type, c.req.param("type")),
      ),
    )
    .returning();
  if (!document) return c.json({ error: "not_found" }, 404);
  return c.json({ document });
});

app.get("/api/projects/:id/documents/:type/versions", async (c) => {
  if (!c.env.DATABASE_URL) return c.json({ error: "database_not_configured" }, 503);
  const db = getDb(c.env.DATABASE_URL);
  const [document] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.projectId, c.req.param("id")),
        eq(documents.type, c.req.param("type")),
      ),
    );
  if (!document) return c.json({ error: "not_found" }, 404);

  const versions = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, document.id))
    .orderBy(desc(documentVersions.version));
  return c.json({ versions });
});

const aiSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1)
    .max(200),
  sessionId: z.string().min(1).max(200),
  stream: z.boolean().optional().default(false),
  json: z.boolean().optional().default(false),
  maxTokens: z.number().int().min(1).max(384_000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

app.post("/api/ai", async (c) => {
  const parsed = aiSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_request", details: parsed.error.flatten() }, 400);
  if (!c.env.OPENCODE_API_KEY) return c.json({ error: "ai_not_configured" }, 503);

  const base = (c.env.OPENCODE_BASE_URL || "https://opencode.ai/inference/go/openai/v1").replace(/\/+$/, "");
  const upstream = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${c.env.OPENCODE_API_KEY}`,
      "x-opencode-session": parsed.data.sessionId,
      "User-Agent": "mdzs/0.1",
    },
    body: JSON.stringify({
      model: c.env.OPENCODE_MODEL || "deepseek-v4.1-flash",
      messages: parsed.data.messages,
      stream: parsed.data.stream,
      reasoning_effort: c.env.OPENCODE_REASONING_EFFORT || "max",
      max_tokens: parsed.data.maxTokens ?? 32_768,
      ...(parsed.data.temperature != null ? { temperature: parsed.data.temperature } : {}),
      ...(parsed.data.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "text/plain" },
    });
  }

  if (parsed.data.stream) {
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  return new Response(upstream.body, {
    headers: { "Content-Type": "application/json" },
  });
});

app.notFound((c) => c.json({ error: "not_found" }, 404));

export default app;
