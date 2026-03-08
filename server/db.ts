import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { execSync } from "child_process";
import * as schema from "@shared/schema";

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  delete process.env.PGHOST;
  delete process.env.PGPORT;
  delete process.env.PGUSER;
  delete process.env.PGPASSWORD;
  delete process.env.PGDATABASE;
  const pgDefaults = (pg as any).defaults;
  if (pgDefaults) {
    pgDefaults.host = undefined;
    pgDefaults.port = undefined;
    pgDefaults.user = undefined;
    pgDefaults.password = undefined;
    pgDefaults.database = undefined;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const dbUrl = new URL(process.env.DATABASE_URL);
let dbHost = dbUrl.hostname;

console.log(`DB config: host=${dbHost}, db=${dbUrl.pathname.slice(1)}, production=${isProduction}`);

const isInternalHost = dbHost && !dbHost.includes(".") && dbHost !== "localhost" && !/^[\d.]+$/.test(dbHost);
if (isInternalHost) {
  try {
    const result = execSync(`getent hosts ${dbHost}`, { encoding: "utf-8", timeout: 5000 }).trim();
    const ip = result.split(/\s+/)[0];
    if (ip) {
      console.log(`Resolved internal DB host ${dbHost} -> ${ip}`);
      dbHost = ip;
    }
  } catch {
    console.warn(`Could not resolve internal DB host ${dbHost}`);
  }
}

export const pool = new Pool({
  host: dbHost,
  port: parseInt(dbUrl.port || "5432"),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.slice(1),
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Pool error:", err.message);
});

export const db = drizzle(pool, { schema });
