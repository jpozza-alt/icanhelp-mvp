"use client";

import { useEffect, useMemo, useState } from "react";
import { Nr1JourneyStatusBar } from "./Nr1JourneyStatusBar";

type Nr1JourneyMode = "cliente_final" | "parceiro_sst" | "pasini_consultoria";

type TechnicalDetail = {
  label: string;
  value: string;
};

type JourneyStatusData = {
  mode?: Nr1JourneyMode;
  clientName?: string;
  partnerName?: string;
  establishmentName?: string;
  technicalResponsibleName?: string;
  pgrStatus?: string;
  formalVersionStatus?: string;
  finalApprovalStatus?: string;
  pendingCount?: number;
  completionPercent?: number;
  technicalDetails?: TechnicalDetail[];
};

type JourneyStatusResponse = {
  ok: boolean;
  data?: JourneyStatusData;
  error?: string;
  message?: string;
};

type Nr1JourneyStatusBarLiveProps = JourneyStatusData & {
  tenantId?: string;
  establishmentId?: string;
  requestPath?: string;
};

function buildRequestUrl(requestPath: string, tenantId?: string, establishmentId?: string) {
  const params = new URLSearchParams();

  if (tenantId) {
    params.set("tenantId", tenantId);
  }

  if (establishmentId) {
    params.set("establishmentId", establishmentId);
  }

  const query = params.toString();

  if (!query) {
    return requestPath;
  }

  return `${requestPath}?${query}`;
}

export function Nr1JourneyStatusBarLive({
  tenantId,
  establishmentId,
  requestPath = "/api/nr1/journey-status",
  mode = "parceiro_sst",
  clientName = "Cliente atendido",
  partnerName = "Pasini Consultoria",
  establishmentName = "Estabelecimento ativo",
  technicalResponsibleName = "Responsavel tecnico a definir",
  pgrStatus = "PGR em andamento",
  formalVersionStatus = "Versao formal pendente",
  finalApprovalStatus = "Aprovacao final pendente",
  pendingCount = 0,
  completionPercent = 0,
  technicalDetails = [],
}: Nr1JourneyStatusBarLiveProps) {
  const fallbackData = useMemo<JourneyStatusData>(
    () => ({
      mode,
      clientName,
      partnerName,
      establishmentName,
      technicalResponsibleName,
      pgrStatus,
      formalVersionStatus,
      finalApprovalStatus,
      pendingCount,
      completionPercent,
      technicalDetails,
    }),
    [
      mode,
      clientName,
      partnerName,
      establishmentName,
      technicalResponsibleName,
      pgrStatus,
      formalVersionStatus,
      finalApprovalStatus,
      pendingCount,
      completionPercent,
      technicalDetails,
    ],
  );

  const [data, setData] = useState<JourneyStatusData>(fallbackData);
  const [sourceStatus, setSourceStatus] = useState("Carregando status consolidado");

  const requestUrl = useMemo(
    () => buildRequestUrl(requestPath, tenantId, establishmentId),
    [requestPath, tenantId, establishmentId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadJourneyStatus() {
      try {
        setSourceStatus("Consultando endpoint consolidado");

        const response = await fetch(requestUrl, {
          cache: "no-store",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        const json = (await response.json()) as JourneyStatusResponse;

        if (!response.ok || !json.ok || !json.data) {
          throw new Error(json.message || json.error || "Falha ao carregar status da jornada");
        }

        if (!cancelled) {
          setData(json.data);
          setSourceStatus("Endpoint consolidado ativo");
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Falha desconhecida";
          setData(fallbackData);
          setSourceStatus(`Usando fallback visual: ${message}`);
        }
      }
    }

    void loadJourneyStatus();

    return () => {
      cancelled = true;
    };
  }, [fallbackData, requestUrl]);

  const mergedTechnicalDetails = [
    ...(data.technicalDetails ?? []),
    {
      label: "statusSource",
      value: sourceStatus,
    },
  ];

  return (
    <Nr1JourneyStatusBar
      mode={data.mode}
      clientName={data.clientName}
      partnerName={data.partnerName}
      establishmentName={data.establishmentName}
      technicalResponsibleName={data.technicalResponsibleName}
      pgrStatus={data.pgrStatus}
      formalVersionStatus={data.formalVersionStatus}
      finalApprovalStatus={data.finalApprovalStatus}
      pendingCount={data.pendingCount}
      completionPercent={data.completionPercent}
      technicalDetails={mergedTechnicalDetails}
    />
  );
}
