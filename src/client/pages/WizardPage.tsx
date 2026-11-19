import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/client/components/AppShell";
import { DocumentGenerator } from "@/client/components/DocumentGenerator";
import { api, type InterviewRow, type ProjectDetail } from "@/client/lib/api";
import { aiJson } from "@/client/lib/ai";
import {
  analysisMessages,
  interviewMessages,
  stackMessages,
  type AnsweredQuestion,
} from "@/client/lib/prompts";
import type { InterviewQuestion, ProjectAnalysis, StackRecommendation } from "@/shared/types";

type Step = "analysis" | "interview" | "stack" | "generate";

const STEPS: { id: Step; label: string; hint: string }[] = [
  { id: "analysis", label: "Analisis", hint: "Roles, fitur, kompleksitas" },
  { id: "interview", label: "Interview", hint: "3–8 pertanyaan adaptif" },
  { id: "stack", label: "Stack", hint: "Rekomendasi teknologi" },
  { id: "generate", label: "Dokumen", hint: "SpecModel + 15 dokumen" },
];

type EditableStackField =
  | "frontend"
  | "backend"
  | "database"
  | "auth"
  | "storage"
  | "payment"
  | "deployment";

const STACK_FIELDS: { key: EditableStackField; label: string }[] = [
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "database", label: "Database" },
  { key: "auth", label: "Auth" },
  { key: "storage", label: "Storage" },
  { key: "payment", label: "Payment" },
  { key: "deployment", label: "Deployment" },
];

