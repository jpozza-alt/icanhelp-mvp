import TopBar from "@/components/TopBar";

export default function DashboardPage() {
  return (
    <>
      <TopBar />
      <main className="min-h-screen w-full bg-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-gray-800 rounded-xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Bem-vindo ao icanHelp</h1>
          <p className="mt-2 text-gray-300">
            Dashboard carregou com sucesso. (Página corrigida para compilar na Vercel)
          </p>
        </div>
      </main>
    </>
  );
}
