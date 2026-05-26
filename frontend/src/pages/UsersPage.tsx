import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import {
  apiAssignRole,
  apiCreateUser,
  apiListRoles,
  apiListUsers,
  apiSetUserActive,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import { can, P } from "../permissions";
import type { RoleDetail, UserRow } from "../types";

export function UsersPage() {
  const { token, me } = useAuth();
  const perms = me?.permissions ?? [];
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<Record<number, number>>({});
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role_id: "" as number | "" });

  const load = useCallback(async () => {
    if (!token || !can(perms, P.usersRead)) return;
    setError(null);
    try {
      const [u, r] = await Promise.all([apiListUsers(token), apiListRoles()]);
      setUsers(u);
      setRoles(r);
      const draft: Record<number, number> = {};
      for (const row of u) {
        if (row.role_id != null) draft[row.id] = row.role_id;
      }
      setRoleDraft(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    }
  }, [token, perms]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (roles.length > 0 && newUser.role_id === "") {
      setNewUser((n) => ({ ...n, role_id: roles[0]!.id }));
    }
  }, [roles, newUser.role_id]);

  if (!can(perms, P.usersRead)) {
    return <Navigate to="/" replace />;
  }

  async function onAssign(userId: number) {
    if (!token) return;
    const rid = roleDraft[userId];
    if (rid == null) return;
    try {
      await apiAssignRole(token, userId, rid);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Role update failed");
    }
  }

  async function onToggleActive(u: UserRow) {
    if (!token) return;
    try {
      await apiSetUserActive(token, u.id, !u.is_active);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function onCreateUser(e: FormEvent) {
    e.preventDefault();
    if (!token || newUser.role_id === "") return;
    try {
      await apiCreateUser(token, {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role_id: newUser.role_id,
      });
      setNewUser({ name: "", email: "", password: "", role_id: roles[0]?.id ?? "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-950">User management</h1>
        <p className="mt-1 text-sm text-ink-500">Directory, activation, and role assignment</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {can(perms, P.usersCreate) && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink-950">Add user</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={onCreateUser}>
            <input
              required
              placeholder="Name"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={newUser.name}
              onChange={(e) => setNewUser((n) => ({ ...n, name: e.target.value }))}
            />
            <input
              required
              type="email"
              placeholder="Email"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={newUser.email}
              onChange={(e) => setNewUser((n) => ({ ...n, email: e.target.value }))}
            />
            <input
              required
              type="password"
              minLength={8}
              placeholder="Password"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={newUser.password}
              onChange={(e) => setNewUser((n) => ({ ...n, password: e.target.value }))}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={newUser.role_id === "" ? "" : String(newUser.role_id)}
                onChange={(e) =>
                  setNewUser((n) => ({ ...n, role_id: e.target.value ? Number(e.target.value) : "" }))
                }
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink-950">{u.name}</div>
                  <div className="text-xs text-ink-500">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  {can(perms, P.usersAssignRole) ? (
                    <select
                      disabled={u.id === me?.id}
                      className="w-full max-w-xs rounded-lg border border-slate-200 px-2 py-1.5 text-sm disabled:opacity-50"
                      value={String(roleDraft[u.id] ?? u.role_id ?? "")}
                      onChange={(e) =>
                        setRoleDraft((d) => ({ ...d, [u.id]: Number(e.target.value) }))
                      }
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-mono text-xs text-ink-700">{u.role_name ?? "—"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {u.is_active ? "active" : "disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {can(perms, P.usersAssignRole) && (
                      <button
                        type="button"
                        disabled={u.id === me?.id}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => void onAssign(u.id)}
                      >
                        Save role
                      </button>
                    )}
                    {can(perms, P.usersUpdate) && (
                      <button
                        type="button"
                        disabled={u.id === me?.id}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => void onToggleActive(u)}
                      >
                        {u.is_active ? "Disable" : "Enable"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
