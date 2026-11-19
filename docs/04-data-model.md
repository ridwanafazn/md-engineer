# Data Model

Database: Neon Postgres 17 (project `mdzs`, region `aws-ap-southeast-1`).
ORM: Drizzle. Schema: `src/db/schema.ts`.

## 1. Entities

```
projects
  id uuid pk
  name text
  slug text unique
  idea text
  status text
  language text
  analysis jsonb
  stack jsonb
  doc_plan jsonb
  spec_model jsonb
  created_at timestamptz
  updated_at timestamptz

interview_questions
  id uuid pk
  project_id uuid fk -> projects.id
  position int
  question text
  options jsonb
  allow_custom bool
  rationale text
  depends_on jsonb
  answer text
  answered_at timestamptz
  created_at timestamptz

documents
  id uuid pk
  project_id uuid fk -> projects.id
  type text
  title text
  slug text
  content_md text
  status text
  version int
  word_count int
  generated_at timestamptz
  updated_at timestamptz
  unique(project_id, type)

document_versions
  id uuid pk
  document_id uuid fk -> documents.id
  version int
  content_md text
  reason text
  created_at timestamptz

document_links
  id uuid pk
  project_id uuid fk -> projects.id
  from_type text
  to_type text
  kind text
  ref text

chat_messages
  id uuid pk
  project_id uuid fk -> projects.id
  role text
  content text
  impact_plan jsonb
  created_at timestamptz

runs
  id uuid pk
  project_id uuid fk -> projects.id
  stage text
  document_type text
  model text
  input_tokens int
  output_tokens int
  reasoning_tokens int
  cost_usd numeric(12,6)
  duration_ms int
  status text
  error text
  created_at timestamptz

share_links
  id uuid pk
  project_id uuid fk -> projects.id
  token text unique
  revoked_at timestamptz
  created_at timestamptz

settings
  key text pk
  value jsonb
  updated_at timestamptz
```

## 2. Status

**Project:** `intake`, `analyzed`, `interview`, `planned`, `generating`, `ready`, `archived`.

**Document:** `draft`, `generating`, `verified`, `stale`.

## 3. Indexes

- `projects_slug_idx` unique.
- `documents_project_type_idx` unique.
- `documents_project_idx`.
- `interview_project_idx(project_id, position)`.
- `document_versions_doc_idx(document_id, version)`.
- `chat_messages_project_idx(project_id, created_at)`.
- `runs_project_idx(project_id, created_at)`.
- `share_links_token_idx` unique.

## 4. Aturan

- Hapus project → cascade ke dokumen, versi, chat, link, run.
- `documents.type` divalidasi di aplikasi dengan `DOC_TYPES`.
- `content_md` adalah sumber tampilan; metadata disimpan terpisah.
- Setiap update dokumen menaikkan `version` dan membuat snapshot di `document_versions`.
- `runs` mencatat biaya dan token untuk audit allowance.

## 5. Migrasi

1. `npm run db:generate` menghasilkan SQL di `drizzle/`.
2. Terapkan lewat `drizzle-kit migrate` atau Neon MCP `run_sql`.
3. Jangan mengubah schema langsung di production tanpa migrasi.
