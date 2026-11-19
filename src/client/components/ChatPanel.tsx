import { useEffect, useState } from "react";
import { DiffView } from "@/client/components/DiffView";
import { api, type ChatRow, type DocumentRow, type ProjectDetail } from "@/client/lib/api";
import { aiJson, aiStream } from "@/client/lib/ai";
import { DOC_DEPS } from "@/client/lib/docs";
import { chatImpactMessages, revisionMessages } from "@/client/lib/prompts";
import {
  DOC_LABELS,
  type ChatResponse,
  type DocType,
  type ImpactPlan,
} from "@/shared/types";

type PendingRevision = {
  type: DocType;
  oldContent: string;
  newContent: string;
  instruction: string;
};

export function ChatPanel({
  projectId,
  detail,
  selected,
  onDocsChanged,
}: {
  projectId: string;
  detail: ProjectDetail;
  selected: DocType;
  onDocsChanged: () => Promise<void>;
}) {
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [fullDocs, setFullDocs] = useState<DocumentRow[] | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [impactPlan, setImpactPlan] = useState<ImpactPlan | null>(null);
  const [pending, setPending] = useState<PendingRevision[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeType, setActiveType] = useState<DocType | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const result = await api.listChat(projectId);
        setMessages(result.messages);
      } catch {
        // chat kosong bukan error fatal
      }
    })();
  }, [projectId]);

  const activeRevision = pending.find((revision) => revision.type === activeType) ?? pending[0];

  async function ensureFullDocs(): Promise<DocumentRow[]> {
    if (fullDocs) return fullDocs;
    const docs: DocumentRow[] = [];
    for (const document of detail.documents) {
      const result = await api.getDocument(projectId, document.type);
      docs.push(result.document);
    }
    setFullDocs(docs);
    return docs;
  }

  async function send() {
    const text = input.trim();
    if (!text || sending || !detail.project.specModel) return;

    setInput("");
    setError("");
    setImpactPlan(null);
    setPending([]);
    setSending(true);

    const history = messages
      .filter((message) => message.role !== "system")
      .slice(-10)
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));

    try {
      const docs = await ensureFullDocs();
      const savedUser = await api.saveChatMessage(projectId, { role: "user", content: text });
      setMessages((previous) => [...previous, savedUser.message]);

      const response = await aiJson<ChatResponse>(
        chatImpactMessages({
          projectName: detail.project.name,
          idea: detail.project.idea,
          specModel: detail.project.specModel,
          documents: docs.map((document) => ({
            type: document.type as DocType,
            contentMd: document.contentMd,
          })),
          selectedType: selected,
          history,
          userMessage: text,
        }),
        `chat-${projectId}-${Date.now()}`,
        32_000,
      );

      const existingTypes = new Set(docs.map((document) => document.type));
      const affected = (response.impact?.affected ?? []).filter((item) =>
        existingTypes.has(item.doc),
      );
      const impact: ImpactPlan = {
        required: Boolean(response.impact?.required && affected.length > 0),
        summary: response.impact?.summary?.trim() || "Dampak perubahan pada blueprint.",
        affected,
      };
      const reply =
        response.reply?.trim() ||
        (impact.required
          ? "Saya menemukan dokumen yang perlu diperbarui. Periksa impact plan di bawah."
          : "Saya sudah menganalisis permintaan Anda.");

      const savedAssistant = await api.saveChatMessage(projectId, {
        role: "assistant",
        content: reply,
        impactPlan: impact.required ? impact : undefined,
      });
      setMessages((previous) => [...previous, savedAssistant.message]);
      setImpactPlan(impact.required ? impact : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chat gagal.");
    } finally {
      setSending(false);
    }
  }

  async function prepareRevisions() {
    if (!impactPlan || !detail.project.specModel) return;
    setPreparing(true);
    setError("");
    setProgress("Menyiapkan revisi…");
    const revisions: PendingRevision[] = [];

    try {
      const docs = await ensureFullDocs();
      for (const [index, affected] of impactPlan.affected.entries()) {
        const current = docs.find((document) => document.type === affected.doc);
        if (!current) continue;

        setProgress(
          `Menulis ${affected.doc}.md (${revisions.length + 1}/${impactPlan.affected.length})…`,
        );
        const relatedDocs = Object.fromEntries(
          DOC_DEPS[affected.doc].map((dependency) => [
            dependency,
            docs.find((document) => document.type === dependency)?.contentMd ?? "",
          ]),
        ) as Partial<Record<DocType, string>>;

        const newContent = await aiStream(
          revisionMessages({
            type: affected.doc,
            instruction: affected.instruction,
            currentContent: current.contentMd,
            specModel: detail.project.specModel,
            relatedDocs,
          }),
          `revision-${projectId}-${affected.doc}-${Date.now()}`,
          () => undefined,
          96_000,
        );

        if (newContent.trim().length < 200) {
          throw new Error(`${affected.doc}.md hasil revisi kosong.`);
        }
        revisions.push({
          type: affected.doc,
          oldContent: current.contentMd,
          newContent,
          instruction: affected.instruction,
        });
        if (!activeType) setActiveType(affected.doc);
      }

      if (revisions.length === 0) throw new Error("Tidak ada dokumen yang bisa direvisi.");
      setPending(revisions);
      setActiveType(revisions[0].type);
      setModalOpen(true);
      setProgress("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyiapkan revisi.");
      setProgress("");
    } finally {
      setPreparing(false);
    }
  }

  async function applyRevisions() {
    if (pending.length === 0) return;
    setApplying(true);
    setError("");
    setProgress("Menyimpan perubahan…");

    try {
      for (const [index, revision] of pending.entries()) {
        setProgress(`Menyimpan ${revision.type}.md (${index + 1}/${pending.length})…`);
        await api.upsertDocument(projectId, {
          type: revision.type,
          title: DOC_LABELS[revision.type],
          contentMd: revision.newContent,
          status: "draft",
        });
      }

      const summary = `Perubahan diterapkan ke ${pending.length} dokumen: ${pending
        .map((revision) => revision.type)
        .join(", ")}.`;
      const saved = await api.saveChatMessage(projectId, {
        role: "assistant",
        content: summary,
      });
      setMessages((previous) => [...previous, saved.message]);
      await onDocsChanged();
      setFullDocs(null);
      setModalOpen(false);
      setPending([]);
      setImpactPlan(null);
      setProgress("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menerapkan perubahan.");
      setProgress("");
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              AI Assistant
            </p>
            <h2 className="mt-1 text-lg font-semibold">Spec architect</h2>
          </div>
          <span className="neu-inset rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">
            {messages.length} pesan
          </span>
        </div>

        <div aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="neu-inset rounded-2xl p-4 text-sm leading-6 text-[var(--muted)]">
              Tanya apa saja tentang blueprint, atau minta perubahan seperti “tambahkan prioritas
              tugas”. Saya akan menunjukkan dokumen yang terdampak sebelum mengubahnya.
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "ml-6 bg-[var(--accent)] text-white"
                  : "mr-2 bg-white/45 text-[var(--text)]"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}

          {impactPlan ? (
            <div className="neu-inset rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Impact analysis
              </p>
              <p className="mt-2 text-xs leading-5">{impactPlan.summary}</p>
              <ul className="mt-2 space-y-1 text-[11px] text-[var(--muted)]">
                {impactPlan.affected.map((item) => (
                  <li key={`${item.doc}-${item.instruction}`}>
                    <span className="font-medium text-[var(--text)]">{item.doc}.md</span> —{" "}
                    {item.reason || item.instruction}
                  </li>
                ))}
              </ul>
              <button
                onClick={prepareRevisions}
                disabled={preparing}
                className="neu-button mt-3 w-full rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {preparing ? progress || "Menyiapkan diff…" : "Siapkan diff revisi"}
              </button>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-3">
          <div className="neu-inset flex items-end gap-2 rounded-2xl p-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={2}
              disabled={sending || preparing || applying}
              aria-label="Pesan untuk spec architect"
              placeholder="Tanya atau minta perubahan…"
              className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
            />
            <button
              onClick={() => void send()}
              disabled={sending || preparing || applying || !input.trim()}
              aria-label="Kirim pesan"
              className="neu-button flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            >
              ↑
            </button>
          </div>
          {progress ? (
            <p role="status" className="mt-2 px-1 text-[10px] text-[var(--muted)]">
              {progress}
            </p>
          ) : null}
        </div>
      </div>

      {modalOpen && activeRevision ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-diff-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
        >
          <div className="neu flex max-h-[92vh] w-full max-w-5xl flex-col p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Diff sebelum apply
                </p>
                <h3 id="chat-diff-title" className="text-xl font-semibold">
                  Review {pending.length} dokumen
                </h3>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setPending([]);
                  setActiveType(null);
                }}
                disabled={applying}
                className="neu-button rounded-xl px-4 py-2 text-xs font-medium text-[var(--text)] disabled:opacity-50"
              >
                Batal
              </button>
            </div>

            <div className="mt-4 grid min-h-0 flex-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <nav className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
                {pending.map((revision) => (
                  <button
                    key={revision.type}
                    onClick={() => setActiveType(revision.type)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${
                      activeRevision.type === revision.type
                        ? "neu-inset font-medium text-[var(--text)]"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    {revision.type}.md
                  </button>
                ))}
              </nav>

              <div className="min-h-0 overflow-auto">
                <p className="mb-2 text-xs text-[var(--muted)]">{activeRevision.instruction}</p>
                <DiffView
                  oldText={activeRevision.oldContent}
                  newText={activeRevision.newContent}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-[var(--muted)]">
                Versi lama akan disimpan sebagai snapshot sebelum perubahan diterapkan.
              </p>
              <button
                onClick={() => void applyRevisions()}
                disabled={applying}
                className="neu-button rounded-xl px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {applying ? progress || "Menerapkan…" : `Terapkan ke ${pending.length} dokumen`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
