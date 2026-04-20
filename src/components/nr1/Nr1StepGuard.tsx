"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useNr1JourneyState } from "@/hooks/useNr1JourneyState";

type StepKey = "diagnostico-inicial" | "setores" | "riscos" | "plano-de-acao";

type Nr1StepGuardProps = {
  stepKey: StepKey;
  title: string;
  description: string;
  children?: React.ReactNode;
};

const ROUTES: Record<StepKey, string> = {
  "diagnostico-inicial": "/dashboard/nr1/entrar",
  setores: "/dashboard/nr1/setores",
  riscos: "/dashboard/nr1/riscos",
  "plano-de-acao": "/dashboard/nr1/plano-de-acao",
};

function getBlockedReason(stepKey: StepKey, state: {
  hasDiagnosis: boolean;
  hasDepartments: boolean;
  hasRisks: boolean;
}) {
  if (stepKey === "setores" && !state.hasDiagnosis) {
    return {
      blocked: true,
      reason: "Voce precisa concluir o diagnostico inicial antes de entrar em Setores.",
      redirectTo: ROUTES["diagnostico-inicial"],
      redirectLabel: "Ir para diagnostico inicial",
    };
  }

  if (stepKey === "riscos") {
    if (!state.hasDiagnosis) {
      return {
        blocked: true,
        reason: "Voce precisa concluir o diagnostico inicial antes de entrar em Riscos.",
        redirectTo: ROUTES["diagnostico-inicial"],
        redirectLabel: "Ir para diagnostico inicial",
      };
    }

    if (!state.hasDepartments) {
      return {
        blocked: true,
        reason: "Voce precisa cadastrar os setores antes de entrar em Riscos.",
        redirectTo: ROUTES.setores,
        redirectLabel: "Ir para Setores",
      };
    }
  }

  if (stepKey === "plano-de-acao") {
    if (!state.hasDiagnosis) {
      return {
        blocked: true,
        reason: "Voce precisa concluir o diagnostico inicial antes de entrar em Plano de Acao.",
        redirectTo: ROUTES["diagnostico-inicial"],
        redirectLabel: "Ir para diagnostico inicial",
      };
    }

    if (!state.hasDepartments) {
      return {
        blocked: true,
        reason: "Voce precisa cadastrar os setores antes de entrar em Plano de Acao.",
        redirectTo: ROUTES.setores,
        redirectLabel: "Ir para Setores",
      };
    }

    if (!state.hasRisks) {
      return {
        blocked: true,
        reason: "Voce precisa registrar os riscos antes de entrar em Plano de Acao.",
        redirectTo: ROUTES.riscos,
        redirectLabel: "Ir para Riscos",
      };
    }
  }

  return {
    blocked: false,
    reason: "",
    redirectTo: ROUTES[stepKey],
    redirectLabel: "",
  };
}

export function Nr1StepGuard({
  stepKey,
  title,
  description,
  children,
}: Nr1StepGuardProps) {
  const router = useRouter();
  const rawState = useNr1JourneyState() as Record<string, unknown>;

  const hasDiagnosis = Boolean(rawState.hasDiagnosis);
  const hasDepartments = Boolean(rawState.hasDepartments);
  const hasRisks = Boolean(rawState.hasRisks);
  const hasActionPlans = Boolean(rawState.hasActionPlans);
  const isLoading = Boolean(rawState.isLoading ?? rawState.loading ?? false);

  const guard = useMemo(
    () =>
      getBlockedReason(stepKey, {
        hasDiagnosis,
        hasDepartments,
        hasRisks,
      }),
    [stepKey, hasDiagnosis, hasDepartments, hasRisks]
  );

  const nextIncompleteRoute = useMemo(() => {
    if (!hasDiagnosis) return ROUTES["diagnostico-inicial"];
    if (!hasDepartments) return ROUTES.setores;
    if (!hasRisks) return ROUTES.riscos;
    if (!hasActionPlans) return ROUTES["plano-de-acao"];
    return ROUTES[stepKey];
  }, [stepKey, hasDiagnosis, hasDepartments, hasRisks, hasActionPlans]);

  useEffect(() => {
    if (isLoading || !guard.blocked) return;

    const timer = window.setTimeout(() => {
      router.replace(nextIncompleteRoute);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [guard.blocked, isLoading, nextIncompleteRoute, router]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-neutral-600">Carregando estado real da jornada...</p>
      </section>
    );
  }

  if (guard.blocked) {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            Etapa bloqueada
          </p>
          <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
          <p className="text-sm text-neutral-700">{description}</p>
          <p className="text-sm text-neutral-800">{guard.reason}</p>
          <p className="text-sm text-neutral-600">
            Redirecionando voce para a proxima etapa liberada...
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={guard.redirectTo}
              className="inline-flex items-center rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              {guard.redirectLabel}
            </Link>
            <Link
              href={nextIncompleteRoute}
              className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900"
            >
              Continuar jornada
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
        <p className="mt-2 text-sm text-neutral-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default Nr1StepGuard;
