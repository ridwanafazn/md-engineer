export const DOC_TYPES = [
  "PRD",
  "DESIGN",
  "REQUIREMENTS",
  "FEATURES",
  "USER_FLOW",
  "DATABASE",
  "API",
  "BUSINESS_RULES",
  "ARCHITECTURE",
  "SECURITY",
  "TESTING",
  "ROADMAP",
  "DECISIONS",
  "TASKS",
  "README",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_LABELS: Record<DocType, string> = {
  PRD: "Product Requirements",
  DESIGN: "Design & UX",
  REQUIREMENTS: "Requirements",
  FEATURES: "Features",
  USER_FLOW: "User Flow",
  DATABASE: "Database",
  API: "API Contract",
  BUSINESS_RULES: "Business Rules",
  ARCHITECTURE: "Architecture",
  SECURITY: "Security",
  TESTING: "Testing",
  ROADMAP: "Roadmap",
  DECISIONS: "Decisions",
  TASKS: "Tasks",
  README: "README",
};

export type ProjectStatus =
  | "intake"
  | "analyzed"
  | "interview"
  | "planned"
  | "generating"
  | "ready"
  | "archived";

export type DocumentStatus = "draft" | "generating" | "verified" | "stale";

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ProjectAnalysis = {
  summary: string;
  problem: string;
  targetUsers: string[];
  roles: { name: string; description: string; permissions: string[] }[];
  features: { name: string; description: string; priority: "mvp" | "later" }[];
  businessModel?: string;
  complexity: "simple" | "medium" | "complex";
  suggestedDocs: DocType[];
  risks: string[];
  assumptions: string[];
};

export type InterviewQuestion = {
  id: string;
  question: string;
  options: { value: string; label: string; consequence?: string }[];
  allowCustom: boolean;
  rationale: string;
  dependsOn?: { questionId: string; value: string };
};

export type StackRecommendation = {
  frontend: string;
  backend: string;
  database: string;
  auth: string;
  storage?: string;
  payment?: string;
  deployment: string;
  reasoning: string;
  alternatives: { layer: string; option: string; tradeoff: string }[];
};

export type DocPlanItem = {
  type: DocType;
  title: string;
  purpose: string;
  dependsOn: DocType[];
  sections: string[];
};

export type SpecField = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type SpecEntity = {
  name: string;
  description: string;
  fields: SpecField[];
};

export type SpecEndpoint = {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth: boolean;
  description: string;
  request: string;
  response: string;
};

export type SpecRequirement = {
  id: string;
  statement: string;
  priority: "mvp" | "later";
  acceptance: string[];
};

export type SpecFlow = {
  name: string;
  actor: string;
  steps: string[];
};

export type SpecBusinessRule = {
  id: string;
  rule: string;
  consequence: string;
};

export type SpecDecision = {
  title: string;
  decision: string;
  rationale: string;
};

export type SpecModel = {
  project: {
    name: string;
    summary: string;
    stack: Record<string, string>;
  };
  roles: { name: string; description: string; permissions: string[] }[];
  entities: SpecEntity[];
  endpoints: SpecEndpoint[];
  requirements: SpecRequirement[];
  flows: SpecFlow[];
  businessRules: SpecBusinessRule[];
  nonFunctional: string[];
  openQuestions: string[];
  decisions: SpecDecision[];
};

export type ImpactPlan = {
  required: boolean;
  summary: string;
  affected: {
    doc: DocType;
    sections: string[];
    instruction: string;
    reason: string;
  }[];
};

export type ChatResponse = {
  reply: string;
  impact: ImpactPlan;
};
