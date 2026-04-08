/**
 * apiClient — cliente HTTP para o backend Express com JWT automático.
 * Lê o token de localStorage e injeta no header Authorization.
 * Em caso de 401, limpa o token e redireciona para login.
 */

const BASE = "/api";
const TOKEN_KEY = "smpJwt7";
const REFRESH_KEY = "smpRefresh7";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(access: string, refresh?: string) {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;
  try {
    const r = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!r.ok) return false;
    const { accessToken } = await r.json();
    localStorage.setItem(TOKEN_KEY, accessToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, false);
    clearTokens();
    window.location.href = "/login";
    throw new Error("Sessão expirada");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get<T>(path: string) { return request<T>(path); },
  post<T>(path: string, body: unknown) {
    return request<T>(path, { method: "POST", body: JSON.stringify(body) });
  },
  delete<T>(path: string) { return request<T>(path, { method: "DELETE" }); },

  auth: {
    login(username: string, password: string) {
      return request<{ accessToken: string; refreshToken: string; user: { id: number; username: string; name: string; role: string; plan: string } }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ username, password }) },
        false
      );
    },
    me() { return request<{ user: { sub: number; username: string; role: string; plan: string } }>("/auth/me"); },
  },

  trades: {
    list(since?: string) {
      return request<any[]>(`/trades${since ? `?since=${since}` : ""}`);
    },
    create(trade: {
      asset: string; category: string; direction: "CALL" | "PUT"; score?: number;
      quality?: string; result: "win" | "loss"; session?: string; timeframe?: string;
      mode?: "real" | "demo"; broker?: string; notes?: string; entryTime?: string;
    }) {
      return request<any>("/trades", { method: "POST", body: JSON.stringify(trade) });
    },
    clearToday() { return request<{ ok: boolean }>("/trades/today", { method: "DELETE" }); },
    clearAll() { return request<{ ok: boolean }>("/trades/all", { method: "DELETE" }); },
  },
};
