import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
process.env.SQLITE_PATH = path.join(dir, "..", "data", "test-ops-console.db");
