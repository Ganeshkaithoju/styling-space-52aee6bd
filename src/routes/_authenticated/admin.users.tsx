import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell, buttonClass, fieldClass, labelClass } from "@/components/admin/AdminShell";
import { AdminLocationDetail } from "@/components/admin/AdminLocationDetail";
import {
  listUsersFn,
  createAdminFn,
  removeAdminFn,
  setAccountStatusFn,
  adminResetPasswordFn,
  updateRoleFn,
  transferOwnershipFn,
  getIsAdmin,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

type AppRole = "owner" | "admin" | "editor" | "user";

function UsersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<AppRole | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  type CustomerLocation = {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    updated_at: string;
  };
  const [selectedLocation, setSelectedLocation] = useState<CustomerLocation | null>(null);

  const {
    data: users = [],
    error: usersError,
    isError: isUsersError,
    isLoading,
  } = useQuery({ queryKey: ["admin", "users"], queryFn: () => listUsersFn() });
  const { data: currentContext } = useQuery({
    queryKey: ["admin", "context"],
    queryFn: () => getIsAdmin(),
  });
  const currentUserId = currentContext?.userId;

  const createAdminMut = useMutation({
    mutationFn: createAdminFn,
    onSuccess: () => {
      toast.success("Administrator created successfully.");
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAdminMut = useMutation({
    mutationFn: removeAdminFn,
    onSuccess: () => {
      toast.success("User removed successfully.");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: setAccountStatusFn,
    onSuccess: () => {
      toast.success("User status updated.");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: adminResetPasswordFn,
    onSuccess: () => {
      toast.success("Password reset email sent.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRoleMut = useMutation({
    mutationFn: updateRoleFn,
    onSuccess: () => {
      toast.success("Role updated.");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transferMut = useMutation({
    mutationFn: transferOwnershipFn,
    onSuccess: () => {
      toast.success("Ownership transferred successfully.");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      // Reload page to refresh context
      window.location.reload();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const displayedUsers = users.filter((u) => tab === "all" || u.role === tab);

  const handleExport = () => {
    if (!users || users.length === 0) {
      toast.error("No users to export.");
      return;
    }

    const headers = [
      "User ID",
      "Email",
      "Full Name",
      "Provider",
      "Role",
      "Status",
      "Created At",
      "Updated At",
      "Last Sign In",
      "Email Confirmed",
      "Avatar URL",
    ];

    const escapeCsv = (str: unknown) => {
      if (str === null || str === undefined) return "";
      const s = String(str);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = users.map((u) =>
      [
        escapeCsv(u.id),
        escapeCsv(u.email),
        escapeCsv(u.full_name),
        escapeCsv(u.provider),
        escapeCsv(u.role),
        escapeCsv(u.status),
        escapeCsv(u.created_at),
        escapeCsv(u.updated_at),
        escapeCsv(u.last_sign_in_at),
        escapeCsv(u.email_confirmed_at),
        escapeCsv(u.avatar_url),
      ].join(","),
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const date = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `styling-space-users-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminShell
      title="User Management"
      description="Manage administrators, editors, and registered users."
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`${buttonClass} bg-transparent border border-outline-variant text-on-surface hover:bg-surface-container`}
            onClick={handleExport}
          >
            Export Users
          </button>
          <button type="button" className={buttonClass} onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "Create Admin"}
          </button>
        </div>
      }
    >
      <div className="flex gap-2 border-b border-outline-variant/50">
        {(["all", "admin", "editor", "user"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-5 py-3 font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
              tab === t ? "border-b-2 border-secondary text-primary" : "text-on-surface-variant"
            }`}
          >
            {t === "all" ? "All Users" : t + "s"}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {showCreate && (
          <form
            className="flex flex-col gap-4 border border-outline-variant/50 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              createAdminMut.mutate({
                data: {
                  email: fd.get("email") as string,
                  fullName: fd.get("fullName") as string,
                  role: fd.get("role") as "admin" | "editor",
                },
              });
            }}
          >
            <h3 className="font-headline-sm text-primary">New Administrator</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className={labelClass}>Full Name</label>
                <input name="fullName" required className={`${fieldClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input name="email" type="email" required className={`${fieldClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select name="role" required className={`${fieldClass} mt-1`}>
                  <option value="admin">Administrator</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={createAdminMut.isPending} className={buttonClass}>
                Create User
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-on-surface">
            <thead>
              <tr className="border-b border-outline-variant/50">
                <th className="pb-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                  User
                </th>
                <th className="pb-3 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-label-caps text-xs uppercase tracking-widest text-on-surface-variant">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-label-caps text-xs uppercase tracking-widest text-on-surface-variant">
                  Location
                </th>
                <th className="px-4 py-3 text-right font-label-caps text-xs uppercase tracking-widest text-on-surface-variant">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.map((user) => {
                const isOwner = user.role === "owner";
                const isSelf = user.id === currentUserId;

                return (
                  <tr key={user.id} className="border-b border-outline-variant/20 last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                          {user.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="font-medium">{user.full_name || "Unknown"}</div>
                          <div className="text-sm text-on-surface-variant">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 capitalize">
                      {user.role}
                      {isSelf && <span className="ml-2 text-xs text-secondary">(You)</span>}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs uppercase tracking-widest ${
                          user.status === "active"
                            ? "bg-primary/10 text-primary"
                            : "bg-error/10 text-error"
                        }`}
                      >
                        {user.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {(() => {
                        const loc = (user as unknown as { location?: CustomerLocation }).location;
                        if (!loc)
                          return (
                            <span className="text-sm text-on-surface-variant">Not shared</span>
                          );
                        return (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-label-caps text-xs uppercase tracking-widest text-primary">
                              Shared
                            </span>
                            <span className="text-xs text-on-surface-variant whitespace-nowrap">
                              Updated: {new Date(loc.updated_at).toLocaleDateString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedLocation(loc)}
                              className="text-xs font-semibold text-secondary hover:underline mt-1"
                            >
                              View Location
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Reset password for ${user.email}?`)) {
                                resetMut.mutate({
                                  data: { targetUserId: user.id!, email: user.email! },
                                });
                              }
                            }}
                            className="text-sm text-secondary underline hover:text-primary"
                          >
                            Reset Password
                          </button>
                        )}
                        {!isOwner && !isSelf && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const newStatus = user.status === "active" ? "inactive" : "active";
                                if (
                                  confirm(
                                    `${newStatus === "inactive" ? "Deactivate" : "Reactivate"} ${user.email}?`,
                                  )
                                ) {
                                  statusMut.mutate({
                                    data: { targetUserId: user.id!, status: newStatus },
                                  });
                                }
                              }}
                              className="text-sm text-secondary underline hover:text-primary"
                            >
                              {user.status === "active" ? "Deactivate" : "Reactivate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Permanently remove ${user.email}? This cannot be undone.`,
                                  )
                                ) {
                                  removeAdminMut.mutate({ data: { targetUserId: user.id! } });
                                }
                              }}
                              className="text-sm text-error underline hover:text-error/80"
                            >
                              Remove
                            </button>
                            {currentContext?.isAdmin && user.role !== "admin" && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Promote ${user.email} to Admin?`)) {
                                    updateRoleMut.mutate({
                                      data: { targetUserId: user.id!, role: "admin" },
                                    });
                                  }
                                }}
                                className="text-sm text-secondary underline hover:text-primary"
                              >
                                Make Admin
                              </button>
                            )}
                            {currentContext?.isAdmin && user.role === "user" && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Promote ${user.email} to Editor?`)) {
                                    updateRoleMut.mutate({
                                      data: { targetUserId: user.id!, role: "editor" },
                                    });
                                  }
                                }}
                                className="text-sm text-secondary underline hover:text-primary"
                              >
                                Make Editor
                              </button>
                            )}
                          </>
                        )}
                        {/* Only current owner can transfer ownership */}
                        {user.role === "admin" && currentContext?.isOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `TRANSFER OWNERSHIP to ${user.email}?\nYou will lose owner privileges and become an admin. This cannot be undone by you.`,
                                )
                              ) {
                                transferMut.mutate({ data: { targetAdminId: user.id! } });
                              }
                            }}
                            className="text-sm text-secondary underline hover:text-primary"
                          >
                            Make Owner
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {isUsersError && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-error">
                    <p className="font-bold">Error loading users</p>
                    <p className="text-sm mt-1">
                      {usersError?.message || "An unknown error occurred"}
                    </p>
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                    Loading users...
                  </td>
                </tr>
              )}
              {!isUsersError && !isLoading && displayedUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLocation && (
        <AdminLocationDetail
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </AdminShell>
  );
}
