"use client";

import Link from "next/link";

export default function Nr1PgrReportShortcut() {
  return (
    <section
      id="nr1-pgr-report-shortcut"
      className="mb-6 rounded-[24px] border border-[#d9c9b8] bg-[#fffdf9] p-5 shadow-[0_16px_45px_rgba(16,36,62,0.08)]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9d7b37]">
            Documento PGR
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#10243e]">
            Relatorio estruturado do PGR
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f665b]">
            Consulte a base consolidada do estabelecimento com empresa, setores, atividades,
            riscos, plano de acao, acompanhamentos, evidencias, saude, treinamentos e auditoria.
          </p>
        </div>

        <Link
          id="nr1PgrReportButton"
          href="/dashboard/nr1/relatorio-pgr"
          className="inline-flex items-center justify-center rounded-2xl bg-[#10243e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b1729]"
        >
          Abrir relatorio PGR
        </Link>
      </div>
    </section>
  );
}
