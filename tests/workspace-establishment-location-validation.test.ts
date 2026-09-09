import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspace = readFileSync(
  "app/dashboard/nr1/workspace/page.tsx",
  "utf8"
);

const route = readFileSync(
  "app/api/nr1/establishments/route.ts",
  "utf8"
);

function between(
  source: string,
  startMarker: string,
  endMarker: string
): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + 1);

  assert.ok(start >= 0, `missing start marker: ${startMarker}`);
  assert.ok(end > start, `missing end marker: ${endMarker}`);

  return source.slice(start, end);
}

test("workspace blocks establishment save before POST when city or UF is invalid", () => {
  const block = between(
    workspace,
    "  async function handleCreateEstablishment",
    "  async function handleCreateDepartment"
  );

  const cityValidation =
    block.indexOf('setFormError("Informe a cidade do local de trabalho.");');

  const stateValidation =
    block.indexOf('setFormError("Informe uma UF brasileira válida.");');

  const apiCall =
    block.indexOf('buildUrl("/api/nr1/establishments"');

  assert.ok(cityValidation >= 0);
  assert.ok(stateValidation > cityValidation);
  assert.ok(apiCall > stateValidation);

  assert.ok(
    block.includes(
      "const establishmentCity = establishmentForm.city.trim();"
    )
  );

  assert.ok(
    block.includes(
      "const establishmentState = establishmentForm.state.trim().toUpperCase();"
    )
  );

  assert.ok(
    block.includes(
      "validBrazilianUfCodes.has(establishmentState)"
    )
  );
});

test("workspace sends normalized city and UF", () => {
  const block = between(
    workspace,
    "  async function handleCreateEstablishment",
    "  async function handleCreateDepartment"
  );

  assert.ok(block.includes("city: establishmentCity,"));
  assert.ok(block.includes("state: establishmentState,"));

  assert.equal(
    block.includes("city: establishmentForm.city,"),
    false
  );

  assert.equal(
    block.includes("state: establishmentForm.state,"),
    false
  );
});

test("API independently rejects missing city and invalid Brazilian UF", () => {
  const block =
    route.slice(route.indexOf("export async function POST"));

  const cityGuard =
    block.indexOf('error: "invalid_city"');

  const stateGuard =
    block.indexOf('error: "invalid_state"');

  const insert =
    block.indexOf('.from("nr1_establishments")');

  assert.ok(cityGuard >= 0);
  assert.ok(stateGuard > cityGuard);
  assert.ok(insert > stateGuard);

  assert.ok(
    route.includes(
      'const city = cleanText(body.city)'
    )
  );

  assert.ok(
    route.includes(
      'const state = cleanText(body.state)?.toUpperCase() ?? null'
    )
  );

  assert.ok(
    route.includes(
      "BRAZILIAN_UF_CODES.has(state)"
    )
  );
});

test("API persists only the normalized validated location values", () => {
  assert.ok(route.includes("      city,"));
  assert.ok(route.includes("      state,"));

  assert.equal(
    route.includes("      city: cleanText(body.city),"),
    false
  );

  assert.equal(
    route.includes("      state: cleanText(body.state),"),
    false
  );
});