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
export type Citation = { document_id: string; document_name: string; page: number | null; chunk_id: string; score?: number };

function token(): string | null { return typeof window === "undefined" ? null : localStorage.getItem("accessToken"); }
export function saveTokens(access: string, refresh: string): void { localStorage.setItem("accessToken", access); localStorage.setItem("refreshToken", refresh); }
export function clearTokens(): void { localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken"); }
export function isAuthenticated(): boolean { return Boolean(token()); }

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

export function errorMessage(error: unknown): string {
  const details = (error as ApiError)?.error?.details;
  if (!details) return "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.";
  if (typeof details === "string") return details;
  const first = Object.values(details)[0];
  return Array.isArray(first) ? first[0] : String(first);
}

const persianNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
export function toPersianNumber(value: number): string { return persianNumber.format(value); }
export function formatBytes(value: number): string { return value < 1024 * 1024 ? `${toPersianNumber(Math.max(1, Math.round(value / 1024)))} کیلوبایت` : `${toPersianNumber(value / 1024 / 1024)} مگابایت`; }

