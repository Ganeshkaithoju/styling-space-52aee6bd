import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AdminGate,
});

function AdminGate() {
  const { data, isPending } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => getIsAdmin(),
  });

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant">
          Loading studio…
        </p>
      </div>
    );
  }

  if (!data?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-margin-mobile">
        <div className="max-w-md text-center">
          <p className="font-label-caps text-label-caps uppercase tracking-widest text-secondary">
            Restricted
          </p>
          <h1 className="mt-4 font-headline-md text-headline-md text-primary">
            Studio access required
          </h1>
          <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
            Your account is signed in but doesn't have administrator permissions for the CMS.
          </p>
          <Link
            to="/"
            className="mt-8 inline-block bg-primary px-6 py-3 font-label-caps text-label-caps uppercase tracking-widest text-on-primary"
          >
            Return to site
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
