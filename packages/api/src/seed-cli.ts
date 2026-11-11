import { getDb, resetDbForTests } from "./db.js";

resetDbForTests();
getDb();
console.log("SQLite seeded with synthetic fixture data.");
