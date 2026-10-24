import { test, expect } from "@playwright/test";

// Run against next dev so React Strict Mode replays the mount effect.
test("recovery token survives effect replay and form updates after URL scrubbing", async ({ page }) => {
  const token = "a".repeat(64);
  const password = "recovery-secure-test-password";
  let submitted: unknown;
  await page.route("**/api/auth/reset-password", async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto(`/reset-password#token=${token}`);
  await expect(page).toHaveURL(/\/reset-password$/);
  const submit = page.getByRole("button", { name: "Đặt lại mật khẩu", exact: true });
  await expect(submit).toBeEnabled();
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(password);
  await page.getByLabel("Nhập lại mật khẩu", { exact: true }).fill(password);
  await submit.click();
  await expect(page.getByRole("status")).toHaveText("Đã đổi mật khẩu. Hãy đăng nhập lại.");
  expect(submitted).toEqual({ token, newPassword: password });
  await expect(submit).toHaveCount(0);
});

test("recovery form stays disabled without a token", async ({ page }) => {
  await page.goto("/reset-password#unrelated=value");
  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByRole("button", { name: "Đặt lại mật khẩu", exact: true })).toBeDisabled();
  await expect(page.getByText("Liên kết không hợp lệ. Hãy liên hệ quản trị viên.")).toBeVisible();
});
