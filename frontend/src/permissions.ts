export const P = {
  adminFull: "admin:full",
  usersRead: "users:read",
  usersCreate: "users:create",
  usersUpdate: "users:update",
  usersAssignRole: "users:assign_role",
  projectsCreate: "projects:create",
  projectsUpdateReview: "projects:update_review",
  projectsDelete: "projects:delete",
  projectsUpdateOwn: "projects:update_own",
} as const;

export function can(permissions: string[], code: string): boolean {
  return permissions.includes(P.adminFull) || permissions.includes(code);
}
