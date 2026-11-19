import type { ProjectAnalysis, StackRecommendation } from "@/shared/types";

export type Project = {
  id: string;
  name: string;
  slug: string;
  idea: string;
  status: string;
  language: string;
  analysis: ProjectAnalysis | null;
  stack: StackRecommendation | null;
  docPlan: unknown;
  specModel: unknown;
  createdAt: string;
  updatedAt: string;
};

export type InterviewRow = {
  id: string;
  projectId: string;
  position: number;
  question: string;
  options: { value: string; label: string; consequence?: string }[];
  allowCustom: boolean;
  rationale: string;
  answer: string | null;
  answeredAt: string | null;
};

export type DocumentRow = {
  id: string;
  projectId: string;
  type: string;
  title: string;
  slug: string;
  contentMd: string;
  status: string;
  version: number;
  wordCount: number;
  updatedAt: string;
};

export type ProjectDetail = {
  project: Project;
  documents: DocumentRow[];
  interview: InterviewRow[];
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request gagal (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  me: () => request<{ ok: boolean }>("/api/auth/me"),
  login: (passcode: string) =>
    request<{ ok: boolean }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ passcode }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  listProjects: () => request<{ projects: Project[] }>("/api/projects"),
  createProject: (input: { name: string; idea: string; language?: "id" | "en" }) =>
    request<{ project: Project }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getProject: (id: string) => request<ProjectDetail>(`/api/projects/${id}`),
  updateProject: (id: string, patch: Record<string, unknown>) =>
    request<{ project: Project }>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  listDocuments: (id: string) => request<{ documents: DocumentRow[] }>(`/api/projects/${id}/documents`),
  upsertDocument: (
    id: string,
    input: { type: string; title: string; contentMd: string; status?: string },
  ) =>
    request<{ document: DocumentRow }>(`/api/projects/${id}/documents`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  getInterview: (id: string) => request<{ questions: InterviewRow[] }>(`/api/projects/${id}/interview`),
  saveInterview: (
    id: string,
    questions: {
      id: string;
      question: string;
      options: { value: string; label: string; consequence?: string }[];
      allowCustom: boolean;
      rationale: string;
    }[],
  ) =>
    request<{ questions: InterviewRow[] }>(`/api/projects/${id}/interview`, {
      method: "PUT",
      body: JSON.stringify({ questions }),
    }),
  answerQuestion: (projectId: string, questionId: string, answer: string) =>
    request<{ question: InterviewRow }>(`/api/projects/${projectId}/interview/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify({ answer }),
    }),
};
