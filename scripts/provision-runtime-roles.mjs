import crypto from "node:crypto";
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

// Run on the Docker host; never log generated URLs/passwords.
process.loadEnvFile(".env");
const ownerUrl = new URL(process.env.DATABASE_URL);
const connection = new URL(ownerUrl);
connection.hostname = "127.0.0.1";
connection.port = "4500";
const prisma = new PrismaClient({ datasources: { db: { url: connection.toString() } } });
const quote = value => `"${value.replaceAll('"', '""')}"`;
const settings = {};
try {
  await prisma.$executeRawUnsafe("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
  for (const [key, role, pool] of [["APP_DATABASE_URL", "finance_app_runtime", 10], ["ADMIN_DATABASE_URL", "finance_admin_runtime", 5]]) {
    const password = process.env[key] ? decodeURIComponent(new URL(process.env[key]).password) : crypto.randomBytes(32).toString("hex");
    const existing = await prisma.$queryRaw`SELECT rolname FROM pg_roles WHERE rolname = ${role}`;
    if (!existing.length) {
      const [statement] = await prisma.$queryRaw`SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', ${role}, ${password}) AS sql`;
      await prisma.$executeRawUnsafe(statement.sql);
    } else {
      const [statement] = await prisma.$queryRaw`SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', ${role}, ${password}) AS sql`;
      await prisma.$executeRawUnsafe(statement.sql);
    }
    const name = quote(role);
    await prisma.$executeRawUnsafe(`ALTER ROLE ${name} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT ${pool + 5}`);
    await prisma.$executeRawUnsafe(`ALTER ROLE ${name} SET statement_timeout = '${key === "APP_DATABASE_URL" ? "15s" : "30s"}'`);
    await prisma.$executeRawUnsafe(`ALTER ROLE ${name} SET idle_in_transaction_session_timeout = '30s'`);
    await prisma.$executeRawUnsafe(`GRANT CONNECT ON DATABASE ${quote(decodeURIComponent(ownerUrl.pathname.slice(1)))} TO ${name}`);
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${name}`);
    await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${name}`);
    await prisma.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${name}`);
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${name}`);
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${name}`);
    await prisma.$executeRawUnsafe(`REVOKE ALL ON TABLE public."_prisma_migrations" FROM ${name}`);
    const url = new URL(ownerUrl);
    url.username = role; url.password = password;
    url.searchParams.set("connection_limit", String(pool));
    url.searchParams.set("pool_timeout", "10");
    settings[key] = url.toString();
  }
  settings.APP_ORIGINS = "https://financetracker.wt.id.vn";
  let env = fs.readFileSync(".env", "utf8");
  for (const [key, value] of Object.entries(settings)) {
    const line = `${key}=${value}`;
    env = new RegExp(`^${key}=.*$`, "m").test(env) ? env.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${env.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(".env", env, { mode: 0o600 }); fs.chmodSync(".env", 0o600);
  console.log("Restricted runtime roles provisioned; credentials saved privately in .env.");
} finally { await prisma.$disconnect(); }
