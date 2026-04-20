"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function TopBar() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#22324c] bg-[#091426]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#c9a45c]">
            icanHelp
          </div>
          <div className="mt-1 text-sm text-[#d8e0ea]">
            Plataforma institucional
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="rounded-md border border-[#c9a45c] bg-[#10203a] px-4 py-2 text-sm font-semibold text-[#f5f7fa] hover:bg-[#173055]"
        >
          Sair
        </button>
      </div>
    </header>
  );
}

