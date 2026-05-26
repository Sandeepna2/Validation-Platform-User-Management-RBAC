import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiCreateProject, apiDeleteProject, apiListProjects, apiUpdateProject } from "../api";
import { useAuth } from "../auth/AuthContext";
import { can, P } from "../permissions";
import type { ProjectRow } from "../types";

const STATUSES = ["draft", "active", "completed", "archived"];
const REVIEWS = ["pending", "approved", "rejected"];

export function ProjectsPage() {
  const { token, me } = useAuth();
  const perms = me?.permissions ?? [];
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    vehicle_platform: "",
    odd_type: "",
    status: "draft",
  });
  const [edits, setEdits] = useState<Record<number, Partial<ProjectRow>>>({});
  const [viewingProject, setViewingProject] = useState<ProjectRow | null>(null);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      setRows(await apiListProjects(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function canEditCore(p: ProjectRow): boolean {
    return can(perms, P.adminFull) || (can(perms, P.projectsUpdateOwn) && me?.id === p.created_by_id);
  }

  function canReview(): boolean {
    return can(perms, P.projectsUpdateReview);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await apiCreateProject(token, {
        name: form.name.trim(),
        vehicle_platform: form.vehicle_platform.trim(),
        odd_type: form.odd_type.trim(),
        status: form.status,
      });
      setForm({ name: "", vehicle_platform: "", odd_type: "", status: "draft" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  function field<K extends keyof ProjectRow>(p: ProjectRow, key: K): ProjectRow[K] {
    const o = edits[p.id];
    if (o && key in o && o[key] !== undefined) return o[key] as ProjectRow[K];
    return p[key];
  }

  async function saveRow(p: ProjectRow) {
    if (!token) return;
    const patch = edits[p.id];
    if (!patch || Object.keys(patch).length === 0) return;
    
    setSavingIds(prev => new Set(prev).add(p.id));
    try {
      await apiUpdateProject(token, p.id, patch);
      setEdits((e) => {
        const n = { ...e };
        delete n[p.id];
        return n;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }
  }

  async function saveReviewOnly(p: ProjectRow, review_status: string) {
    if (!token) return;
    try {
      await apiUpdateProject(token, p.id, { review_status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review update failed");
    }
  }

  async function onDelete(id: number) {
    if (!token) return;
    if (!confirm("Delete this project?")) return;
    try {
      await apiDeleteProject(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-950">Validation projects</h1>
        <p className="mt-1 text-sm text-ink-500">Portfolio, ownership, and review workflow</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {can(perms, P.projectsCreate) && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink-950">New project</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4" onSubmit={onCreate}>
            <input
              required
              placeholder="Project name"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              required
              placeholder="Vehicle platform"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.vehicle_platform}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_platform: e.target.value }))}
            />
            <input
              required
              placeholder="ODD type"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.odd_type}
              onChange={(e) => setForm((f) => ({ ...f, odd_type: e.target.value }))}
            />
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
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

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Platform</th>
              <th className="px-3 py-3">ODD</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Review</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((p) => (
              <tr key={p.id} className="align-top hover:bg-slate-50/80">
                <td className="px-3 py-3">
                  {canEditCore(p) ? (
                    <input
                      className="w-full min-w-[8rem] rounded border border-slate-200 px-2 py-1 text-sm"
                      value={String(field(p, "name"))}
                      onChange={(e) =>
                        setEdits((x) => ({
                          ...x,
                          [p.id]: { ...x[p.id], name: e.target.value },
                        }))
                      }
                    />
                  ) : (
                    <span className="font-medium text-ink-950">{p.name}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {canEditCore(p) ? (
                    <input
                      className="w-full min-w-[6rem] rounded border border-slate-200 px-2 py-1 text-sm"
                      value={String(field(p, "vehicle_platform"))}
                      onChange={(e) =>
                        setEdits((x) => ({
                          ...x,
                          [p.id]: { ...x[p.id], vehicle_platform: e.target.value },
                        }))
                      }
                    />
                  ) : (
                    p.vehicle_platform
                  )}
                </td>
                <td className="px-3 py-3">
                  {canEditCore(p) ? (
                    <input
                      className="w-full min-w-[6rem] rounded border border-slate-200 px-2 py-1 text-sm"
                      value={String(field(p, "odd_type"))}
                      onChange={(e) =>
                        setEdits((x) => ({
                          ...x,
                          [p.id]: { ...x[p.id], odd_type: e.target.value },
                        }))
                      }
                    />
                  ) : (
                    p.odd_type
                  )}
                </td>
                <td className="px-3 py-3">
                  {canEditCore(p) ? (
                    <select
                      className="rounded border border-slate-200 px-2 py-1 text-sm"
                      value={String(field(p, "status"))}
                      onChange={(e) =>
                        setEdits((x) => ({
                          ...x,
                          [p.id]: { ...x[p.id], status: e.target.value },
                        }))
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-mono text-xs">{p.status}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {canReview() ? (
                    <select
                      className="rounded border border-slate-200 px-2 py-1 text-sm"
                      value={p.review_status}
                      onChange={(e) => void saveReviewOnly(p, e.target.value)}
                    >
                      {REVIEWS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-mono text-xs">{p.review_status}</span>
                  )}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-ink-600">{p.created_by_id}</td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-ink-600 hover:bg-slate-50"
                      onClick={() => setViewingProject(p)}
                    >
                      View
                    </button>

                    {canEditCore(p) ? (
                      <button
                        type="button"
                        disabled={!edits[p.id] || Object.keys(edits[p.id]!).length === 0 || savingIds.has(p.id)}
                        className="rounded-lg bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => void saveRow(p)}
                      >
                        {savingIds.has(p.id) ? "..." : "Save"}
                      </button>
                    ) : null}

                    {can(perms, P.projectsDelete) && (
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        onClick={() => void onDelete(p.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-500">No projects yet.</p>
        )}
      </section>

      {/* Details Modal */}
      {viewingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink-950">Project Details</h3>
              <button 
                onClick={() => setViewingProject(null)}
                className="text-slate-400 hover:text-ink-950 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Project ID</div>
                <div className="col-span-2 text-sm font-mono text-ink-950">{viewingProject.id}</div>
                
                <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Name</div>
                <div className="col-span-2 text-sm text-ink-950 font-medium">{viewingProject.name}</div>
                
                <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Platform</div>
                <div className="col-span-2 text-sm text-ink-950">{viewingProject.vehicle_platform}</div>
                
                <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">ODD Type</div>
                <div className="col-span-2 text-sm text-ink-950">{viewingProject.odd_type}</div>
                
                <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Status</div>
                <div className="col-span-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink-700 capitalize">
                    {viewingProject.status}
                  </span>
                </div>
                
                <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Review</div>
                <div className="col-span-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    viewingProject.review_status === 'approved' ? 'bg-green-100 text-green-700' :
                    viewingProject.review_status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {viewingProject.review_status}
                  </span>
                </div>

                <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Created By</div>
                <div className="col-span-2 text-sm text-ink-950">User ID: {viewingProject.created_by_id}</div>

                <div className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Created At</div>
                <div className="col-span-2 text-sm text-ink-950">{new Date(viewingProject.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setViewingProject(null)}
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-950 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
