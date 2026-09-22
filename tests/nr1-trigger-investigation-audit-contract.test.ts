import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

const helper = read("src/lib/server/nr1-audit-events.ts")
const openRoute = read("app/api/nr1/trigger-investigations/route.ts")
const answerRoute = read(
  "app/api/nr1/trigger-investigations/[id]/answers/route.ts",
)

test("auditoria usa nr1_audit_events com cliente autenticado", () => {
  assert.match(helper, /\.from\("nr1_audit_events"\)/)
  assert.match(helper, /Nr1AuditClient/)
  assert.doesNotMatch(helper, /createNr1AdminClient/)
  assert.doesNotMatch(helper, /service[_-]?role/i)
})

test("abertura da investigacao registra os tres eventos iniciais", () => {
  assert.match(openRoute, /trigger_marked_yes/)
  assert.match(openRoute, /official_message_shown/)
  assert.match(openRoute, /trigger_investigation_started/)
  assert.match(openRoute, /insertNr1AuditEvents/)
})

test("salvar resposta registra resposta e salvamento da investigacao", () => {
  assert.match(answerRoute, /trigger_question_answered/)
  assert.match(answerRoute, /trigger_investigation_saved/)
  assert.match(answerRoute, /insertNr1AuditEvents/)
})

test("auditoria preserva tenant estabelecimento usuario e entidade", () => {
  assert.match(helper, /tenant_id: event\.tenantId/)
  assert.match(helper, /establishment_id: event\.establishmentId/)
  assert.match(helper, /entity_id: event\.entityId/)
  assert.match(helper, /user_id: event\.userId/)
})

test("bloco de auditoria nao cria risco nem plano de acao", () => {
  const combined = helper + openRoute + answerRoute

  assert.doesNotMatch(combined, /\.from\("nr1_risks"\)/)
  assert.doesNotMatch(combined, /\.from\("nr1_action_plans"\)/)
})
