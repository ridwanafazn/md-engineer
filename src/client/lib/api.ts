import type {
  ImpactPlan,
  ProjectAnalysis,
  SpecModel,
  StackRecommendation,
} from "@/shared/types";

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
  specModel: SpecModel | null;
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

export type DocumentVersion = {
  id: string;
  documentId: string;
  version: number;
  contentMd: string;
  reason: string;
  createdAt: string;
};

export type ChatRow = {
  id: string;
  projectId: string;
  role: "user" | "assistant" | "system";
  content: string;
  impactPlan: ImpactPlan | null;
  createdAt: string;
};

export type ProjectDetail = {
  project: Project;
  documents: DocumentRow[];
  interview: InterviewRow[];
};

export type ShareLink = {
  id: string;
  projectId: string;
  token: string;
  url: string;
  createdAt: string;
  revokedAt: string | null;
};

export type SharedProject = {
  project: {
    id: string;
    name: string;
    slug: string;
    idea: string;
    language: string;
    updatedAt: string;
  };
  documents: DocumentRow[];
  link: { createdAt: string };
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
  getProject: (id: string, meta = false) =>
    request<ProjectDetail>(`/api/projects/${id}${meta ? "?meta=1" : ""}`),
  getDocument: (id: string, type: string) =>
    request<{ document: DocumentRow }>(`/api/projects/${id}/documents/${type}`),
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
  updateDocumentStatus: (id: string, type: string, status: string) =>
    request<{ document: DocumentRow }>(`/api/projects/${id}/documents/${type}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  listVersions: (id: string, type: string) =>
    request<{ versions: DocumentVersion[]; currentVersion: number }>(
      `/api/projects/${id}/documents/${type}/versions`,
    ),
  restoreVersion: (id: string, type: string, version: number) =>
    request<{ document: DocumentRow }>(`/api/projects/${id}/documents/${type}/restore`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),

  listChat: (id: string) => request<{ messages: ChatRow[] }>(`/api/projects/${id}/chat`),
  saveChatMessage: (
    id: string,
    input: { role: "user" | "assistant" | "system"; content: string; impactPlan?: ImpactPlan },
  ) =>
    request<{ message: ChatRow }>(`/api/projects/${id}/chat`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  createShare: (id: string) =>
    request<{ link: ShareLink }>(`/api/projects/${id}/share`, { method: "POST" }),
  listShares: (id: string) => request<{ links: ShareLink[] }>(`/api/projects/${id}/share`),
  revokeShare: (id: string, linkId: string) =>
    request<{ link: ShareLink }>(`/api/projects/${id}/share/${linkId}/revoke`, {
      method: "POST",
    }),
  getSharedProject: (token: string) => request<SharedProject>(`/api/share/${token}`),
  getSharedDocument: (token: string, type: string) =>
    request<{ document: DocumentRow }>(`/api/share/${token}/documents/${type}`),

  commitGithub: (
    id: string,
    input: { repo: string; branch: string; token: string; pathPrefix?: string },
  ) =>
    request<{ commitSha: string; url: string; files: number }>(
      `/api/projects/${id}/github/commit`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

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
