import type { Me, ProjectRow, RoleDetail, TokenResponse, UserRow } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function authHeader(token: string | null): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    if (j && typeof j.detail === "string") return j.detail;
    if (Array.isArray(j?.detail)) return j.detail.map((x: { msg?: string }) => x.msg).join(", ");
    return res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function apiLogin(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiRegister(payload: {
  name: string;
  email: string;
  password: string;
  role_id: number;
}): Promise<UserRow> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiMe(token: string): Promise<Me> {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeader(token) });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiListUsers(token: string): Promise<UserRow[]> {
  const res = await fetch(`${API_BASE}/api/users`, { headers: authHeader(token) });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiCreateUser(
  token: string,
  body: { name: string; email: string; password: string; role_id: number },
): Promise<UserRow> {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiAssignRole(token: string, userId: number, role_id: number): Promise<UserRow> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/role`, {
    method: "PUT",
    headers: authHeader(token),
    body: JSON.stringify({ role_id }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiSetUserActive(token: string, userId: number, is_active: boolean): Promise<UserRow> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/active`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify({ is_active }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiListRoles(): Promise<RoleDetail[]> {
  const res = await fetch(`${API_BASE}/api/roles`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiListProjects(token: string): Promise<ProjectRow[]> {
  const res = await fetch(`${API_BASE}/api/projects`, { headers: authHeader(token) });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiCreateProject(
  token: string,
  body: { name: string; vehicle_platform: string; odd_type: string; status?: string },
): Promise<ProjectRow> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiUpdateProject(
  token: string,
  id: number,
  body: Partial<{
    name: string;
    vehicle_platform: string;
    odd_type: string;
    status: string;
    review_status: string;
  }>,
): Promise<ProjectRow> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: "PUT",
    headers: authHeader(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiDeleteProject(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
}
