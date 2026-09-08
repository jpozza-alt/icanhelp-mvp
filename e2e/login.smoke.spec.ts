import { expect, test } from "@playwright/test";

test("login publico carrega sem credenciais e apresenta acesso seguro", async ({
  page,
}) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Acesso ao icanHelp" })
  ).toBeVisible();

  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Entrar", exact: true })
  ).toBeDisabled();

  await expect(
    page.getByText("Adequação NR-1 guiada, rastreável e simples de executar.")
  ).toBeVisible();
});