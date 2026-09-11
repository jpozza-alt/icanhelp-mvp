"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

export type Nr1GuidedHelpStep = {
  targetId: string;
  title: string;
  description: string;
};

type Nr1GuidedHelpTourProps = {
  steps: Nr1GuidedHelpStep[];
  storageKey: string;
  title?: string;
  buttonLabel?: string;
  autoStart?: boolean;
};

const ACTIVE_TARGET_CLASSES = [
  "relative",
  "z-40",
  "ring-2",
  "ring-[#D6B56C]",
  "ring-offset-4",
  "ring-offset-[#F7F2E9]",
];

function uiStorageKey(storageKey: string): string {
  return `nr1_ui_help_seen:${storageKey}`;
}

export default function Nr1GuidedHelpTour({
  steps,
  storageKey,
  title = "Como preencher",
  buttonLabel = "Como preencher",
  autoStart = true,
}: Nr1GuidedHelpTourProps) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = steps[stepIndex] ?? null;
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!autoStart || steps.length === 0) {
      return;
    }

    let alreadySeen = false;

    try {
      alreadySeen =
        window.localStorage.getItem(uiStorageKey(storageKey)) === "1";
    } catch {
      alreadySeen = false;
    }

    if (alreadySeen) {
      return;
    }

    const timer = window.setTimeout(() => {
      setStepIndex(0);
      setOpen(true);
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoStart, steps.length, storageKey]);

  useEffect(() => {
    if (!open || !currentStep) {
      return;
    }

    const target = document.getElementById(currentStep.targetId);

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    ACTIVE_TARGET_CLASSES.forEach((className) => {
      target.classList.add(className);
    });

    return () => {
      ACTIVE_TARGET_CLASSES.forEach((className) => {
        target.classList.remove(className);
      });
    };
  }, [currentStep, open]);

  function markAsSeen() {
    try {
      window.localStorage.setItem(
        uiStorageKey(storageKey),
        "1"
      );
    } catch {
      // A ajuda continua funcionando mesmo sem persistência local.
    }
  }

  function startTour() {
    setStepIndex(0);
    setOpen(true);
  }

  function closeTour() {
    markAsSeen();
    setOpen(false);
  }

  function goPrevious() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (isLastStep) {
      closeTour();
      return;
    }

    setStepIndex((current) =>
      Math.min(steps.length - 1, current + 1)
    );
  }

  if (steps.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={startTour}
        className="inline-flex items-center gap-2 rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-4 py-2.5 text-sm font-semibold text-[#10243E] transition hover:bg-[#F4ECE2]"
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
        {buttonLabel}
      </button>

      {open && currentStep ? (
        <aside
          role="dialog"
          aria-modal="false"
          aria-label={title}
          className="fixed bottom-5 right-5 z-[70] w-[min(92vw,420px)] rounded-[22px] border border-[#D8C8B2] bg-[#FFFCF7] p-5 shadow-[0_18px_55px_rgba(16,36,62,0.25)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#A36B16]">
                Ajuda guiada · passo {stepIndex + 1} de {steps.length}
              </p>
              <h4 className="mt-2 text-lg font-semibold text-[#10243E]">
                {currentStep.title}
              </h4>
            </div>

            <button
              type="button"
              onClick={closeTour}
              className="rounded-lg p-2 text-[#60718A] transition hover:bg-[#F4ECE2] hover:text-[#10243E]"
              aria-label="Fechar ajuda"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-[#60718A]">
            {currentStep.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeTour}
              className="text-sm font-semibold text-[#60718A] underline-offset-4 hover:underline"
            >
              Pular tour
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrevious}
                disabled={stepIndex === 0}
                className="inline-flex items-center gap-1 rounded-xl border border-[#D8C8B2] bg-[#FFFCF7] px-3 py-2 text-sm font-semibold text-[#10243E] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </button>

              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1 rounded-xl bg-[#10243E] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0B1A2D]"
              >
                {isLastStep ? "Concluir" : "Próximo"}
                {!isLastStep ? (
                  <ChevronRight
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}