"use client";

import Link from "next/link";

export default function Nr1PgrReportShortcut() {
  return (
    <section
      id="nr1-pgr-report-shortcut"
      className="mb-6 rounded-[24px] border border-[#CFE3E7] bg-white p-5 shadow-[0_16px_45px_rgba(19,34,56,0.08)]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#178A8F]">
            Documento PGR
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#132238]">
            Relatorio estruturado do PGR
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6776]">
            Consulte a base consolidada do estabelecimento com empresa, setores, atividades,
            riscos, plano de acao, acompanhamentos, evidencias, saude, treinamentos e auditoria.
          </p>
        </div>

        <Link
          id="nr1PgrReportButton"
          href="/dashboard/nr1/relatorio-pgr"
          className="inline-flex items-center justify-center rounded-2xl bg-[#132238] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1D344F]"
        >
          Abrir relatorio PGR
        </Link>
      </div>
    </section>
  );
}
