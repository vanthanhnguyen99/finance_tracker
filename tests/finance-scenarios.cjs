process.env.APP_ORIGINS = 'http://localhost';
const assert = require("node:assert/strict");
const { createLoader } = require("./load-ts.cjs");
module.exports = async function ({ t, prisma, user }) {
  const { NextRequest } = require("next/server");
  let actor = user;
  const load = createLoader({
    "@/lib/db": { prisma },
    "./db": { prisma },
    "@/lib/auth": { getApiSessionUser: async () => actor },
    "next/cache": { revalidatePath() {} },
  });
  const history = load("lib/history.ts");
  const budgetLib = load("lib/budgets.ts");
  const budgets = load("app/api/budgets/route.ts");
  const budgetEdit = load("app/api/budgets/[id]/route.ts");
  const copy = load("app/api/budgets/copy-previous/route.ts");
  const historyApi = load("app/api/history/route.ts");
  const csvApi = load("app/api/export/csv/route.ts");
  const request = (path, body, method = "POST") =>
    new NextRequest(`http://localhost${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost",
        Cookie: "finance_tz=Asia%2FHo_Chi_Minh",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const context = (id) => ({ params: Promise.resolve({ id }) });
  const filter = (q) =>
    history.parseHistoryFilters(new URLSearchParams(q), "Asia/Ho_Chi_Minh");
  const reset = async () => {
    await prisma.budget.deleteMany();
    await prisma.exchange.deleteMany();
    await prisma.transaction.deleteMany();
    actor = user;
  };
  const dkk = await prisma.wallet.findUniqueOrThrow({
    where: { currency: "DKK" },
  });
  const vnd = await prisma.wallet.findUniqueOrThrow({
    where: { currency: "VND" },
  });
  const transaction = (data) =>
    prisma.transaction.create({
      data: {
        userId: user.id,
        walletId: data.currency === "VND" ? vnd.id : dkk.id,
        type: "EXPENSE",
        currency: "DKK",
        amount: 100,
        createdAt: new Date("2026-10-10T12:00:00Z"),
        ...data,
      },
    });
  const exchange = (data) =>
    prisma.exchange.create({
      data: {
        userId: user.id,
        fromWalletId: dkk.id,
        toWalletId: vnd.id,
        fromAmountDkk: 1234,
        toAmountVnd: 5000,
        effectiveRate: 405.186386,
        createdAt: new Date("2026-10-10T12:00:00Z"),
        ...data,
      },
    });
  const createBudget = (body = {}) =>
    budgets.POST(
      request("/api/budgets", {
        month: "2026-10",
        currency: "DKK",
        scope: "TOTAL",
        limitMajor: "10",
        ...body,
      }),
    );

  await t.test(
    "history paginates 65 interleaved tied records with global totals and full CSV",
    async () => {
      await reset();
      for (let i = 0; i < 40; i++)
        await transaction({
          id: `page-t-${String(i).padStart(2, "0")}`,
          type: i % 2 ? "EXPENSE" : "INCOME",
        });
      for (let i = 0; i < 25; i++)
        await exchange({
          id: `page-e-${String(i).padStart(2, "0")}`,
          fromAmountDkk: 50,
          toAmountVnd: 1750,
        });
      let cursor = null;
      const ids = [];
      do {
        const page = await history.getHistory(user.id, filter(""), cursor);
        assert.equal(page.totalCount, 65);
        assert.equal(page.summaryByCurrency.DKK.income, 2000);
        assert.equal(page.summaryByCurrency.DKK.expense, 2000);
        assert.equal(page.summaryByCurrency.DKK.exchangeOut, 1250);
        assert.equal(page.summaryByCurrency.VND.exchangeIn, 43750);
        ids.push(...page.items.map((row) => `${row.type}:${row.id}`));
        cursor = page.nextCursor;
      } while (cursor);
      assert.equal(ids.length, 65);
      assert.equal(new Set(ids).size, 65);
      const csv = await csvApi.GET(
        request("/api/export/csv", undefined, "GET"),
      );
      assert.equal(csv.status, 200);
      assert.equal((await csv.text()).trim().split("\r\n").length, 66);
      const invalid = await historyApi.GET(
        request("/api/history?cursor=garbage", undefined, "GET"),
      );
      assert.equal(invalid.status, 400);
    },
  );
  await t.test(
    "Vietnamese search handles Đ, case, literal wildcards and exchange providers",
    async () => {
      await reset();
      await transaction({
        note: "ĐI CHỢ Gửi mẹ 100%_ \\ABC",
        category: "Đi chợ",
      });
      await transaction({ note: "Gửi người khác 100xx", category: "Mua sắm" });
      await exchange({ provider: "Đổi tiền Đan Mạch" });
      for (const q of ["di cho", "gui me", "100%_", "\\ABC"])
        assert.equal(
          (
            await history.getHistory(
              user.id,
              filter(`q=${encodeURIComponent(q)}`),
            )
          ).totalCount,
          1,
          q,
        );
      assert.equal(
        (await history.getHistory(user.id, filter("q=dan+mach"))).items[0].type,
        "EXCHANGE",
      );
      assert.equal(
        (
          await history.getHistory(
            user.id,
            filter("type=exchange&category=Đi+chợ"),
          )
        ).totalCount,
        0,
      );
      assert.equal(
        (await history.getHistory(user.id, filter("paymentMethod=CASH")))
          .totalCount,
        2,
      );
    },
  );
  await t.test(
    "amount filters compare the selected exchange leg and combine conditions",
    async () => {
      await reset();
      await exchange({ feeAmount: 99, feeCurrency: "DKK" });
      await transaction({ amount: 1234, category: "Đi chợ" });
      await transaction({ amount: 5000, currency: "VND" });
      assert.equal(
        (
          await history.getHistory(
            user.id,
            filter("currency=DKK&minAmount=12.34&maxAmount=12.34"),
          )
        ).totalCount,
        2,
      );
      assert.equal(
        (
          await history.getHistory(
            user.id,
            filter("currency=VND&minAmount=5000&maxAmount=5000"),
          )
        ).totalCount,
        2,
      );
      assert.equal(
        (
          await history.getHistory(
            user.id,
            filter("currency=DKK&minAmount=12.35&type=exchange"),
          )
        ).totalCount,
        0,
      );
      assert.equal(
        (
          await history.getHistory(
            user.id,
            filter(
              "currency=DKK&category=Đi+chợ&start=2026-10-10&end=2026-10-10",
            ),
          )
        ).totalCount,
        1,
      );
    },
  );
  await t.test(
    "budgets exclude repayments and exchanges, retain legacy/uncategorized and agree with history CSV",
    async () => {
      await reset();
      await transaction({
        amount: 100,
        category: "Đi chợ",
        paymentMethod: "CASH",
      });
      await transaction({
        amount: 200,
        category: "Đi chợ",
        paymentMethod: "CREDIT_CARD",
      });
      await transaction({ amount: 300, category: "   ", paymentMethod: null });
      await transaction({
        amount: 400,
        category: " TÍN DỤNG ",
        paymentMethod: null,
      });
      await transaction({
        amount: 500,
        category: "Tin dung",
        paymentMethod: "CASH",
      });
      await transaction({
        amount: 600,
        category: "Tín dụng",
        paymentMethod: "CREDIT_CARD",
      });
      await transaction({
        amount: 700,
        category: "Khoản cho mượn",
        paymentMethod: "CASH",
      });
      await transaction({ amount: 100000, currency: "VND" });
      await exchange({ feeAmount: 10, feeCurrency: "DKK" });
      for (const body of [
        {},
        { scope: "CATEGORY", category: "Đi chợ" },
        { scope: "UNCATEGORIZED" },
      ])
        assert.equal((await createBudget(body)).status, 201);
      const views = await budgetLib.getBudgets(
        user.id,
        "2026-10",
        "DKK",
        "Asia/Ho_Chi_Minh",
      );
      assert.equal(views.find((b) => b.scope === "TOTAL").spent, 1900);
      assert.equal(views.find((b) => b.scope === "TOTAL").status, "over");
      assert.equal(views.find((b) => b.scope === "CATEGORY").spent, 300);
      assert.equal(views.find((b) => b.scope === "UNCATEGORIZED").spent, 300);
      for (const b of views) {
        const url = new URL(b.historyUrl, "http://localhost");
        const rows = await history.getHistory(user.id, filter(url.search));
        assert.equal(rows.summaryByCurrency.DKK.expense, b.spent);
        const csv = await csvApi.GET(
          request(`/api/export/csv${url.search}`, undefined, "GET"),
        );
        assert.equal(csv.status, 200);
        assert.equal(
          (await csv.text()).trim().split("\r\n").length,
          rows.totalCount + 1,
        );
      }
      const total = views.find((b) => b.scope === "TOTAL");
      assert.equal(
        (
          await budgetEdit.PATCH(
            request("/api/budgets/x", { limitMajor: "19" }, "PATCH"),
            context(total.id),
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await budgetLib.getBudgets(
            user.id,
            "2026-10",
            "DKK",
            "Asia/Ho_Chi_Minh",
          )
        ).find((b) => b.id === total.id).status,
        "reached",
      );
      const created = await transaction({ amount: 1000, category: "Đi chợ" });
      assert.equal(
        (
          await budgetLib.getBudgets(
            user.id,
            "2026-10",
            "DKK",
            "Asia/Ho_Chi_Minh",
          )
        ).find((b) => b.scope === "CATEGORY").spent,
        1300,
      );
      await prisma.transaction.update({
        where: { id: created.id },
        data: { category: "Mua sắm", currency: "VND", walletId: vnd.id },
      });
      assert.equal(
        (
          await budgetLib.getBudgets(
            user.id,
            "2026-10",
            "DKK",
            "Asia/Ho_Chi_Minh",
          )
        ).find((b) => b.scope === "CATEGORY").spent,
        300,
      );
      await prisma.transaction.delete({ where: { id: created.id } });
    },
  );
  await t.test(
    "budget month boundaries use the same local dates as history",
    async () => {
      await reset();
      await createBudget();
      await transaction({
        amount: 100,
        createdAt: new Date("2026-09-30T16:59:59.999Z"),
      });
      await transaction({
        amount: 200,
        createdAt: new Date("2026-09-30T17:00:00Z"),
      });
      await transaction({
        amount: 400,
        createdAt: new Date("2026-10-31T16:59:59.999Z"),
      });
      await transaction({
        amount: 800,
        createdAt: new Date("2026-10-31T17:00:00Z"),
      });
      const b = (
        await budgetLib.getBudgets(
          user.id,
          "2026-10",
          "DKK",
          "Asia/Ho_Chi_Minh",
        )
      )[0];
      assert.equal(b.spent, 600);
      assert.equal(
        (
          await history.getHistory(
            user.id,
            filter(new URL(b.historyUrl, "http://localhost").search),
          )
        ).summaryByCurrency.DKK.expense,
        600,
      );
    },
  );
  await t.test(
    "ownership, validation, concurrent creates/copy and independent months",
    async () => {
      await reset();
      const responses = await Promise.all([createBudget(), createBudget()]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
      const b = await prisma.budget.findFirstOrThrow({
        where: { userId: user.id },
      });
      const other = await prisma.userAllowlist.create({
        data: { displayName: "Private", status: "ACTIVE" },
      });
      await transaction({ userId: other.id, note: "private-marker" });
      actor = other;
      assert.equal(
        (await history.getHistory(other.id, filter("q=private-marker")))
          .totalCount,
        1,
      );
      assert.equal(
        (
          await budgetEdit.PATCH(
            request("/x", { limitMajor: 5 }, "PATCH"),
            context(b.id),
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await budgetEdit.DELETE(
            request("/x", undefined, "DELETE"),
            context(b.id),
          )
        ).status,
        404,
      );
      assert.equal(
        (await budgetLib.getBudgets(other.id, "2026-10", "DKK", "UTC")).length,
        0,
      );
      actor = user;
      assert.equal(
        (await history.getHistory(user.id, filter("q=private-marker")))
          .totalCount,
        0,
      );
      actor = null;
      assert.equal(
        (await historyApi.GET(request("/api/history", undefined, "GET")))
          .status,
        401,
      );
      assert.equal(
        (await budgets.GET(request("/api/budgets", undefined, "GET"))).status,
        401,
      );
      assert.equal((await createBudget()).status, 401);
      actor = user;
      for (const body of [
        { limitMajor: 0 },
        { month: "2026-13" },
        { currency: "USD" },
        { scope: "CATEGORY", category: "" },
        { currency: "VND", limitMajor: "1.5" },
      ])
        assert.equal((await createBudget(body)).status, 400);
      const copies = await Promise.all(
        [1, 2].map(() =>
          copy.POST(request("/copy", { month: "2026-11", currency: "DKK" })),
        ),
      );
      const results = await Promise.all(copies.map((r) => r.json()));
      assert.equal(
        results.reduce((sum, r) => sum + r.copied, 0),
        1,
      );
      assert.equal(
        results.reduce((sum, r) => sum + r.skipped, 0),
        1,
      );
      const nov = await prisma.budget.findFirstOrThrow({
        where: { userId: user.id, month: "2026-11" },
      });
      await budgetEdit.PATCH(
        request("/x", { limitMajor: "20" }, "PATCH"),
        context(nov.id),
      );
      assert.equal(
        (await prisma.budget.findUniqueOrThrow({ where: { id: b.id } }))
          .limitMinor,
        1000,
      );
    },
  );
  await t.test(
    "budget writes wait for the exclusive user-table lock used by restore",
    async () => {
      let release;
      let locked;
      const hold = new Promise((resolve) => {
        release = resolve;
      });
      const ready = new Promise((resolve) => {
        locked = resolve;
      });
      const blocker = prisma.$transaction(async (tx) => {
        await tx.$executeRaw`LOCK TABLE "UserAllowlist" IN EXCLUSIVE MODE`;
        locked();
        await hold;
      });
      await ready;
      const writerDb = {
        $transaction: (action, options) =>
          prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SET LOCAL application_name = 'budget_restore_lock_test'`;
            return action(tx);
          }, options),
      };
      const writer = createLoader({
        "@/lib/db": { prisma: writerDb },
        "./db": { prisma: writerDb },
        "@/lib/auth": { getApiSessionUser: async () => user },
        "next/cache": { revalidatePath() {} },
      })("app/api/budgets/route.ts");
      const pending = writer.POST(
        request("/api/budgets", {
          month: "2026-12",
          currency: "DKK",
          scope: "TOTAL",
          limitMajor: "100",
        }),
      );
      try {
        let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const rows =
            await prisma.$queryRaw`SELECT pid FROM pg_stat_activity WHERE application_name = 'budget_restore_lock_test' AND wait_event_type = 'Lock'`;
          if (rows.length) {
            waiting = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert(
          waiting,
          "Budget writer must wait until restore releases its lock",
        );
      } finally {
        release();
        await blocker;
      }
      assert.equal((await pending).status, 201);
    },
  );
  await t.test(
    "v2 budget backup round-trip, append conflicts, malformed rejection and v1 compatibility",
    async () => {
      process.env.ADMIN_TOKEN = "integration-test-only";
      const { createAdminServer } = await import("../admin-server.mjs");
      const server = createAdminServer(prisma);
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const headers = {
          "Content-Type": "application/json",
        Origin: "http://localhost",
          "X-Admin-Token": process.env.ADMIN_TOKEN,
        };
        const backup = await (
          await fetch(`${base}/api/system/backup`, { headers })
        ).json();
        assert.equal(backup.version, 2);
        assert(backup.budgets.length > 0);
        assert.equal(backup.meta.budgetCount, backup.budgets.length);
        const restore = (data, mode = "replace") =>
          fetch(`${base}/api/system/restore`, {
            method: "POST",
            headers,
            body: JSON.stringify({ backup: data, mode }),
          });
        for (const invalid of [
          { ...backup, budgets: undefined },
          { ...backup, budgets: [...backup.budgets, backup.budgets[0]] },
          {
            ...backup,
            budgets: backup.budgets.map((b, i) =>
              i ? b : { ...b, userId: "missing" },
            ),
          },
        ]) {
          assert.equal((await restore(invalid)).status, 400);
          assert.equal(await prisma.budget.count(), backup.budgets.length);
        }
        const appended = await restore(backup, "append");
        assert.equal(appended.status, 200, await appended.clone().text());
        assert.equal(await prisma.budget.count(), backup.budgets.length);
        const conflicting = structuredClone(backup);
        conflicting.budgets[0].limitMinor += 100;
        assert.equal((await restore(conflicting, "append")).status, 200);
        assert.equal(
          (
            await prisma.budget.findUniqueOrThrow({
              where: { id: backup.budgets[0].id },
            })
          ).limitMinor,
          backup.budgets[0].limitMinor,
        );
        assert.equal((await restore(backup)).status, 200);
        assert.deepEqual(
          (await prisma.budget.findMany({ orderBy: { id: "asc" } })).map(
            (b) => b.limitMinor,
          ),
          [...backup.budgets]
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((b) => b.limitMinor),
        );
        const legacy = { ...backup, version: 1 };
        delete legacy.budgets;
        delete legacy.meta.budgetCount;
        assert.equal((await restore(legacy, "append")).status, 200);
        assert.equal(await prisma.budget.count(), backup.budgets.length);
        assert.equal((await restore(legacy)).status, 200);
        assert.equal(await prisma.budget.count(), 0);
      } finally {
        await new Promise((resolve) => {
          server.close(resolve);
          server.closeAllConnections();
        });
      }
    },
  );
};
