import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { seedUiFixtures, otherUiAccount } = require("../ui-fixtures.cjs");
const origin = process.env.UI_TEST_BASE_URL ?? "http://127.0.0.1:3107";
const nav = (page: Page, label: string) => page.getByRole("navigation").getByRole("link", { name: label, exact: true });
async function openAdd(page: Page) {
  await page.goto("/add");
  await expect(page.getByRole("tab", { name: "Chi tiêu", exact: true })).toBeEnabled();
}
async function audit(page: Page) {
  await page.evaluate(async () => {
    await Promise.allSettled(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished));
  });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([]);
}
test.beforeEach(async ({ context }) => {
  const fixture = await seedUiFixtures();
  await context.addCookies([{ name: "session", value: fixture.token, url: origin }, { name: "finance_tz", value: "Asia%2FHo_Chi_Minh", url: origin }]);
});

for (const mode of ["light", "dark"] as const) {
  test(`five screens in ${mode} share materials, fit and pass accessibility`, async ({ page, context }, info) => {
    await context.addCookies([{ name: "finance_appearance", value: mode, url: origin }]);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    for (const [name, path] of [["overview", "/"], ["reports", "/reports"], ["add", "/add"], ["history", "/history"], ["budgets", "/budgets"]]) {
      await page.goto(path);
      const title = ({ overview: "Tổng quan", reports: "Báo cáo", add: "Giao dịch mới", history: "Giao dịch", budgets: "Ngân sách" } as Record<string, string>)[name];
      await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
      if (path === "/add") {
        await expect(page.getByRole("tab", { name: "Chi tiêu", exact: true })).toBeEnabled();
      } else {
        await page.waitForFunction(() => document.documentElement.style.getPropertyValue("--dock-height"));
      }
      await expect(page.locator("html")).toHaveAttribute("data-color-mode", mode);
      await expect(page.locator("html")).toHaveAttribute("data-visual-style", "glass");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator(".card,.transaction-form,.empty-state").evaluateAll(nodes => nodes.every(node => {
        const style = getComputedStyle(node);
        return style.backdropFilter === "none" && !style.backgroundColor.startsWith("rgba");
      }))).toBe(true);
      await page.evaluate(() => Promise.allSettled(document.getAnimations().map(animation => animation.finished)));
      await page.screenshot({ path: info.outputPath(`${mode}-${name}.png`), fullPage: true });
      await audit(page);
      await expect(page.getByRole("navigation")).toHaveCount(path === "/add" ? 0 : 1);
      if (path !== "/add") {
        await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(4);
        const add = page.getByRole("button", { name: "Thêm giao dịch", exact: true });
        await expect(add).toBeVisible();
        expect(await add.evaluate(node => node.closest("nav"))).toBeNull();
      }
    }
    expect(errors).toEqual([]);
  });
}

test("navigation handles rapid taps, history and current-tab refresh without replaying motion", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>("nav a");
    links[1].click(); links[3].click(); links[2].click();
  });
  await expect(page).toHaveURL(/\/history$/);
  await expect(nav(page, "Giao dịch")).toHaveAttribute("aria-current", "page");
  await expect(page.locator("[data-history-key]")).toHaveCount(30);
  await page.evaluate(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>("nav a");
    links[1].click(); links[2].click();
  });
  // Allow an already-scheduled RSC response to settle before checking last-selection wins.
  await page.waitForTimeout(350);
  await expect(page).toHaveURL(/\/history$/);
  await page.evaluate(() => { for (const animation of document.querySelector(".route-content")?.getAnimations() ?? []) animation.finish(); });
  await nav(page, "Giao dịch").click();
  expect(await page.locator(".route-content").evaluate(node => node.getAnimations().length)).toBe(0);
  await nav(page, "Báo cáo").click(); await expect(page).toHaveURL(/\/reports$/);
  await page.goBack(); await expect(page).toHaveURL(/\/history$/);
  await page.goForward(); await expect(page).toHaveURL(/\/reports$/);
});

