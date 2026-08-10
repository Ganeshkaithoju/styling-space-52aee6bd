import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell, buttonClass, fieldClass, labelClass } from "@/components/admin/AdminShell";
import { getProfile, saveProfile } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "profile"], queryFn: () => getProfile() });

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
    </AdminShell>
  );
}
