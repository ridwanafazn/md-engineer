# Document Graph — 15 Dokumen

## 1. Nodes

| Dokumen | Isi utama | Bergantung pada |
|---|---|---|
| PRD | Visi, problem, target user, scope, metrik | — |
| DESIGN | Prinsip desain, layout, komponen, aksesibilitas | PRD |
| REQUIREMENTS | Requirement ber-ID, acceptance criteria | PRD |
| FEATURES | Daftar fitur, prioritas, status | PRD, REQUIREMENTS |
| USER_FLOW | Alur aktor, langkah, edge case | PRD, FEATURES |
| DATABASE | Entity, field, relasi, index | REQUIREMENTS, FEATURES |
| API | Endpoint, auth, request/response, error | DATABASE, USER_FLOW |
| BUSINESS_RULES | Aturan, kondisi, konsekuensi | REQUIREMENTS, USER_FLOW |
| ARCHITECTURE | Komponen, diagram, alur data, deployment | DATABASE, API, FEATURES |
| SECURITY | Auth, otorisasi, data sensitif, ancaman | ARCHITECTURE, API |
| TESTING | Strategi, unit/integration/e2e, contoh kasus | REQUIREMENTS, API |
| ROADMAP | Milestone, fase, dependensi | FEATURES, TASKS |
| DECISIONS | ADR: keputusan, alternatif, konsekuensi | ARCHITECTURE |
| TASKS | Backlog implementasi, estimasi, urutan | FEATURES, ROADMAP |
| README | Ringkasan proyek, cara jalan, struktur | Semua |

## 2. Edges

```
PRD -> DESIGN
PRD -> REQUIREMENTS
PRD -> FEATURES
REQUIREMENTS -> FEATURES
REQUIREMENTS -> DATABASE
REQUIREMENTS -> BUSINESS_RULES
REQUIREMENTS -> TESTING
FEATURES -> USER_FLOW
FEATURES -> DATABASE
FEATURES -> ROADMAP
FEATURES -> TASKS
USER_FLOW -> API
USER_FLOW -> BUSINESS_RULES
DATABASE -> API
DATABASE -> ARCHITECTURE
API -> ARCHITECTURE
API -> SECURITY
API -> TESTING
ARCHITECTURE -> SECURITY
ARCHITECTURE -> DECISIONS
ROADMAP -> TASKS
```

## 3. Urutan Generasi

**Wave 1 — Core (harus stabil dulu):**

1. PRD
2. REQUIREMENTS
3. FEATURES
4. DESIGN
5. USER_FLOW
6. DATABASE
7. API
8. ARCHITECTURE

**Wave 2 — Delivery & governance:**

9. BUSINESS_RULES
10. SECURITY
11. TESTING
12. ROADMAP
13. DECISIONS
14. TASKS
15. README

## 4. Canonical Elements

`SpecModel` menyimpan:

- `roles[]`
- `entities[]` (nama, field, tipe, relasi)
- `endpoints[]` (method, path, auth, request, response)
- `requirements[]` (`REQ-001`, statement, priority, acceptance)
- `flows[]`
- `businessRules[]`
- `nonFunctional[]`
- `openQuestions[]`
- `decisions[]`

Semua dokumen harus memakai ID dan nama dari model ini.

## 5. Aturan Lint

### Deterministik

- `REQ-*` unik dan berpola.
- Endpoint yang disebut di dokumen lain ada di `API`.
- Entity yang disebut ada di `DATABASE`.
- Role konsisten.
- Mermaid block valid.
- Tidak ada `TBD` di luar `Open Questions`.
- Heading wajib ada.

### Semantik (LLM)

- Requirement tanpa acceptance criteria.
- Flow yang mereferensikan fitur yang tidak ada.
- Aturan bisnis yang bertentangan.
- Dokumen yang membahas isi dokumen lain.

## 6. Impact Propagation

Saat user mengubah satu bagian:

1. Hitung kandidat dari graph (deterministik).
2. LLM memfilter dan menjelaskan dampak.
3. Tampilkan diff per dokumen.
4. User approve.
5. Update `SpecModel` + dokumen + snapshot versi.

Contoh:

- Ubah role/permission → PRD, REQUIREMENTS, USER_FLOW, API, SECURITY.
- Tambah entity → DATABASE, API, ARCHITECTURE, TESTING.
- Ubah endpoint → API, ARCHITECTURE, TESTING, TASKS.
