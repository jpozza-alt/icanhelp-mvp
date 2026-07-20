import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  LEGACY_REMOTE_FILENAMES,
  validateMigrationFilenames,
} from "../scripts/validate-migration-versions.mjs";

function readMigration(filename) {
  return readFileSync(new URL(`../supabase/migrations/${filename}`, import.meta.url), "utf8");
}

test("accepts unique 14-digit migration versions and documented remote legacy versions", () => {
  const errors = validateMigrationFilenames([
    ...LEGACY_REMOTE_FILENAMES,
    "20260720000001_add_nr1_admin_correct_diagnosis_risk_texts_rpc.sql",
  ]);

  assert.deepEqual(errors, []);
});

test("rejects migration versions outside the 14-digit standard", () => {
  const errors = validateMigrationFilenames([
    "20260720_001_invalid_new_migration.sql",
  ]);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /fora do padrão obrigatório de 14 dígitos/);
});

test("rejects duplicate migration versions", () => {
  const errors = validateMigrationFilenames([
    "20260720000001_first.sql",
    "20260720000001_second.sql",
  ]);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /versão duplicada 20260720000001/);
});

test("keeps the Pasini base migration free of the four later migration blocks", () => {
  const sql = readMigration("20260526140140_candidate_pasini_recruitment_requests.sql");

  assert.doesNotMatch(sql, /Candidate additive migration for Querino & Pasini recruitment contracting fields/);
  assert.doesNotMatch(sql, /Candidate additive migration for vacancy information status/);
  assert.doesNotMatch(sql, /Candidate additive migration for package recommendation logic/);
  assert.doesNotMatch(sql, /Candidate additive migration for analysis request flow/);
});

test("preserves the documented canonical Pasini defaults, status constraint and comments", () => {
  const contracting = readMigration("20260526154205_add_pasini_contracting_fields_govbr.sql");
  const analysisFlow = readMigration("20260526162950_set_pasini_analysis_request_flow.sql");
  const statusConstraint = readMigration("20260531165500_update_pasini_recruitment_status_constraint.sql");

  assert.match(contracting, /govbr_signature_status text not null default 'not_applicable'/);
  assert.doesNotMatch(contracting, /govbr_signature_status text not null default 'pending_pdf_generation'/);

  for (const status of [
    "new",
    "in_review",
    "contacted",
    "proposal_sent",
    "hired",
    "cancelled",
    "archived",
    "pending_consultancy_review",
    "proposal_ready",
    "pending_govbr_signature",
    "contracted_signed",
    "canceled",
  ]) {
    assert.match(statusConstraint, new RegExp(`'${status}'`));
  }

  assert.match(analysisFlow, /Fluxo comercial: pending_consultancy_review, proposal_ready, pending_govbr_signature, contracted_signed, canceled\./);
  assert.match(analysisFlow, /No envio inicial fica not_applicable, pois ainda nao existe proposta ou ordem de servico para assinatura\./);
  assert.match(analysisFlow, /Declaracoes completas ficam na proposta ou ordem de servico\./);
});
