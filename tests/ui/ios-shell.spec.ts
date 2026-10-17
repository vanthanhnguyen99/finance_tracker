import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { seedUiFixtures } = require("../ui-fixtures.cjs");
const origin = process.env.UI_TEST_BASE_URL ?? "http://127.0.0.1:3107";

test.beforeEach(async ({ context }) => {
  const { token } = await seedUiFixtures();
  await context.addCookies([{ name: "session", value: token, url: origin }, { name: "finance_tz", value: "Asia%2FHo_Chi_Minh", url: origin }]);
});

test("iPhone shell has a compact capsule, legible single-line labels and no page-sized focus ring", async ({ page }, info) => {
  await page.goto("/reports");
  await page.getByRole("heading", { name: "Báo cáo", exact: true }).waitFor();
  // Next/Safari can focus the new main landmark after a route change.
  await page.locator("main").focus();
  expect(await page.locator("main").evaluate(node => getComputedStyle(node).outlineStyle)).toBe("none");
  const dock = page.locator(".navbar");
  const dimensions = await dock.boundingBox();
  expect(dimensions!.height).toBeLessThanOrEqual(76);
  expect(await dock.evaluate(node => Number.parseFloat(getComputedStyle(node).borderRadius))).toBeGreaterThanOrEqual(36);
  expect(await page.locator(".hero-bar").evaluate(node => getComputedStyle(node).boxShadow)).toBe("none");
  expect(await page.locator(".bottom-nav-item > span:not(.sr-only)").evaluateAll(nodes => nodes.every(node =>
    node.getBoundingClientRect().height <= parseFloat(getComputedStyle(node).lineHeight) + 1
  ))).toBe(true);
  await expect(page.getByRole("navigation").getByRole("link")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Thêm giao dịch", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("iphone-reports-focused.png") });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole("navigation").getByRole("link", { name: "Ngân sách", exact: true }).click();
  await expect(page).toHaveURL(/\/budgets$/);
  await page.evaluate(() => Promise.allSettled(document.getAnimations().map(animation => animation.finished)));
  const marker = await page.locator(".dock-indicator").boundingBox();
  const selected = await page.locator('nav a[aria-current="page"]').boundingBox();
  expect(Math.abs(marker!.x - selected!.x)).toBeLessThan(2);
});

test("native month and select controls retain their geometry and native form behavior", async ({ page }, info) => {
  for (const width of [320, 393, 430]) {
    await page.setViewportSize({ width, height: 852 });
    await page.goto("/budgets");
    const month = page.locator('input[type="month"]');
    await expect(month).toBeVisible();
    const bounds = await month.boundingBox();
    const label = await month.locator("..").boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(48);
    expect(bounds!.x).toBeGreaterThanOrEqual(label!.x);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(label!.x + label!.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('input[type="month"]').fill("2026-11");
  await page.getByLabel("Tiền tệ", { exact: true }).selectOption("VND");
  await page.getByRole("button", { name: "Xem ngân sách", exact: true }).click();
  await expect(page).toHaveURL(/month=2026-11&currency=VND/);
  await page.goto("/add");
  for (const select of await page.locator("select.select").all()) {
    expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    expect(await select.evaluate(node => getComputedStyle(node).appearance)).toBe("none");
  }
  await page.locator('[name="currency"]').selectOption("VND");
  await expect(page.locator('[name="currency"]')).toHaveValue("VND");
  await page.screenshot({ path: info.outputPath("iphone-native-controls.png") });
});

test("standalone safe-area simulation leaves content and floating save actions usable", async ({ page }, info) => {
  await page.goto("/history");
  await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
  await expect(page.locator("[data-history-key]")).toHaveCount(60);
  // Explicit simulation, not a claim that browser emulation supplies real iOS insets.
  await page.addStyleTag({ content: ":root {--safe-area-top:59px;--safe-area-bottom:34px}" });
  await expect.poll(() => page.locator(".navbar").evaluate(node => getComputedStyle(node).bottom)).toBe("42px");
  const heading = await page.locator("h1").boundingBox();
  expect(heading!.y).toBeGreaterThanOrEqual(59);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect.poll(async () => {
    const last = await page.locator("[data-history-key]").last().boundingBox();
    const dock = await page.locator(".navbar").boundingBox();
    return last!.y + last!.height < dock!.y;
  }).toBe(true);
  await page.screenshot({ path: info.outputPath("iphone-standalone-history.png") });
  await page.getByRole("button", { name: "Thêm giao dịch", exact: true }).click();
  await expect(page).toHaveURL(/\/add$/);
  const save = page.getByRole("button", { name: "Lưu chi tiêu", exact: true });
  await expect(save).toBeVisible();
  const saveBounds = await save.boundingBox();
  expect(saveBounds!.y + saveBounds!.height).toBeLessThanOrEqual(852 - 34);
  const footer = page.locator('[data-keyboard-layout="fixed"]');
  expect(await footer.evaluate(node => getComputedStyle(node).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  await page.screenshot({ path: info.outputPath("iphone-standalone-add.png") });
});
