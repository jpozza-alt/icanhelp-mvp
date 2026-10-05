import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8",
  );
}

function compact(value) {
  return value.replace(/\s+/g, " ").trim();
}

const page = read(
  "app/dashboard/nr1/relatorio-pgr/page.tsx",
);

const route = read(
  "app/api/nr1/pgr-support-document/route.ts",
);

const approval = read(
  "app/api/nr1/pgr-approvals/route.ts",
);

const finalApproval = read(
  "app/api/nr1/pgr-approvals/finalize/route.ts",
);

const auditRoute = read(
  "app/api/nr1/audit-events/route.ts",
);

const migration = read(
  "supabase/migrations/20261004090000_add_nr1_pgr_support_document_type.sql",
);

const journey = read(
  "src/lib/nr1-journey.ts",
);

const e2e = read(
  "e2e/nr1-mvp-journey.spec.ts",
);

const compactRoute = compact(route);
const compactPage = compact(page);
const compactApproval = compact(approval);
const compactFinalApproval = compact(finalApproval);
const compactAuditRoute = compact(auditRoute);
const compactMigration = compact(migration);
const compactJourney = compact(journey);
const compactE2e = compact(e2e);

test(
  "support document has its own non-formal document contract",
  () => {
    assert.ok(
      compactRoute.includes(
        'const SUPPORT_DOCUMENT_TYPE = "pgr_support_document"'
      ),
    );

    assert.ok(
      compactMigration.includes(
        "'pgr_support_document'"
      ),
    );

    assert.ok(
      compactRoute.includes(
        "formalPgr: false"
      ),
    );

    assert.ok(
      compactRoute.includes(
        "professionalApproval: false"
      ),
    );

    assert.ok(
      compactRoute.includes(
        "automaticSignature: false"
      ),
    );
  },
);

test(
  "support document has a non-formal versioned audit classification",
  () => {
    assert.ok(
      compactRoute.includes(
        'persistence_type: "versioned_support_document"'
      ),
    );

    assert.ok(
      compactMigration.includes(
        "'versioned_support_document'"
      ),
    );

    assert.ok(
      compactAuditRoute.includes(
        'value === "versioned_support_document"'
      ),
    );

    assert.ok(
      compactAuditRoute.includes(
        '"versioned_support_document"'
      ),
    );
  },
);

test(
  "support document is versioned and traceable",
  () => {
    assert.ok(
      compactRoute.includes(
        "supersedes_document_id:"
      ),
    );

    assert.ok(
      compactRoute.includes(
        'event_type: "pgr_support_document_generated"'
      ),
    );

    assert.ok(
      compactRoute.includes(
        'entity_type: "pgr_support_document"'
      ),
    );

    assert.ok(
      compactRoute.includes(
        '"nr1_document_versions"'
      ),
    );

    assert.ok(
      compactRoute.includes(
        '"nr1_audit_events"'
      ),
    );
  },
);

test(
  "professional PGR approval only accepts review_report",
  () => {
    assert.ok(
      compactApproval.includes(
        'documentVersion.document_type !== "review_report"'
      ),
    );

    assert.ok(
      compactFinalApproval.includes(
        'documentVersion.document_type !== "review_report"'
      ),
    );

    assert.ok(
      compactMigration.includes(
        "dv.document_type = 'review_report'"
      ),
    );
  },
);

test(
  "formal PGR operations remain disabled",
  () => {
    assert.ok(
      compactPage.includes(
        "const FORMAL_PGR_OPERATIONS_ENABLED = false;"
      ),
    );

    assert.ok(
      !compactPage.includes(
        "const FORMAL_PGR_OPERATIONS_ENABLED = true;"
      ),
    );

    assert.ok(
      compactApproval.includes(
        "const PGR_FORMALIZATION_ENABLED = false;"
      ),
    );

    assert.ok(
      compactFinalApproval.includes(
        "const PGR_FORMALIZATION_ENABLED = false;"
      ),
    );
  },
);

test(
  "RH page exposes support-document generation without claiming formalization",
  () => {
    assert.ok(
      compactPage.includes(
        "Documento Estruturado de Apoio à Formalização do PGR"
      ),
    );

    assert.ok(
      compactPage.includes(
        'id="nr1CreatePgrSupportDocumentButton"'
      ),
    );

    assert.ok(
      compactPage.includes(
        "/api/nr1/pgr-support-document"
      ),
    );

    assert.ok(
      compactPage.includes(
        "Imprimir / salvar em PDF"
      ),
    );

    assert.ok(
      compactPage.includes(
        "não constitui PGR formal"
      ),
    );

    assert.ok(
      compactJourney.includes(
        "Documento de apoio ao PGR"
      ),
    );
  },
);

test(
  "Playwright contract requires actual support-document generation",
  () => {
    assert.ok(
      compactE2e.includes(
        "#nr1CreatePgrSupportDocumentButton"
      ),
    );

    assert.ok(
      compactE2e.includes(
        "PGR_SUPPORT_DOCUMENT_GENERATED=PASS"
      ),
    );

    assert.ok(
      compactE2e.includes(
        "PGR_GENERATION=PASS"
      ),
    );

    assert.ok(
      !compactE2e.includes(
        "PGR_GENERATION=PARTIAL_PREVIEW_ONLY"
      ),
    );
  },
);