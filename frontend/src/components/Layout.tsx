import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { can, P } from "../permissions";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-accent text-white shadow-sm" : "text-ink-700 hover:bg-slate-100"
  }`;

export function Layout() {
  const { me, setToken } = useAuth();
  const perms = me?.permissions ?? [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-semibold tracking-tight text-ink-950">ADAS Validation</span>
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">RBAC</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/" className={linkClass} end>
              Dashboard
            </NavLink>
            <NavLink to="/projects" className={linkClass}>
              Projects
            </NavLink>
            {can(perms, P.usersRead) && (
              <NavLink to="/users" className={linkClass}>
                Users
              </NavLink>
            )}
            <button
              type="button"
              className="ml-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-slate-50"
              onClick={() => setToken(null)}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
