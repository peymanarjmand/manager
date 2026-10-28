import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export const localConfigPath = join(
  tmpdir(),
  "life-manager-myapp-vault.config.local",
);
export const localConfig = JSON.parse(
  readFileSync(localConfigPath, "utf8").replace(/^\uFEFF/, ""),
);
if (localConfig.API_URL !== "http://127.0.0.1:54321")
  throw new Error("Vault tests must never target a remote database.");
