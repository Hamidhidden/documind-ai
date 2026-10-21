const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type ApiError = { error?: { details?: Record<string, string[] | string>; code?: number } };

export type Document = {
  id: string; filename: string; original_filename: string; mime_type: string; file_size: number;
  status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED"; page_count: number | null;
  word_count: number | null; created_at: string; processed_at: string | null; error_message: string;
};
export type Collection = { id: string; name: string; document_count: number; created_at: string };
export type Conversation = { id: string; title: string; document_id: string | null; message_count: number; updated_at: string };
export type Message = { id: string; role: "user" | "assistant"; content: string; sources: Citation[]; created_at: string };
export type Citation = { document_id: string; document_name: string; page: number | null; chunk_id: string; score?: number; excerpt?: string };

function token(): string | null { return typeof window === "undefined" ? null : localStorage.getItem("accessToken"); }
export function saveTokens(access: string, refresh: string): void { localStorage.setItem("accessToken", access); localStorage.setItem("refreshToken", refresh); }
export function clearTokens(): void { localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken"); }
export function isAuthenticated(): boolean { return Boolean(token()); }

function currentLocale(): string {
  try { return localStorage.getItem("locale") === "en" ? "en" : "fa"; } catch { return "fa"; }
}

let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh = typeof window === "undefined" ? null : localStorage.getItem("refreshToken");
  if (!refresh) return false;
  const response = await fetch(`${API_URL}/auth/refresh/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }) }).catch(() => null);
  if (!response?.ok) return false;
  const data = (await response.json()) as { access: string; refresh?: string };
  saveTokens(data.access, data.refresh ?? refresh);
  return true;
}

function redirectToLogin(): void {
  clearTokens();
  if (typeof window !== "undefined" && !["/login", "/register"].includes(window.location.pathname)) window.location.href = "/login";
}

export async function api<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  headers.set("Accept-Language", currentLocale());
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  // Access tokens live 15 minutes: refresh once (shared across parallel requests) and retry.
  if (response.status === 401 && token() && !retried) {
    refreshing ??= refreshAccessToken().finally(() => { refreshing = null; });
    if (await refreshing) return api<T>(path, options, true);
    redirectToLogin();
  } else if (response.status === 401 && !path.startsWith("/auth/")) {
    redirectToLogin();
  }
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw data as ApiError;
  return data as T;
}

/** Server messages arrive already translated (Accept-Language); `fallback` covers network errors. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const details = (error as ApiError)?.error?.details;
  if (!details) return fallback;
  if (typeof details === "string") return details;
  const first = Object.values(details)[0];
  return Array.isArray(first) ? first[0] : String(first);
}

export type Dashboard = {
  documents: { total: number; by_status: Partial<Record<Document["status"], number>>; by_type: Record<string, number>; storage_bytes: number; pages: number; words: number };
  collections: number; conversations: number;
  questions: { total: number; answered: number; answer_rate: number | null };
  activity: { date: string; questions: number }[];
  top_documents: { id: string; filename: string; citations: number }[];
  knowledge_gaps: { question: string; conversation_id: string; asked_at: string }[];
  knowledge_gaps_locked: boolean; knowledge_gaps_count: number;
};


export type PlanCode = "free" | "pro" | "enterprise";
export type PlanInfo = {
  code: PlanCode; purchasable: boolean; features: string[];
  prices: { monthly: number | null; yearly: number | null };
  limits: { documents: number | null; storage_mb: number | null; monthly_questions: number | null; seats: number | null };
};
export type Billing = {
  plan: PlanInfo; source: "license" | "subscription" | "trial" | "free"; ends_at: string | null;
  usage: { documents: number; storage_bytes: number; questions_this_month: number };
  catalog: PlanInfo[]; gateway: string;
  license: { customer: string; plan: PlanCode; seats: number | null; expires: string; expired: boolean } | null;
  payments: { id: string; plan: PlanCode; interval: "monthly" | "yearly"; amount_toman: number; status: "pending" | "paid" | "failed"; reference_id: string; created_at: string }[];
};
export type RadarDate = { label: string; text: string; kind: string; date: string; days_left: number; document_id: string; document_name: string };
export type RadarRisk = { clause?: string; risk?: string; severity?: "high" | "medium" | "low"; document_id: string; document_name: string };
export type Radar = { locked: boolean; upcoming: RadarDate[]; risks: RadarRisk[]; analyzed: number };
export type InsightData = {
  document_type: string; title: string; summary: string;
  parties: { name?: string; role?: string }[]; amounts: { label?: string; value?: string; currency?: string }[];
  dates: { label: string; text: string; kind: string; date: string }[];
  obligations: { party?: string; obligation?: string }[]; risks: { clause?: string; risk?: string; severity?: string }[];
};
export type Insight = { status: "PENDING" | "READY" | "FAILED" | null; data: InsightData | null; updated_at?: string };

/** True when the server refused because the workspace's plan does not include this. */
export function isPlanRequired(error: unknown): boolean { return (error as ApiError)?.error?.code === 402; }
