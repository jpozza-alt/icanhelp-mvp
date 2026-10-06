import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

const login = read("app/login/page.tsx");
const signup = read("app/cadastro/page.tsx");
const onboarding = read("app/onboarding/page.tsx");
const tenantsRoute = read("app/api/tenants/route.ts");
const migration = read(
  "supabase/migrations/20261006132822_nr1_explicit_account_onboarding.sql"
);

test("login separa entrada de cadastro", () => {
  assert.match(login, /href="\/cadastro"/);
  assert.match(login, /Criar minha conta/);
  assert.match(login, /href="\/auth\/forgot-password"/);
  assert.doesNotMatch(login, /signInWithOtp/);
  assert.doesNotMatch(login, /Receber link por e-mail/);
  assert.doesNotMatch(login, /handleEmailLink/);
});

test("login encaminha usuario sem tenant para onboarding", () => {
  assert.match(login, /fetch\("\/api\/tenants"/);
  assert.match(login, /payload\.length === 0/);
  assert.match(login, /return "\/onboarding"/);
});

test("cadastro usa email e senha de forma explicita", () => {
  assert.match(signup, /supabase\.auth\.signUp/);
  assert.match(signup, /Confirmar senha/);
  assert.match(signup, /full_name/);
  assert.match(signup, /\/auth\/callback\?next=/);
  assert.match(signup, /encodeURIComponent\("\/onboarding"\)/);
  assert.doesNotMatch(signup, /signInWithOtp/);
  assert.match(
    signup,
    /organização que já esteja vinculada ao seu e-mail/
  );
  assert.doesNotMatch(
    signup,
    /tenha sido convidado/
  );
});

test("onboarding cria tenant somente por acao consciente", () => {
  assert.match(onboarding, /Cadastrar minha empresa/);
  assert.match(onboarding, /fetch\("\/api\/tenants"/);
  assert.match(onboarding, /method: "POST"/);
  assert.match(onboarding, /fetch\("\/api\/tenant\/select"/);
});

test("membro de outra organizacao ainda pode criar sua propria organizacao", () => {
  assert.match(onboarding, /const hasOwnedTenant = accesses\.some/);
  assert.match(onboarding, /access\.role === "owner"/);
  assert.match(onboarding, /\{!hasOwnedTenant \? \(/);
  assert.match(onboarding, /Cadastrar minha empresa/);
});

test("onboarding nao promete fluxo de convite ainda inexistente", () => {
  assert.match(
    onboarding,
    /Já tenho acesso a uma organização/
  );
  assert.match(
    onboarding,
    /Atualizar meus acessos/
  );
  assert.doesNotMatch(
    onboarding,
    /Recebi um convite/
  );
});

test("api cria tenant por RPC autenticada sem service role", () => {
  assert.match(
    tenantsRoute,
    /icanhelp_create_initial_tenant/
  );
  assert.match(
    tenantsRoute,
    /user_already_owns_tenant/
  );
  assert.doesNotMatch(
    tenantsRoute,
    /SUPABASE_SERVICE_ROLE_KEY/
  );
});

test("migration remove somente bootstrap automatico e preserva trigger de profile", () => {
  assert.match(
    migration,
    /drop trigger if exists icanhelp_on_auth_user_created on auth\.users/i
  );

  assert.doesNotMatch(
    migration,
    /drop trigger if exists on_auth_user_created on auth\.users/i
  );

  assert.match(
    migration,
    /icanhelp_create_initial_tenant/
  );

  assert.match(
    migration,
    /v_user_id := auth\.uid\(\)/
  );

  assert.match(
    migration,
    /user_already_owns_tenant/
  );

  assert.match(
    migration,
    /role\s*=\s*'owner'/
  );

  assert.match(
    migration,
    /revoke execute[\s\S]*from anon/i
  );

  assert.match(
    migration,
    /grant execute[\s\S]*to authenticated/i
  );
});

test("owner surge somente na criacao explicita do tenant", () => {
  assert.doesNotMatch(signup, /owner/);

  assert.match(
    migration,
    /insert into public\.tenant_memberships[\s\S]*'owner'/
  );
});