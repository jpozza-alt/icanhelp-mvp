import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();

const psychosocialRoute = readFileSync(
  resolve(root, "app/api/nr1/diagnosis-psychosocial/route.ts"),
  "utf8",
);

const reviewRoute = readFileSync(
  resolve(root, "app/api/nr1/diagnosis-review/route.ts"),
  "utf8",
);

const workspace = readFileSync(
  resolve(root, "app/dashboard/nr1/workspace/page.tsx"),
  "utf8",
);

test("workspace keeps sending the HR justification as psychosocial notes", () => {
  assert.match(
    workspace,
    /notes:\s*psychosocialForm\.notes/,
  );
});

test("marked psychosocial factors receive the entered justification", () => {
  assert.match(
    psychosocialRoute,
    /justification:\s*row\[factor\.key\]\s*===\s*true\s*\?\s*row\.notes\s*:\s*null/,
  );

  assert.match(
    psychosocialRoute,
    /status:\s*row\[factor\.key\]\s*===\s*true\s*\?\s*"evidence_found"\s*:\s*"not_observed"/,
  );
});

test("unmarked factors do not inherit the general justification", () => {
  assert.match(
    psychosocialRoute,
    /justification:\s*row\[factor\.key\]\s*===\s*true\s*\?\s*row\.notes\s*:\s*null/,
  );
});

test("checkbox alone remains insufficient supporting evidence", () => {
  assert.match(
    reviewRoute,
    /const hasSupportingEvidence =/,
  );

  assert.match(
    reviewRoute,
    /status === "evidence_found" && !hasSupportingEvidence\(factor\)/,
  );
});

test("investigation-required gate remains before risk persistence", () => {
  assert.match(
    reviewRoute,
    /reason:\s*"investigation_required"/,
  );

  const gate =
    reviewRoute.indexOf('reason: "investigation_required"');

  const insert =
    reviewRoute.indexOf(".insert(riskPayload)");

  assert.ok(gate >= 0);
  assert.ok(insert > gate);
});

test("psychosocial factor bridge does not itself create a risk", () => {
  assert.doesNotMatch(
    psychosocialRoute,
    /\.from\("nr1_risks"\)/,
  );
});