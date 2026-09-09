import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspace = readFileSync(
  "app/dashboard/nr1/workspace/page.tsx",
  "utf8"
);

const departmentsRoute = readFileSync(
  "app/api/nr1/departments/route.ts",
  "utf8"
);

function between(
  source: string,
  startMarker: string,
  endMarker: string
): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  assert.ok(start >= 0, `missing start marker: ${startMarker}`);
  assert.ok(end > start, `missing end marker: ${endMarker}`);

  return source.slice(start, end);
}

test("workspace requires a positive integer employee count before saving a department", () => {
  const block = between(
    workspace,
    "  async function handleCreateDepartment(event: FormEvent<HTMLFormElement>): Promise<void> {",
    "  async function handleCreateActivity(event: FormEvent<HTMLFormElement>): Promise<void> {"
  );

  const normalization = block.indexOf(
    "const departmentEmployeeCount = numberOrNull(departmentForm.employee_count);"
  );

  const nullGuard = block.indexOf(
    "departmentEmployeeCount === null"
  );

  const integerGuard = block.indexOf(
    "!Number.isInteger(departmentEmployeeCount)"
  );

  const positiveGuard = block.indexOf(
    "departmentEmployeeCount <= 0"
  );

  const errorMessage = block.indexOf(
    'setFormError("Informe uma quantidade de pessoas inteira e maior que zero.");'
  );

  const post = block.indexOf(
    'const path = buildUrl("/api/nr1/departments"'
  );

  assert.ok(normalization >= 0);
  assert.ok(nullGuard > normalization);
  assert.ok(integerGuard > nullGuard);
  assert.ok(positiveGuard > integerGuard);
  assert.ok(errorMessage > positiveGuard);
  assert.ok(post > errorMessage);
});

test("workspace sends the validated department employee count", () => {
  const block = between(
    workspace,
    "  async function handleCreateDepartment(event: FormEvent<HTMLFormElement>): Promise<void> {",
    "  async function handleCreateActivity(event: FormEvent<HTMLFormElement>): Promise<void> {"
  );

  assert.ok(
    block.includes(
      "employee_count: departmentEmployeeCount,"
    )
  );

  assert.equal(
    block.includes(
      "employee_count: numberOrNull(departmentForm.employee_count),"
    ),
    false
  );
});

test("departments API independently rejects missing non-integer and non-positive employee counts", () => {
  const normalization = departmentsRoute.indexOf(
    "const employeeCount = cleanNullableNumber(body.employee_count)"
  );

  const nullGuard = departmentsRoute.indexOf(
    "employeeCount === null",
    normalization
  );

  const integerGuard = departmentsRoute.indexOf(
    "!Number.isInteger(employeeCount)",
    nullGuard
  );

  const positiveGuard = departmentsRoute.indexOf(
    "employeeCount <= 0",
    integerGuard
  );

  const errorCode = departmentsRoute.indexOf(
    'error: "invalid_employee_count"',
    positiveGuard
  );

  const insert = departmentsRoute.indexOf(
    '.from("nr1_departments")',
    errorCode
  );

  assert.ok(normalization >= 0);
  assert.ok(nullGuard > normalization);
  assert.ok(integerGuard > nullGuard);
  assert.ok(positiveGuard > integerGuard);
  assert.ok(errorCode > positiveGuard);
  assert.ok(insert > errorCode);
});

test("departments API persists only the validated employee count value", () => {
  assert.ok(
    departmentsRoute.includes(
      "employee_count: employeeCount,"
    )
  );

  assert.equal(
    departmentsRoute.includes(
      "employee_count: cleanNullableNumber(body.employee_count),"
    ),
    false
  );
});

test("guided sector keeps the human question for worker quantity", () => {
  assert.ok(
    workspace.includes(
      'question: "Quantas pessoas trabalham nesse setor?"'
    )
  );
});