import Nr1WorkspaceContextBar from '@/components/nr1/Nr1WorkspaceContextBar';
import Nr1WorkspaceLegacyShortcutGuard from '@/components/nr1/Nr1WorkspaceLegacyShortcutGuard';
import Nr1WorkspaceOperationalLinks from '@/components/nr1/Nr1WorkspaceOperationalLinks';

export default function Nr1WorkspacePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
            Workspace canonico NR1
          </div>

          <h1 className="mt-4 text-3xl font-semibold text-slate-900">
            Jornada operacional NR-1
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Este workspace foi reduzido ao hub canonico do modulo. A partir daqui, a navegacao deve acontecer apenas pelos acessos operacionais oficiais.
          </p>
        </div>
      </section>

      <Nr1WorkspaceLegacyShortcutGuard />
      <Nr1WorkspaceContextBar />
      <Nr1WorkspaceOperationalLinks />
    </main>
  );
}