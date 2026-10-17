const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLoader } = require("./load-ts.cjs");
const load = createLoader();
const { parseHistoryFilters } = load("lib/history.ts");
const { parseMinorAmount } = load("lib/finance-validation.ts");
const { monthBounds, monthDates, previousMonth, budgetIdentity, budgetStatus } =
  load("lib/budget-utils.ts");

test("history validates money, date, enum and incompatible category inputs", () => {
  for (const query of [
    "type=bad",
    "currency=USD",
    "minAmount=1",
    "currency=VND&minAmount=1.2",
    "currency=DKK&maxAmount=1.234",
    "currency=DKK&minAmount=2&maxAmount=1",
    "start=2026-02-30",
    "start=2026-05-02&end=2026-05-01",
    "paymentMethod=bad",
    "category=x&uncategorized=1",
    "expenseScope=bad",
  ]) {
    assert.throws(
      () => parseHistoryFilters(new URLSearchParams(query), "Asia/Ho_Chi_Minh"),
      undefined,
      query,
    );
  }
  const f = parseHistoryFilters(
    new URLSearchParams(
      "currency=DKK&minAmount=0&maxAmount=12.34&q=%20gui%20me%20",
    ),
    "UTC",
  );
  assert.equal(f.minAmount, 0);
  assert.equal(f.maxAmount, 1234);
  assert.equal(f.q, "gui me");
  assert.equal(parseMinorAmount("21474836.47", "DKK"), 2147483647);
  for (const [v, c] of [
    ["0", "VND"],
    ["2147483648", "VND"],
    ["1e3", "DKK"],
    [Infinity, "DKK"],
    [null, "VND"],
  ])
    assert.throws(() => parseMinorAmount(v, c));
});
test("budget calendar boundaries use local full months, leap years and Danish DST", () => {
  assert.deepEqual(monthDates("2024-02"), {
    start: "2024-02-01",
    end: "2024-02-29",
  });
  assert.equal(previousMonth("2026-01"), "2025-12");
  const vn = monthBounds("2026-10", "Asia/Ho_Chi_Minh");
  assert.equal(vn.start.toISOString(), "2026-09-30T17:00:00.000Z");
  assert.equal(vn.end.toISOString(), "2026-10-31T16:59:59.999Z");
  const dk = monthBounds("2026-03", "Europe/Copenhagen");
  assert.equal(dk.start.toISOString(), "2026-02-28T23:00:00.000Z");
  assert.equal(dk.end.toISOString(), "2026-03-31T21:59:59.999Z");
  for (const month of ["0000-01", "2026-13", "2026-1", "nope"])
    assert.throws(() => monthDates(month));
});
test("budget identities and exact warning boundaries", () => {
  assert.equal(budgetIdentity("TOTAL", null).scopeKey, "TOTAL");
  assert.equal(
    budgetIdentity("CATEGORY", "Đi chợ").scopeKey,
    "CATEGORY:Đi chợ",
  );
  assert.throws(() => budgetIdentity("CATEGORY", "   "));
  for (const [spent, status] of [
    [799, "normal"],
    [800, "warning"],
    [999, "warning"],
    [1000, "reached"],
    [1001, "over"],
  ])
    assert.equal(budgetStatus(spent, 1000), status);
});

test("empty budget views skip the expense scan, including the dashboard's total-only view", async () => {
  let where;
  const perfLoad = createLoader({
    "./db": {
      prisma: {
        $transaction: async (action) =>
          action({
            budget: {
              findMany: async (args) => {
                where = args.where;
                return [];
              },
            },
            $queryRaw: () => {
              throw new Error(
                "No expense scan should run without a matching budget",
              );
            },
          }),
      },
    },
  });
  const { getBudgets } = perfLoad("lib/budgets.ts");
  assert.deepEqual(
    await getBudgets("user", "2026-10", "VND", "Asia/Ho_Chi_Minh", "TOTAL"),
    [],
  );
  assert.equal(where.scope, "TOTAL");
  assert.deepEqual(
    await getBudgets("user", "2026-10", "VND", "Asia/Ho_Chi_Minh"),
    [],
  );
  assert.equal(where.scope, undefined);
});
