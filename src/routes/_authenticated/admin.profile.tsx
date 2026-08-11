import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, buttonClass, fieldClass, labelClass } from "@/components/admin/AdminShell";
import { getProfile, saveProfile } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "profile"], queryFn: () => getProfile() });
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const save = useMutation({
    mutationFn: saveProfile,
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["admin", "profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell title="Profile" description="Your studio account details.">
      <form
        key={data?.id ?? "profile"}
        className="max-w-3xl border border-outline-variant/60 bg-surface-container-lowest p-8"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          save.mutate({
            data: {
              full_name: String(fd.get("full_name") ?? "") || null,
              job_title: String(fd.get("job_title") ?? "") || null,
              phone: String(fd.get("phone") ?? "") || null,
              bio: String(fd.get("bio") ?? "") || null,
              avatar_url: String(fd.get("avatar_url") ?? "") || null,
            },
          });
        }}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className={labelClass}>Full name</label>
            <input name="full_name" defaultValue={data?.full_name ?? ""} className={`${fieldClass} mt-2`} />
          </div>
          <div>
            <label className={labelClass}>Job title</label>
            <input name="job_title" defaultValue={data?.job_title ?? ""} className={`${fieldClass} mt-2`} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              value={data?.email ?? ""}
              readOnly
              className={`${fieldClass} mt-2 opacity-60`}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input name="phone" defaultValue={data?.phone ?? ""} className={`${fieldClass} mt-2`} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Avatar URL</label>
            <input name="avatar_url" defaultValue={data?.avatar_url ?? ""} className={`${fieldClass} mt-2`} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Bio</label>
            <textarea name="bio" rows={5} defaultValue={data?.bio ?? ""} className={`${fieldClass} mt-2`} />
          </div>
        </div>
        <button type="submit" className={`${buttonClass} mt-8`} disabled={save.isPending}>
          Save profile
        </button>
      </form>

      <div className="mt-12 max-w-3xl border border-outline-variant/60 bg-surface-container-lowest p-8">
        <h2 className="font-headline-sm text-primary mb-6">Change Password</h2>
        <form
          className="flex flex-col gap-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newPassword) {
              toast.error("New password is required.");
              return;
            }
            if (newPassword !== confirmNewPassword) {
              toast.error("Passwords do not match.");
              return;
            }
            
            setIsUpdatingPassword(true);
            try {
              const { error } = await supabase.auth.updateUser({ password: newPassword });
              if (error) throw error;
              toast.success("Password updated successfully.");
              setNewPassword("");
              setConfirmNewPassword("");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to update password");
            } finally {
              setIsUpdatingPassword(false);
            }
          }}
        >
          <div>
            <label className={labelClass}>New Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`${fieldClass} mt-2`} 
            />
          </div>
          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className={`${fieldClass} mt-2`} 
            />
          </div>
          <button type="submit" className={`${buttonClass} mt-2 max-w-fit`} disabled={isUpdatingPassword}>
            {isUpdatingPassword ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