test("route motion keeps its duration when CSS tokens are serialized in seconds", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { level: 1, name: "Tổng quan", exact: true }).waitFor();
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--motion-base", ".22s");
    document.documentElement.style.setProperty("--motion-slow", ".28s");
    const durations: number[] = [];
    Object.assign(window, { routeDurations: durations });
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args: Parameters<Element["animate"]>) {
      const animation = original.apply(this, args);
      if (this.classList.contains("route-content")) durations.push(Number(animation.effect?.getTiming().duration));
      return animation;
    };
  });
  await nav(page, "Báo cáo").click();
  await expect(page.getByRole("heading", { level: 1, name: "Báo cáo", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Thêm giao dịch", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Giao dịch mới", exact: true })).toBeVisible();
  // Initial hydration may also enter the overview after the observer is installed.
  expect(await page.evaluate(() => Reflect.get(window, "routeDurations"))).toEqual(expect.arrayContaining([220, 280]));
});

test("drafts remain separate across types, navigation and reload, with an explicit discard", async ({ page }) => {
  const expenseNote = "Expense draft " + "x".repeat(10020);
  await openAdd(page);
  await page.locator('[name="amount"]').fill("12,34");
  await page.locator('[name="note"]').fill(expenseNote);
  await page.getByRole("tab", { name: "Thu nhập", exact: true }).click();
  await expect(page.locator('[name="amount"]')).toHaveValue("");
  await page.locator('[name="amount"]').fill("87,65");
  await page.getByRole("tab", { name: "Đổi tiền", exact: true }).click();
  await page.locator('[name="fromAmountDkk"]').fill("99,99");
  await page.locator('[name="toAmountVnd"]').fill("350000");
  await page.reload(); await expect(page.locator('[name="fromAmountDkk"]')).toHaveValue("99,99");
  await page.getByRole("tab", { name: "Chi tiêu", exact: true }).click();
  await expect(page.locator('[name="amount"]')).toHaveValue("12,34");
  await expect(page.locator('[name="note"]')).toHaveValue(expenseNote);
  await page.getByRole("link", { name: "Quay lại màn hình trước" }).click();
  await nav(page, "Báo cáo").click(); await expect(page).toHaveURL(/\/reports$/); await page.getByRole("button", { name: "Thêm giao dịch", exact: true }).click();
  await expect(page.locator('[name="amount"]')).toHaveValue("12,34");
  await expect(page.getByRole("link", { name: "Quay lại màn hình trước" })).toHaveAttribute("href", "/reports");
  await page.getByRole("button", { name: "Bỏ bản nháp" }).click();
  await expect(page.locator('[name="amount"]')).toHaveValue("");
  await page.getByRole("tab", { name: "Thu nhập", exact: true }).click();
  await expect(page.locator('[name="amount"]')).toHaveValue("87,65");
  await page.getByRole("tab", { name: "Thu nhập", exact: true }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Đổi tiền", exact: true })).toBeFocused();
});

test("failed saves keep the draft; simultaneous submits send one real decimal transaction", async ({ page }) => {
  await openAdd(page);
  await page.locator('[name="amount"]').fill("12,34"); await page.locator('[name="note"]').fill("decimal-ui-save");
  await page.route("**/api/transactions", route => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Lỗi thử nghiệm" }) }), { times: 1 });
  await page.getByRole("button", { name: "Lưu chi tiêu", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Lỗi thử nghiệm");
  await expect(page.locator('[name="amount"]')).toHaveValue("12,34");
  let calls = 0; page.on("request", req => { if (req.url().endsWith("/api/transactions") && req.method() === "POST") { calls++; expect(req.postDataJSON().amountMajor).toBe("12.34"); } });
  await page.evaluate(() => { const form = document.querySelector<HTMLFormElement>("#new-transaction")!; form.requestSubmit(); form.requestSubmit(); });
  await expect(page.getByRole("status")).toContainText("Đã lưu giao dịch"); expect(calls).toBe(1);
  await expect(page.locator('[name="amount"]')).toHaveValue("");
  const response = await page.request.get("/api/history?q=decimal-ui-save"); const result = await response.json();
  expect(result.totalCount).toBe(1); expect(result.items[0].amountMajor).toBe(12.34);
});

test("restricted storage retains drafts through client navigation", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error("disabled"); }; Storage.prototype.setItem = () => { throw new Error("disabled"); }; });
  await openAdd(page); await page.locator('[name="amount"]').fill("45,67");
  await page.getByRole("link", { name: "Quay lại màn hình trước" }).click();
  await page.getByRole("button", { name: "Thêm giao dịch", exact: true }).click(); await expect(page.locator('[name="amount"]')).toHaveValue("45,67");
});

