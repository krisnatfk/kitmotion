import { test, expect } from "@playwright/test";

test("landing page renders hero and CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Gerak Lebih Baik/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mulai latihan gratis/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sudah punya akun/i })).toBeVisible();
});

test("landing page has no runtime or console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const source = message.location().url;
    errors.push(source ? `${message.text()} (${source})` : message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole("heading", { name: /Latihan lebih cerdas/i })).toBeVisible();

  expect(errors).toEqual([]);
});

test("browser extension attributes are removed before hydration", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().toLowerCase().includes("hydrated")) {
      hydrationErrors.push(message.text());
    }
  });

  await page.route(/http:\/\/localhost:3000\/$/, async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replaceAll("<div", '<div bis_skin_checked="1"'),
    });
  }, { times: 1 });

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(page.locator("[bis_skin_checked]")).toHaveCount(0);
  expect(hydrationErrors).toEqual([]);
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

test("invalid email confirmation returns a friendly login error", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/login\?error=/);
  await expect(page.getByText(/Tautan verifikasi tidak valid/i)).toBeVisible();
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

test("authentication pages have no runtime or console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.goto("/register");
  await page.waitForLoadState("networkidle");

  expect(errors).toEqual([]);
});
