import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_client")({
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: "/dashboard" } });
    }
  },
  component: ClientLayout,
});

function ClientLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-outline-variant/30 bg-surface/90 px-margin-mobile backdrop-blur-md md:px-margin-desktop">
        <Link
          to="/"
          className="font-headline-md text-[22px] tracking-tight text-primary md:text-headline-md"
        >
          Styling Space
        </Link>
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant hover:text-primary"
          >
            Main Site
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-widest text-on-surface-variant hover:text-primary"
          >
            <Icon name="logout" className="text-[18px]" /> Logout
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-container-max flex-grow px-margin-mobile py-16 md:px-margin-desktop">
        <Outlet />
      </main>
    </div>
  );
}
