import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiListRoles, apiLogin, apiRegister } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { RoleDetail } from "../types";

export function RegisterPage() {
  const { setToken, refreshMe } = useAuth();
  const nav = useNavigate();
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void apiListRoles()
      .then((r) => {
        setRoles(r.filter((x) => x.name !== "admin"));
        const first = r.find((x) => x.name !== "admin");
        if (first) setRoleId(first.id);
      })
      .catch(() => setError("Could not load roles"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (roleId === "") {
      setError("Select a role");
      return;
    }
    setBusy(true);
    try {
      await apiRegister({
        name: name.trim(),
        email: email.trim(),
        password,
        role_id: roleId,
      });
      const t = await apiLogin(email.trim(), password);
      setToken(t.access_token);
      await refreshMe();
      nav("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-ink-950">Create account</h1>
        <p className="mt-1 text-sm text-ink-500">Self-service signup (admin role excluded)</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-ink-700" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700" htmlFor="password">
              Password (min 8)
            </label>
            <input
              id="password"
              type="password"
              minLength={8}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
              value={roleId === "" ? "" : String(roleId)}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : "")}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Register"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link className="font-medium text-accent hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