export function WizardPage({
  projectId,
  onBack,
  onComplete,
  onLogout,
}: {
  projectId: string;
  onBack: () => void;
  onComplete: (id: string) => void;
  onLogout: () => void;
}) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("analysis");
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [questions, setQuestions] = useState<InterviewRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [stack, setStack] = useState<StackRecommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.getProject(projectId);
        setDetail(data);
        const nextAnalysis = data.project.analysis ?? null;
        const nextStack = data.project.stack ?? null;
        setAnalysis(nextAnalysis);
        setStack(nextStack);
        setQuestions(data.interview);

        const answerMap: Record<string, string> = {};
        for (const question of data.interview) {
          if (question.answer) answerMap[question.id] = question.answer;
        }
        setAnswers(answerMap);

        const firstUnanswered = data.interview.findIndex((question) => !question.answer);
        setQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);

        if (!nextAnalysis) setStep("analysis");
        else if (data.interview.length === 0 || data.interview.some((question) => !question.answer)) {
          setStep("interview");
        } else if (!nextStack) setStep("stack");
        else setStep("generate");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Gagal memuat proyek.");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const currentQuestion = questions[questionIndex];

  useEffect(() => {
    if (!currentQuestion) {
      setDraftAnswer("");
      return;
    }
    setDraftAnswer(answers[currentQuestion.id] ?? "");
  }, [currentQuestion?.id, answers]);

  const answered = useMemo<AnsweredQuestion[]>(
    () =>
      questions
        .map((question) => ({
          question: question.question,
          answer: answers[question.id] ?? "",
        }))
        .filter((item) => item.answer.trim().length > 0),
    [questions, answers],
  );

  const allAnswered = questions.length > 0 && questions.every((question) => answers[question.id]);

  async function runAnalysis() {
    if (!detail) return;
    setBusy(true);
    setError("");
    setStatus("Menganalisis ide dan memetakan roles…");
    try {
      const result = await aiJson<ProjectAnalysis>(
        analysisMessages(detail.project.idea, detail.project.language === "en" ? "en" : "id"),
        `analysis-${projectId}`,
        32_000,
      );
      setAnalysis(result);
      await api.updateProject(projectId, { analysis: result, status: "analyzed" });
      setStep("interview");
      setStatus("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analisis gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function generateQuestions() {
    if (!analysis || !detail) return;
    setBusy(true);
    setError("");
    setStatus("Menyusun pertanyaan interview yang relevan…");
    try {
      const result = await aiJson<{ questions: InterviewQuestion[] }>(
        interviewMessages(detail.project.idea, analysis),
        `interview-${projectId}`,
        32_000,
      );
      if (!result.questions?.length) throw new Error("AI tidak menghasilkan pertanyaan.");
      const saved = await api.saveInterview(projectId, result.questions);
      setQuestions(saved.questions);
      setAnswers({});
      setQuestionIndex(0);
      await api.updateProject(projectId, { status: "interview" });
      setStatus("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membuat interview.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAnswerAndNext() {
    if (!currentQuestion) return;
    const answer = draftAnswer.trim();
    if (!answer) {
      setError("Pilih opsi atau tulis jawaban terlebih dahulu.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.answerQuestion(projectId, currentQuestion.id, answer);
      const nextAnswers = { ...answers, [currentQuestion.id]: answer };
      setAnswers(nextAnswers);
      setQuestions((previous) =>
        previous.map((question) =>
          question.id === currentQuestion.id ? { ...question, answer } : question,
        ),
      );

      if (questionIndex < questions.length - 1) {
        setQuestionIndex(questionIndex + 1);
      } else {
        setStep("stack");
      }
      setStatus("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan jawaban.");
    } finally {
      setBusy(false);
    }
  }

  async function generateStack() {
    if (!analysis || !detail) return;
    setBusy(true);
    setError("");
    setStatus("Merekomendasikan tech stack…");
    try {
      const result = await aiJson<StackRecommendation>(
        stackMessages(detail.project.idea, analysis, answered),
        `stack-${projectId}`,
        16_000,
      );
      setStack(result);
      await api.updateProject(projectId, { stack: result, status: "planned" });
      setStatus("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal membuat rekomendasi stack.");
    } finally {
      setBusy(false);
    }
  }

  function updateStack(field: EditableStackField, value: string) {
    setStack((previous) => (previous ? { ...previous, [field]: value } : previous));
  }

  async function acceptStack() {
    if (!stack) return;
    setBusy(true);
    setError("");
    try {
      await api.updateProject(projectId, { stack, status: "planned" });
      setStep("generate");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal menyimpan stack.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell onLogout={onLogout} onHome={onBack}>
        <div className="neu p-6 text-sm text-[var(--muted)]">Memuat proyek…</div>
      </AppShell>
    );
  }

  if (!detail) {
    return (
      <AppShell onLogout={onLogout} onHome={onBack}>
        <div className="neu p-6 text-sm text-red-600">{error || "Proyek tidak ditemukan."}</div>
      </AppShell>
    );
  }

  return (
    <AppShell onLogout={onLogout} onHome={onBack} projectName={detail.project.name}>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="neu h-fit p-4">
          <button
            onClick={onBack}
            className="neu-button mb-4 w-full rounded-xl px-3 py-2 text-xs font-medium text-[var(--text)]"
          >
            ← Semua proyek
          </button>
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Fase 1
          </p>
          <h2 className="mt-1 px-1 text-lg font-semibold tracking-tight">Blueprint wizard</h2>

          <ol className="mt-4 space-y-2">
            {STEPS.map((item, index) => {
              const active = step === item.id;
              const done = STEPS.findIndex((candidate) => candidate.id === step) > index;
              return (
                <li key={item.id}>
                  <div
                    className={`rounded-2xl px-3 py-3 ${
                      active ? "neu-inset" : "text-[var(--muted)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                          done
                            ? "bg-emerald-500 text-white"
                            : active
                              ? "bg-[var(--accent)] text-white"
                              : "neu-inset"
                        }`}
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <p className="mt-1 pl-8 text-[11px]">{item.hint}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 rounded-2xl bg-white/30 p-3 text-[11px] leading-5 text-[var(--muted)]">
            <p className="font-medium text-[var(--text)]">Idenya</p>
            <p className="mt-1 line-clamp-6">{detail.project.idea}</p>
          </div>
        </aside>

        <main className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {status ? (
            <div className="neu-inset rounded-2xl px-4 py-3 text-sm text-[var(--muted)]">{status}</div>
          ) : null}

          {step === "analysis" ? (
            <section className="neu p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Langkah 1
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Analisis produk</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                AI memetakan roles, fitur, kompleksitas, dan dokumen yang relevan. Periksa hasilnya
                sebelum interview.
              </p>

              {!analysis ? (
                <div className="mt-6">
                  <button
                    onClick={runAnalysis}
                    disabled={busy}
                    className="neu-button rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Menganalisis…" : "Analisis ide"}
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="neu-inset rounded-2xl p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        Ringkasan
                      </h3>
                      <p className="mt-2 text-sm leading-6">{analysis.summary}</p>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{analysis.problem}</p>
                    </article>
                    <article className="neu-inset rounded-2xl p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        Kompleksitas
                      </h3>
                      <p className="mt-2 text-2xl font-semibold capitalize">{analysis.complexity}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {analysis.targetUsers.join(" · ")}
                      </p>
                      {analysis.businessModel ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          Model: {analysis.businessModel}
                        </p>
                      ) : null}
                    </article>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <article className="neu-inset rounded-2xl p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        Roles
                      </h3>
                      <ul className="mt-3 space-y-3">
                        {analysis.roles.map((role) => (
                          <li key={role.name}>
                            <p className="text-sm font-medium">{role.name}</p>
                            <p className="text-xs leading-5 text-[var(--muted)]">{role.description}</p>
                          </li>
                        ))}
                      </ul>
                    </article>
                    <article className="neu-inset rounded-2xl p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        Fitur
                      </h3>
                      <ul className="mt-3 space-y-2">
                        {analysis.features.map((feature) => (
                          <li key={feature.name} className="flex gap-2 text-sm">
                            <span
                              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                                feature.priority === "mvp" ? "bg-emerald-500" : "bg-amber-400"
                              }`}
                            />
                            <span>
                              <span className="font-medium">{feature.name}</span>
                              <span className="text-[var(--muted)]"> — {feature.description}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  </div>

                  {analysis.risks.length > 0 ? (
                    <div className="rounded-2xl bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
                      <p className="font-medium">Risiko awal</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {analysis.risks.map((risk) => (
                          <li key={risk}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setStep("interview")}
                      className="neu-button rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                    >
                      Lanjut ke interview →
                    </button>
                    <button
                      onClick={runAnalysis}
                      disabled={busy}
                      className="neu-button rounded-2xl px-5 py-3 text-sm font-medium text-[var(--text)] disabled:opacity-50"
                    >
                      Analisis ulang
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {step === "interview" ? (
            <section className="neu p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Langkah 2
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Adaptive interview</h2>

              {questions.length === 0 ? (
                <div className="mt-5">
                  <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    AI akan membuat 3–8 pertanyaan yang benar-benar mengubah arsitektur: role,
                    auth, pembayaran, data sensitif, integrasi, dan edge case.
                  </p>
                  <button
                    onClick={generateQuestions}
                    disabled={busy || !analysis}
                    className="neu-button mt-5 rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Menyusun…" : "Buat pertanyaan interview"}
                  </button>
                </div>
              ) : allAnswered ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-emerald-50/80 p-4 text-sm text-emerald-900">
                    Semua {questions.length} pertanyaan sudah dijawab.
                  </div>
                  <button
                    onClick={() => setStep("stack")}
                    className="neu-button rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                  >
                    Lanjut ke stack →
                  </button>
                </div>
              ) : currentQuestion ? (
                <div className="mt-5">
                  <div className="mb-4 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>
                      Pertanyaan {questionIndex + 1} / {questions.length}
                    </span>
                    <span>{Math.round(((questionIndex + 1) / questions.length) * 100)}%</span>
                  </div>
                  <div className="neu-inset rounded-2xl p-5">
                    <p className="text-lg font-medium leading-7">{currentQuestion.question}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{currentQuestion.rationale}</p>

                    <div className="mt-4 grid gap-2">
                      {currentQuestion.options.map((option) => {
                        const selected = draftAnswer === option.label;
                        return (
                          <button
                            key={option.value}
                            onClick={() => setDraftAnswer(option.label)}
                            className={`rounded-xl px-4 py-3 text-left text-sm transition ${
                              selected
                                ? "neu-inset font-medium text-[var(--text)]"
                                : "neu-button text-[var(--muted)]"
                            }`}
                          >
                            <span className="block">{option.label}</span>
                            {option.consequence ? (
                              <span className="mt-1 block text-[11px] opacity-70">
                                {option.consequence}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {currentQuestion.allowCustom ? (
                      <div className="mt-4">
                        <label className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          Jawaban lain
                        </label>
                        <textarea
                          value={draftAnswer}
                          onChange={(event) => setDraftAnswer(event.target.value)}
                          rows={2}
                          placeholder="Tulis jawaban sendiri…"
                          className="neu-inset w-full resize-none rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={saveAnswerAndNext}
                      disabled={busy || !draftAnswer.trim()}
                      className="neu-button rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "Menyimpan…" : questionIndex === questions.length - 1 ? "Selesai →" : "Berikutnya →"}
                    </button>
                    {questionIndex > 0 ? (
                      <button
                        onClick={() => setQuestionIndex(questionIndex - 1)}
                        className="neu-button rounded-2xl px-5 py-3 text-sm font-medium text-[var(--text)]"
                      >
                        ← Sebelumnya
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {step === "stack" ? (
            <section className="neu p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Langkah 3
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Tech stack</h2>

              {!stack ? (
                <div className="mt-5">
                  <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
                    Rekomendasi disusun dari ide, analisis, dan jawaban interview. Semua field bisa
                    diedit sebelum PRD dibuat.
                  </p>
                  <button
                    onClick={generateStack}
                    disabled={busy || !analysis}
                    className="neu-button mt-5 rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Merekomendasikan…" : "Rekomendasikan stack"}
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {STACK_FIELDS.map((field) => (
                      <label key={field.key} className="block">
                        <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          {field.label}
                        </span>
                        <input
                          value={(stack[field.key] as string | undefined) ?? ""}
                          onChange={(event) => updateStack(field.key, event.target.value)}
                          className="neu-inset w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        />
                      </label>
                    ))}
                  </div>

                  <article className="neu-inset rounded-2xl p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                      Alasan
                    </h3>
                    <p className="mt-2 text-sm leading-6">{stack.reasoning}</p>
                    {stack.alternatives?.length ? (
                      <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                        {stack.alternatives.map((alternative) => (
                          <li key={`${alternative.layer}-${alternative.option}`}>
                            <span className="font-medium text-[var(--text)]">{alternative.layer}:</span>{" "}
                            {alternative.option} — {alternative.tradeoff}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={acceptStack}
                      disabled={busy}
                      className="neu-button rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Setujui & lanjut ke dokumen →
                    </button>
                    <button
                      onClick={generateStack}
                      disabled={busy}
                      className="neu-button rounded-2xl px-5 py-3 text-sm font-medium text-[var(--text)] disabled:opacity-50"
                    >
                      Rekomendasikan ulang
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {step === "generate" ? (
            analysis && stack ? (
              <DocumentGenerator
                projectId={projectId}
                detail={detail}
                analysis={analysis}
                answers={answered}
                stack={stack}
                onComplete={onComplete}
              />
            ) : (
              <section className="neu p-6 text-sm text-[var(--muted)]">
                Selesaikan analisis dan stack terlebih dahulu.
              </section>
            )
          ) : null}
        </main>
      </div>
    </AppShell>
  );
}
