import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://127.0.0.1:8000/api";
const fixtureName = "e2e-zephyr-notes.txt";
const fixtureContent = `Zephyr Evaluation Notes

The Zephyr evaluation identifier is ZX-4417. The review window runs from April 8 to April 22, 2025.

The evaluation includes 36 annotated support tickets. Two reviewers independently labeled each ticket, and disagreements were resolved by a third reviewer.

The primary finding is that response time improved by 18 percent after the routing change. The report notes one limitation: the sample covers only enterprise accounts, so results may not generalize to consumer requests.

The recommended next step is a follow-up study with at least 120 tickets across both account types.`;
const fixtureQuestion = "What is the Zephyr evaluation identifier?";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function cleanupFixture(request: APIRequestContext) {
  const response = await request.get(`${API}/documents`);
  if (!response.ok()) return;
  const documents = (await response.json()) as Array<{
    id: string;
    filename: string;
  }>;
  for (const document of documents) {
    if (document.filename === fixtureName) {
      await request.delete(`${API}/documents/${document.id}`);
    }
  }
}

async function setRangeValue(page: Page, selector: string, value: string) {
  await page.locator(selector).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test.describe("workspace", () => {
  test("upload, ask, cite, and delete a document", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 640,
      "desktop end-to-end flow",
    );
    test.setTimeout(300_000);
    const errors = collectErrors(page);
    await cleanupFixture(request);

    try {
      await page.goto("/workspace/documents");
      await expect(
        page.getByRole("heading", { name: "Your documents" }),
      ).toBeVisible();

      await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
          name: fixtureName,
          mimeType: "text/plain",
          buffer: Buffer.from(fixtureContent),
        });

      await expect(page.getByText(/chunk indexed/i).first()).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.getByText(fixtureName).first()).toBeVisible();
      await expect(page.getByText("Indexed").first()).toBeVisible();

      await page.goto("/workspace");
      await expect(
        page.getByRole("heading", { name: "Ask your documents", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /All documents|selected/i }).first(),
      ).toBeVisible();

      await page
        .getByRole("button", { name: /All documents|selected/i })
        .first()
        .click();
      await expect(page.getByText(fixtureName).first()).toBeVisible();
      await page.keyboard.press("Escape");

      const composer = page.getByRole("textbox", {
        name: /ask a question about your documents/i,
      });
      await expect(composer).toBeEnabled();
      await composer.fill(fixtureQuestion);
      await composer.press("Enter");

      await expect(
        page.getByText(fixtureQuestion, { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("ZX-4417").first()).toBeVisible({
        timeout: 180_000,
      });
      await expect(page.getByText(fixtureName).first()).toBeVisible();
      await expect(page.getByText(/Sources/i).first()).toBeVisible();
      await expect(page.getByText("Candidates", { exact: true })).toBeVisible();
      await expect(page.getByText("Passed cutoff", { exact: true })).toBeVisible();
      await expect(page.getByText("In prompt", { exact: true })).toBeVisible();
      await expect(page.getByText("Top match", { exact: true })).toBeVisible();
      await expect(page.getByText("Rel. cutoff", { exact: true })).toBeVisible();
      await expect(page.getByText(/Not enough evidence/i)).toHaveCount(0);
      await expect(
        page.getByText(/Unable to reach the DocuMind backend/i),
      ).toHaveCount(0);

      await composer.fill("hii");
      await composer.press("Enter");
      await expect(
        page.getByText(
          "Greeting detected. Document retrieval was skipped because no evidence was needed.",
        ),
      ).toBeVisible();
      await expect(page.getByText("Greeting · no retrieval needed")).toBeVisible();
      await expect(
        page.getByText("Greeting detected. No document retrieval was performed."),
      ).toBeVisible();

      await page.screenshot({
        path: testInfo.outputPath("workspace-answer.png"),
        fullPage: false,
      });

      await page.goto("/workspace/documents");
      const row = page.locator("tr", { hasText: fixtureName });
      await expect(row).toBeVisible();
      await row
        .getByRole("button", { name: `Delete ${fixtureName}` })
        .click();
      await expect(
        page.getByRole("heading", { name: "Delete document?" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Delete document" }).click();
      await expect(page.getByText(`${fixtureName} was deleted.`)).toBeVisible();
      await expect(page.getByText(fixtureName)).toHaveCount(0);

      expect(errors, errors.join("\n")).toEqual([]);
    } finally {
      await cleanupFixture(request);
    }
  });

  test("retrieval settings persist and reset", async ({ page }, testInfo) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 640,
      "desktop settings flow",
    );
    const errors = collectErrors(page);
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();

    const threshold = page.locator("#threshold");
    await expect(threshold).toHaveValue("20");
    await setRangeValue(page, "#threshold", "35");
    await expect(threshold).toHaveValue("35");
    await expect(page.getByText("35%")).toBeVisible();

    await page
      .getByRole("button", { name: "Save changes" })
      .first()
      .click();
    await expect(page.getByText(/Retrieval settings saved/i)).toBeVisible();

    await page.reload();
    await expect(page.locator("#threshold")).toHaveValue("35");

    await page.getByRole("button", { name: /Reset to defaults/i }).click();
    await expect(
      page.getByRole("heading", { name: "Reset retrieval defaults?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reset defaults" }).click();
    await expect(page.locator("#threshold")).toHaveValue("20");
    await expect(page.getByText(/reset to defaults/i).last()).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("settings-page.png"),
      fullPage: true,
    });

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("mobile navigation and layout", async ({ page }, testInfo) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) >= 640,
      "mobile only check",
    );
    const errors = collectErrors(page);
    await page.goto("/workspace");
    await expect(
      page.getByRole("heading", { name: "Ask your documents", exact: true }),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("dialog", { name: "Workspace navigation" }),
    ).toBeVisible();
    await page
      .getByRole("dialog", { name: "Workspace navigation" })
      .getByRole("link", { name: /^Documents/ })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your documents" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("dialog", { name: "Workspace navigation" })
      .getByRole("link", { name: "Settings" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();

    await page.goto("/workspace");
    await page.screenshot({
      path: testInfo.outputPath("workspace-mobile.png"),
      fullPage: false,
    });

    const finalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(finalOverflow).toBeLessThanOrEqual(1);
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
