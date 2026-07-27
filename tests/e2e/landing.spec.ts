import { test, expect } from "@playwright/test";

test("landing page renders hero and CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Gerak Lebih Baik/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mulai Gratis/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sudah punya akun/i })).toBeVisible();
});

test("marketing nav links to privacy and register", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Navigasi utama").getByRole("link", { name: "Privasi" }).click();
  await expect(page).toHaveURL(/\/privacy/);

  await page.goto("/");
  await page.getByRole("link", { name: "Daftar" }).first().click();
  await expect(page).toHaveURL(/\/register/);
});

test("register page shows the form fields", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByLabel(/Nama lengkap/i)).toBeVisible();
  await expect(page.getByLabel(/Email/i)).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Kata sandi$/i })).toBeVisible();
});

for (const route of ["/login", "/register"] as const) {
  test(`${route} stays inside the desktop viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerHeight,
      document: document.documentElement.scrollHeight,
      body: document.body.scrollHeight,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  });
}

test("mobile navigation opens without overflowing the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Buka menu" }).click();
  await expect(page.getByLabel("Navigasi seluler")).toBeVisible();
  const width = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
});
