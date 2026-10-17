const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { PrismaClient } = require('@prisma/client');

module.exports = async ({ t, prisma }) => {
  await t.test('runtime provisioning retries lost credentials and rotates existing role passwords', async () => {
    // Run the actual script with isolated environment/file adapters. All SQL and
    // password authentication use the disposable PostgreSQL instance.
    const source = fs.readFileSync(path.join(__dirname, '../scripts/provision-runtime-roles.mjs'), 'utf8');
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    }).outputText;
    const run = new (Object.getPrototypeOf(async function () {}).constructor)('require', 'process', 'console', 'exports', code);
    const ownerUrl = process.env.TEST_DATABASE_URL;
    let envFile = '';
    const provision = async (settings = {}, failSave = false) => {
      let saved = false;
      await run(id => {
        if (id === '@prisma/client') return { PrismaClient: class {
          constructor() { return new PrismaClient({ datasources: { db: { url: ownerUrl } } }); }
        } };
        if (id === 'node:fs') return {
          readFileSync() { return envFile; },
          writeFileSync(file, value) {
            if (failSave) throw new Error('Simulated env save failure');
            envFile = value; saved = true;
          },
          chmodSync() {}
        };
        return require(id);
      }, { env: { DATABASE_URL: ownerUrl, ...settings }, loadEnvFile() {} }, { log() {} }, {});
      assert(saved);
      return Object.fromEntries(envFile.trim().split('\n').map(line => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }));
    };
    const authenticate = async settings => {
      for (const key of ['APP_DATABASE_URL', 'ADMIN_DATABASE_URL']) {
        const client = new PrismaClient({ datasources: { db: { url: settings[key] } } });
        try {
          const [row] = await client.$queryRaw`SELECT current_user AS name`;
          assert.equal(row.name, new URL(settings[key]).username);
          await client.userAllowlist.count();
        } finally { await client.$disconnect(); }
      }
    };
    for (const role of ['finance_app_runtime', 'finance_admin_runtime']) {
      const existing = await prisma.$queryRaw`SELECT rolname FROM pg_roles WHERE rolname = ${role}`;
      assert.equal(existing.length, 0, 'Provisioning tests require no pre-existing runtime roles');
    }
    try {
      await assert.rejects(provision({}, true), /Simulated env save failure/);
      const recovered = await provision();
      await authenticate(recovered);
      const rotated = { ...recovered };
      for (const key of ['APP_DATABASE_URL', 'ADMIN_DATABASE_URL']) {
        const url = new URL(rotated[key]);
        url.password = `rotated-'"-password-${key}`;
        rotated[key] = url.toString();
      }
      const saved = await provision(rotated);
      await authenticate(saved);
      await authenticate(await provision(saved));
    } finally {
      for (const role of ['finance_app_runtime', 'finance_admin_runtime']) {
        await prisma.$executeRawUnsafe(`DROP OWNED BY "${role}"`);
        await prisma.$executeRawUnsafe(`DROP ROLE "${role}"`);
      }
    }
  });
};