test("history restores filters, loaded pages and scroll, then rebuilds after a mutation", async ({ page }) => {
  await page.goto("/history?q=UI+fixture");
  await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
  await expect(page.locator("[data-history-key]")).toHaveCount(60);
  await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
  await expect(page.locator("[data-history-key]")).toHaveCount(90);
  const anchor = page.locator("[data-history-key]").nth(70); await anchor.scrollIntoViewIfNeeded();
  const key = await anchor.getAttribute("data-history-key");
  const y = await page.evaluate(() => scrollY);
  await nav(page, "Báo cáo").click(); await expect(page).toHaveURL(/\/reports$/); await nav(page, "Giao dịch").click();
  await expect(page).toHaveURL(/\/history\?q=UI\+fixture$/);
  await expect(page.locator("[data-history-key]")).toHaveCount(90);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y - 180);
  await page.getByRole("button", { name: "Thêm giao dịch", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Thu nhập", exact: true })).toBeEnabled();
  await page.getByRole("tab", { name: "Thu nhập", exact: true }).click();
  await page.locator('[name="amount"]').fill("1,23"); await page.locator('[name="note"]').fill("UI fixture new-income");
  await page.getByRole("button", { name: "Lưu thu nhập", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu giao dịch");
  await page.getByRole("link", { name: "Quay lại màn hình trước" }).click();
  await expect(page.locator("[data-history-key]")).toHaveCount(90);
  await expect(page.getByText(/133 kết quả/)).toBeVisible();
  await expect(page.locator(`[data-history-key="${key}"]`)).toBeAttached();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y - 200);
  await page.getByRole("link", { name: "Đặt lại", exact: true }).click(); await expect(page).toHaveURL(/\/history$/);
  await expect(page.locator('[name="q"]')).toHaveValue("");
});

test("filter accordion, CSV and dialog focus are accessible", async ({ page }) => {
  await page.goto("/history"); const summary = page.getByRole("button", { name: "Bộ lọc nâng cao", exact: true });
  await summary.click(); await expect(summary).toHaveAttribute("aria-expanded", "true");
  await page.getByLabel("Tiền tệ", { exact: true }).selectOption("DKK");
  await page.locator('[name="minAmount"]').fill("12,34");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(page).toHaveURL(/minAmount=12.34/);
  const csvHref = await page.getByRole("link", { name: "Xuất CSV" }).getAttribute("href");
  const csv = await page.request.get(csvHref!); expect(csv.ok()).toBe(true); expect(await csv.text()).toContain("DKK");
  await page.goto("/"); const trigger = page.getByRole("button", { name: "Mở menu tài khoản" });
  await trigger.click(); await expect(page.getByRole("dialog")).toBeVisible(); await audit(page);
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0); await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: /Tháng này/ }).click(); await expect(page.getByRole("dialog")).toBeVisible(); await audit(page);
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("budget form uses a themed dialog and persists a decimal limit", async ({ page }) => {
  await page.goto("/budgets"); await page.getByRole("button", { name: /Thêm ngân sách/ }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  await dialog.getByLabel("Phạm vi", { exact: true }).selectOption("UNCATEGORIZED");
  await dialog.locator('[name="limitMajor"]').fill("123,45"); await audit(page);
  await dialog.getByRole("button", { name: "Lưu hạn mức" }).click();
  await expect(dialog).toHaveCount(0); await expect(page.getByRole("status")).toContainText("Đã cập nhật ngân sách");
  await expect(page.getByText("123,45", { exact: false }).first()).toBeVisible();
});

test("reduced motion and opaque fallback remain functional", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/reports");
  expect(await page.locator(".route-content").evaluate(node => node.getAnimations().length)).toBe(0);
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
  await page.getByLabel("Hiệu ứng trong suốt", { exact: false }).selectOption("reduced");
  await page.keyboard.press("Escape");
  await expect.poll(() => page.locator(".navbar").evaluate(node => getComputedStyle(node).backdropFilter)).toBe("none");
  await audit(page); await page.getByRole("button", { name: "Thêm giao dịch", exact: true }).click();
  await page.locator('[name="amount"]').fill("1234"); await expect(page.locator('[name="amount"]')).toHaveValue("1.234");
});

test("small screens and enlarged text preserve horizontal layout", async ({ page }) => {
  for (const width of [320, 375, 393, 430, 1280]) {
    await page.setViewportSize({ width, height: 852 }); await page.goto("/");
    await page.addStyleTag({ content: "html {font-size: 200%}" });
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("logout and account changes clear private UI drafts", async ({ page, context }) => {
  await openAdd(page); await page.locator('[name="note"]').fill("private draft");
  await page.getByRole("link", { name: "Quay lại màn hình trước" }).click();
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click(); await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith("finance-ui:v1:")).length)).toBe(0);
  const fixture = await seedUiFixtures(); await context.addCookies([{ name: "session", value: fixture.token, url: origin }, { name: "finance_tz", value: "Asia%2FHo_Chi_Minh", url: origin }]);
  await openAdd(page); await expect(page.locator('[name="note"]')).toHaveValue("");
});

test("VND, exchanges and credit-card inputs preserve financial values", async ({ page }) => {
  await openAdd(page);
  await page.getByRole("tab", { name: "Thu nhập", exact: true }).click();
  await page.locator('[name="currency"]').selectOption("VND");
  await page.locator('[name="amount"]').fill("35000"); await page.locator('[name="note"]').fill("ui-vnd-income");
  await page.getByRole("button", { name: "Lưu thu nhập", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Đã lưu");
  let result = await (await page.request.get("/api/history?q=ui-vnd-income")).json(); expect(result.items[0].amountMajor).toBe(35000);
  await page.getByRole("tab", { name: "Đổi tiền", exact: true }).click();
  await page.locator('[name="fromAmountDkk"]').fill("12,34"); await page.locator('[name="toAmountVnd"]').fill("40000");
  await page.locator('[name="feeAmount"]').fill("0,25"); await page.locator('[name="provider"]').fill("ui-exchange");
  await page.getByRole("button", { name: "Lưu giao dịch đổi tiền", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Đã lưu");
  result = await (await page.request.get("/api/history?q=ui-exchange")).json();
  expect(result.items[0]).toMatchObject({ fromAmountDkk: 12.34, toAmountVnd: 40000, feeAmount: 0.25, feeCurrency: "DKK" });
  await page.getByRole("tab", { name: "Chi tiêu", exact: true }).click();
  await page.locator('[name="amount"]').fill("20,12"); await page.locator('[name="paymentMethod"]').selectOption("CREDIT_CARD");
  await page.locator('[name="note"]').fill("ui-credit-card");
  await page.getByRole("button", { name: "Lưu chi tiêu", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Đã lưu");
  result = await (await page.request.get("/api/history?q=ui-credit-card")).json(); expect(result.items[0]).toMatchObject({ amountMajor: 20.12, paymentMethod: "CREDIT_CARD" });
});

test("keyboard viewport switches the save action into scroll flow", async ({ page }) => {
  await openAdd(page); await page.locator('[name="amount"]').focus();
  await page.evaluate(() => { Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 400 }); window.visualViewport!.dispatchEvent(new Event("resize")); });
  await expect(page.locator('[data-keyboard-layout="flow"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu chi tiêu", exact: true })).toBeVisible();
  expect(await page.locator('[data-keyboard-layout]').evaluate(node => getComputedStyle(node).position)).not.toBe("fixed");
});


test("switching authenticated users clears previous drafts and history metadata", async ({ page, context }) => {
  await openAdd(page); await page.locator('[name="note"]').fill("previous-account-private-note");
  const token = await otherUiAccount();
  await context.addCookies([{ name: "session", value: token, url: origin }]);
  await openAdd(page); await expect(page.locator('[name="note"]')).toHaveValue("");
  expect(await page.evaluate(() => Object.keys(sessionStorage).some(key => key.startsWith("finance-ui:v1:glass-ui-fixture:")))).toBe(false);
});

test("explicit history refresh replaces off-page edits and removes deleted records", async ({ page }) => {
  await page.goto("/history?q=UI+fixture");
  await page.getByRole("button", { name: "Tải thêm", exact: true }).click(); await expect(page.locator("[data-history-key]")).toHaveCount(60);
  await page.getByRole("button", { name: "Tải thêm", exact: true }).click(); await expect(page.locator("[data-history-key]")).toHaveCount(90);
  const row = page.locator("[data-history-key]").nth(70); const key = await row.getAttribute("data-history-key");
  const id = key!.slice(key!.indexOf(":") + 1);
  const edited = await page.request.patch(`/api/transactions/${id}`, { headers: { Origin: origin }, data: { note: "UI fixture off-page update", amountMajor: id.includes("VND") ? 35000 : 12.34, category: "Đi chợ" } }); expect(edited.ok()).toBe(true);
  await nav(page, "Giao dịch").click();
  await expect(page.locator("[data-history-key]")).toHaveCount(90);
  await page.locator(`[data-history-key="${key}"]`).getByRole("button").click();
  await expect(page.getByText("UI fixture off-page update", { exact: true })).toBeVisible();
  const deleted = await page.request.delete(`/api/transactions/${id}`, { headers: { Origin: origin } }); expect(deleted.ok()).toBe(true);
  await nav(page, "Giao dịch").click();
  await expect(page.locator(`[data-history-key="${key}"]`)).toHaveCount(0);
  await expect(page.locator("[data-history-key]")).toHaveCount(90);
  await expect(page.getByText(/131 kết quả/)).toBeVisible();
});

test("pending navigation responds before the destination arrives", async ({ page }) => {
  await page.goto("/");
  await page.route("**/reports**", async route => { await new Promise(resolve => setTimeout(resolve, 700)); await route.continue(); });
  await nav(page, "Báo cáo").click();
  await expect(nav(page, "Báo cáo").locator("[data-nav-pending]")).toHaveCount(1);
  await expect(page).toHaveURL(/\/reports$/); await expect(page.getByRole("heading", { name: "Sắp ra mắt" })).toBeVisible();
});

test("budget month copy retains existing limits and reports copied/skipped counts", async ({ page }) => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
  for (const scope of ["TOTAL", "CATEGORY"]) {
    const response = await page.request.post("/api/budgets", { headers: { Origin: origin }, data: { month: previousMonth, currency: "DKK", scope, ...(scope === "CATEGORY" ? { category: "Đi chợ" } : {}), limitMajor: "444.44" } }); expect(response.ok()).toBe(true);
  }
  await page.goto(`/budgets?month=${month}&currency=DKK`);
  await page.getByRole("button", { name: "Sao chép tháng trước", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã sao chép 1 ngân sách, bỏ qua 1");
  await expect(page.getByRole("heading", { name: "Đi chợ", exact: true })).toBeVisible();
  await expect(page.getByText(/2.000,00/).first()).toBeVisible();
});

test("theme settings persist, track the OS and cover solid dialogs without changing finance data", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  const before = await (await page.request.get("/api/balances")).json();
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(node => getComputedStyle(node).backdropFilter)).toBe("none");
  await page.getByLabel("Giao diện", { exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "light");
  await page.getByLabel("Hiệu ứng trong suốt", { exact: false }).selectOption("reduced");
  await page.screenshot({ path: info.outputPath("profile-light.png"), fullPage: true });
  await audit(page);
  await page.keyboard.press("Escape");
  expect(await page.locator(".navbar").evaluate(node => ({ blur: getComputedStyle(node).backdropFilter, fill: getComputedStyle(node).backgroundColor }))).toEqual({ blur: "none", fill: "rgb(255, 255, 255)" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "light");
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "reduced");
  await nav(page, "Báo cáo").click();
  await expect(page).toHaveURL(/\/reports$/);
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
  await page.getByLabel("Giao diện", { exact: true }).selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await page.getByLabel("Hiệu ứng trong suốt", { exact: false }).selectOption("standard");
  await audit(page);
  await page.screenshot({ path: info.outputPath("profile-dark.png"), fullPage: true });
  await page.keyboard.press("Escape");
  expect(await page.locator(".navbar").evaluate(node => getComputedStyle(node).backdropFilter)).toContain("18px");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "light");
  await page.emulateMedia({ contrast: "more" });
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "reduced");
  expect(await page.locator(".navbar").evaluate(node => getComputedStyle(node).backdropFilter)).toBe("none");
  expect(await (await page.request.get("/api/balances")).json()).toEqual(before);
});

test("theme works in memory with blocked cookies and web storage", async ({ page }) => {
  await page.addInitScript(() => {
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(Document.prototype, "cookie", { configurable: true, get: cookie.get, set: () => { throw new Error("cookies disabled"); } });
    Storage.prototype.setItem = () => { throw new Error("storage disabled"); };
    Storage.prototype.getItem = () => { throw new Error("storage disabled"); };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu tài khoản" }).click();
  await page.getByLabel("Giao diện", { exact: true }).selectOption("dark");
  await page.getByLabel("Hiệu ứng trong suốt", { exact: false }).selectOption("reduced");
  await page.keyboard.press("Escape");
  await nav(page, "Báo cáo").click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-transparency", "reduced");
  await audit(page);
});

test("authentication, empty views and failed requests inherit dark mode", async ({ page, context }, info) => {
  await context.addCookies([{ name: "finance_appearance", value: "dark", url: origin }]);
  await context.clearCookies({ name: "session" });
  const errors: string[] = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  for (const route of ["/login", "/register", "/forgot-password"]) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("data-color-mode", "dark");
    await audit(page);
    await page.screenshot({ path: info.outputPath(`dark-${route.slice(1)}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
  const token = await otherUiAccount();
  await context.addCookies([{ name: "session", value: token, url: origin }]);
  for (const route of ["/", "/history", "/budgets"]) {
    await page.goto(route);
    await audit(page);
  }
  await openAdd(page);
  await page.route("**/api/transactions", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Kết nối tạm thời gián đoạn" }) }));
  await page.locator('[name="amount"]').fill("12,34");
  await page.getByRole("button", { name: "Lưu chi tiêu", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Kết nối tạm thời gián đoạn");
  await expect(page.locator('[name="amount"]')).toHaveValue("12,34");
  await audit(page);
});

test("resized dock leaves the final history row above navigation at large text", async ({ page }, info) => {
  for (const width of [320, 393, 430, 1280]) {
    await page.setViewportSize({ width, height: 852 });
    await page.goto("/history");
    // Exercise the hydrated list before measuring; its initial anchor restore owns scrolling.
    await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
    await expect(page.locator("[data-history-key]")).toHaveCount(60);
    await expect(page.getByRole("region", { name: "Tổng kết quả tìm kiếm" })).toHaveAttribute("aria-busy", "false");
    await page.addStyleTag({ content: "html {font-size:200%}" });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 430) {
      expect(await page.locator(".history-row").first().evaluate(node => getComputedStyle(node).display)).toBe("grid");
    }
    // Overflow-hidden must never make the layout pass by clipping the amount.
    expect(await page.locator(".history-row-amount .money-value").evaluateAll(nodes => nodes.every(node => {
      const amount = node.getBoundingClientRect();
      const row = node.closest(".history-row")!.getBoundingClientRect();
      return amount.left >= row.left && amount.right <= row.right && node.scrollWidth <= node.clientWidth + 1;
    }))).toBe(true);
    await expect.poll(() => page.locator(".navbar").evaluate(node =>
      Math.abs(parseFloat(document.documentElement.style.getPropertyValue("--dock-height")) - node.getBoundingClientRect().height) < 1
    )).toBe(true);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await expect.poll(async () => {
      const last = await page.locator("[data-history-key]").last().boundingBox();
      const dock = await page.locator(".navbar").boundingBox();
      return !!last && !!dock && last.y + last.height <= dock.y;
    }).toBe(true);
    await page.screenshot({ path: info.outputPath(`history-200-${width}.png`), fullPage: false });
  }
});
