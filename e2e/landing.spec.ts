import { test, expect, type Page } from "@playwright/test";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("landing page", () => {
  test("renders every marketing section without console errors", async ({
    page,
  }, testInfo) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page).toHaveTitle(/DocuMind AI/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Your Documents/i }),
    ).toBeVisible();
    await expect(
      page.getByText("AI-Powered Document Intelligence", { exact: true }).first(),
    ).toBeVisible();

    const sections = [
      { hash: "features", heading: /Everything You Need/i },
      { hash: "how-it-works", heading: /From Documents to Answers/i },
      { hash: "showcase", heading: /See Your Documents Differently/i },
      { hash: "about", heading: /Making Knowledge Easier/i },
      { hash: "faq", heading: /Questions, Answered Directly/i },
    ];

    for (const section of sections) {
      const element = page.locator(`#${section.hash}`);
      await element.scrollIntoViewIfNeeded();
      await expect(
        page.getByRole("heading", { level: 2, name: section.heading }),
      ).toBeVisible();
    }

    await page.locator("#faq").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Which file formats/i }).click();
    await expect(page.getByText(/PDF and plain text/i).first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: testInfo.outputPath("landing-full.png"),
      fullPage: true,
    });

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("navbar anchors and primary CTA navigate correctly", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");

    const isMobile = (page.viewportSize()?.width ?? 0) < 640;
    const mainNav = page.getByRole("navigation", { name: "Main navigation" });
    const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });

    if (isMobile) {
      await page.getByRole("button", { name: /open navigation menu/i }).click();
      await mobileNav.getByRole("link", { name: "Features", exact: true }).click();
    } else {
      await mainNav.getByRole("link", { name: "Features", exact: true }).click();
    }

    await expect(page).toHaveURL(/#features$/);
    await expect(
      page.getByRole("heading", { level: 2, name: /Everything You Need/i }),
    ).toBeVisible();

    if (isMobile) {
      await page.getByRole("button", { name: /open navigation menu/i }).click();
      await mobileNav
        .getByRole("link", { name: /Get Started Free/i })
        .click();
    } else {
      await mainNav.getByRole("link", { name: "Get Started", exact: true }).click();
    }

    await expect(page).toHaveURL(/\/workspace$/);
    await expect(
      page.getByRole("heading", { name: "Ask your documents", exact: true }),
    ).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: /Try DocuMind AI/i }).click();
    await expect(page).toHaveURL(/\/workspace$/);

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("mobile navigation is accessible", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) >= 640, "desktop only check");
    const errors = collectErrors(page);
    await page.goto("/");

    const menuButton = page.locator(
      'button[aria-controls="mobile-navigation"]',
    );
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(
      page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "How It Works", exact: true }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    expect(errors, errors.join("\n")).toEqual([]);
  });
});
