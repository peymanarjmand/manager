import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const output = execFileSync(
  process.execPath,
  ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"],
  { encoding: "utf8" },
);
const cfg = JSON.parse(output);
if (cfg.API_URL !== "http://127.0.0.1:54321")
  throw new Error("Only the isolated localhost stack is authorized.");
writeFileSync(
  join(tmpdir(), "life-manager-myapp-vault.config.local"),
  JSON.stringify(cfg),
  { mode: 0o600 },
);
execFileSync(
  "docker",
  [
    "exec",
    "-i",
    "supabase_db_myapp",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
  ],
  {
    input: readFileSync("supabase/tests/legacy-fixture.sql"),
    stdio: ["pipe", "ignore", "inherit"],
  },
);
console.log(
  "Local test configuration and disposable legacy fixtures are ready.",
);
