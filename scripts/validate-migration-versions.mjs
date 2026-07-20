import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STANDARD_FILENAME = /^(\d{14})_[a-z0-9][a-z0-9_]*\.sql$/;
const VERSION_PREFIX = /^(\d+)_/;

// These versions are already recorded remotely with eight digits. Renaming them
// locally would create a new migration identity instead of preserving history.
export const LEGACY_REMOTE_FILENAMES = new Set([
  "20260408_hardening_legacy_objects_and_rbac_compat.sql",
  "20260413_001_create_nr1_module_initial.sql",
]);

export function validateMigrationFilenames(filenames) {
  const errors = [];
  const filesByVersion = new Map();

  for (const filename of filenames.filter((name) => name.endsWith(".sql")).sort()) {
    const prefixMatch = filename.match(VERSION_PREFIX);

    if (!prefixMatch) {
      errors.push(`${filename}: nome sem prefixo numérico de versão`);
      continue;
    }

    const version = prefixMatch[1];
    const files = filesByVersion.get(version) ?? [];
    files.push(filename);
    filesByVersion.set(version, files);

    if (!STANDARD_FILENAME.test(filename) && !LEGACY_REMOTE_FILENAMES.has(filename)) {
      errors.push(`${filename}: versão fora do padrão obrigatório de 14 dígitos`);
    }
  }

  for (const [version, files] of filesByVersion) {
    if (files.length > 1) {
      errors.push(`versão duplicada ${version}: ${files.join(", ")}`);
    }
  }

  return errors;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
const currentPath = fileURLToPath(import.meta.url);

if (invokedPath === currentPath) {
  const migrationsDirectory = resolve(dirname(currentPath), "..", "supabase", "migrations");
  const filenames = readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  const errors = validateMigrationFilenames(filenames);

  if (errors.length > 0) {
    console.error("Migration version validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Migration version validation passed (${filenames.filter((name) => name.endsWith(".sql")).length} SQL files; ${LEGACY_REMOTE_FILENAMES.size} documented legacy versions).`,
    );
  }
}
