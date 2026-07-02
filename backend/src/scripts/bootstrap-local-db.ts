/**
 * @deprecated Use `npm run db:reset` (package alias: `bootstrap:local-db`).
 */
import { pathToFileURL } from "url";
import { resetLocalDb } from "./reset-local-db.js";

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  resetLocalDb().catch((error: unknown) => {
    console.error("[bootstrap-local-db] ERROR:", error);
    process.exit(1);
  });
}
