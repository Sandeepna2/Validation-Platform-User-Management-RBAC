import { useAuth } from "../auth/AuthContext";
import { can, P } from "../permissions";

// Mock data for system actions (Replace with API data stream hook if necessary)
const MOCK_AUDIT_LOG = [
  { id: 1, action: "Role Assigned", target: "user:john_doe -> manager", timestamp: "2026-05-18 14:32", status: "success" },
  { id: 2, action: "Project Created", target: "project:ADAS_Validation_v2", timestamp: "2026-05-18 11:15", status: "success" },
  { id: 3, action: "Permission Revoked", target: "projects:delete from role:viewer", timestamp: "2026-05-17 09:45", status: "success" },
  { id: 4, action: "Failed Access Attempt", target: "endpoint:/api/v1/admin/settings", timestamp: "2026-05-17 08:12", status: "failed" },
];

export function DashboardPage() {
  const { me } = useAuth();
  const perms = me?.permissions ?? [];

  // Group permissions dynamically by domain prefix to reveal systemic hierarchy
  const hierarchicalPerms = perms.reduce((acc, perm) => {
    const [domain] = perm.split(":");
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="min-h-screen bg-slate-50/40 p-6 sm:p-8 font-sans">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Header Section */}
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Overview of your role inheritance tier, resolved system capabilities, and secure audit trails.
            </p>
          </div>
          <div className="self-start rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            Security Tier: {me?.role_name === "admin" ? "Level 1 (Full Access)" : "Level 2 (Restricted)"}
          </div>
        </div>

        {/* 3-Column Profile Summary Row */}
        <div className="grid gap-6 md:grid-cols-3">

          {/* 1. Identity & Role Hierarchy Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
              Identity & Hierarchy
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">User</p>
                <p className="text-base font-bold text-gray-900">{me?.name || "Unknown Identity"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Assigned Role</p>
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  <span className="text-sm">👑</span> {me?.role_name || "No Assignment"}
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Inheritance Tree</p>
                <div className="flex items-center gap-1.5 font-mono text-xs text-gray-600">
                  <span className="font-semibold text-gray-900">root</span>
                  <span className="text-gray-400">→</span>
                  <span className="rounded bg-blue-50/50 px-1.5 py-0.5 font-semibold text-blue-600">{me?.role_name}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-400">inherited_scope</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Active Capabilities Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
              Resolved Capabilities
            </h2>
            <ul className="space-y-3 text-sm text-gray-700">
              {can(perms, P.projectsCreate) && (
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                  Create validation projects
                </li>
              )}
              {can(perms, P.projectsUpdateReview) && (
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                  Update project review status
                </li>
              )}
              {can(perms, P.usersRead) && (
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                  View and manage users
                </li>
              )}
              {can(perms, P.usersAssignRole) && (
                <li className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                  Assign roles
                </li>
              )}
              {!can(perms, P.projectsCreate) &&
                !can(perms, P.projectsUpdateReview) &&
                !can(perms, P.usersRead) && (
                  <li className="flex items-center gap-3 text-gray-400 italic">
                    <span className="h-2 w-2 rounded-full bg-gray-300"></span>
                    Read-only platform viewer
                  </li>
                )}
            </ul>
          </div>

          {/* 3. Grouped Hierarchical Permissions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
              Permissions Hierarchy
            </h2>
            {perms.length > 0 ? (
              <div className="space-y-3.5 max-h-[165px] overflow-y-auto pr-1">
                {Object.entries(hierarchicalPerms).map(([domain, items]) => (
                  <div key={domain} className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      {domain} context
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((perm) => (
                        <span
                          key={perm}
                          className="rounded bg-gray-50 px-2 py-0.5 font-mono text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-200"
                        >
                          {perm.includes(":") ? perm.split(":")[1] : perm}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No access variables mapped.</p>
            )}
          </div>
        </div>

        {/* System Audit Log Section */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">System Audit Trail</h2>
              <p className="text-xs text-gray-500">Immutable operations log captured within your session domain</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Security Active
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Event Action</th>
                  <th className="px-6 py-3">Target Reference</th>
                  <th className="px-6 py-3 text-right">Operation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_AUDIT_LOG.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono text-xs text-gray-500">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-medium text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 font-mono text-xs whitespace-nowrap">
                      {log.target}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${log.status === "success"
                          ? "bg-green-50 text-green-700 ring-green-600/20"
                          : "bg-red-50 text-red-700 ring-red-600/20"
                        }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}