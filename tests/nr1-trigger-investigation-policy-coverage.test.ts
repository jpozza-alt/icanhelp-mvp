import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const matrixPath =
  "src/lib/nr1-trigger-investigation-matrix.ts";

const policyPath =
  "src/lib/nr1-trigger-investigation-policy.ts";

const triggerTypes = [
  "deadline_pressure",
  "public_service",
  "remote_or_hybrid_work",
  "third_parties",
  "repetitive_work",
  "prolonged_sitting",
  "intermediate_leadership",
  "frequent_changes",
  "task_accumulation",
  "frequent_conflicts",
  "harassment_or_violence",
] as const;

function section(
  source: string,
  triggerType: string,
  nextTriggerType?: string,
): string {
  const startMarker = `  ${triggerType}: {`;
  const start = source.indexOf(startMarker);

  assert.notEqual(
    start,
    -1,
    `gatilho ${triggerType} nao encontrado`,
  );

  if (!nextTriggerType) {
    return source.slice(start);
  }

  const endMarker = `  ${nextTriggerType}: {`;
  const end = source.indexOf(endMarker, start + startMarker.length);

  assert.notEqual(
    end,
    -1,
    `fim do gatilho ${triggerType} nao encontrado`,
  );

  return source.slice(start, end);
}

function matrixQuestionKeys(source: string): string[] {
  return Array.from(
    source.matchAll(
      /(?:yesNo|text)\(\s*"([^"]+)"/g,
    ),
    (match) => match[1],
  );
}

function policyQuestionKeys(source: string): string[] {
  return Array.from(
    source.matchAll(
      /^\s{4}([a-z0-9_]+): policy\(/gm,
    ),
    (match) => match[1],
  );
}

test("cada pergunta da matriz possui exatamente uma politica correspondente", () => {
  const matrix = read(matrixPath);
  const policy = read(policyPath);

  triggerTypes.forEach((triggerType, index) => {
    const nextTriggerType = triggerTypes[index + 1];

    const matrixKeys = matrixQuestionKeys(
      section(matrix, triggerType, nextTriggerType),
    );

    const policyKeys = policyQuestionKeys(
      section(policy, triggerType, nextTriggerType),
    );

    assert.deepEqual(
      [...policyKeys].sort(),
      [...matrixKeys].sort(),
      `politica divergente para ${triggerType}`,
    );

    assert.equal(
      new Set(policyKeys).size,
      policyKeys.length,
      `politica duplicada em ${triggerType}`,
    );
  });
});

test("todos os gatilhos oficiais possuem bloco de politica", () => {
  const policy = read(policyPath);

  for (const triggerType of triggerTypes) {
    assert.ok(
      policy.includes(`  ${triggerType}: {`),
      `bloco de politica ausente para ${triggerType}`,
    );
  }
});

