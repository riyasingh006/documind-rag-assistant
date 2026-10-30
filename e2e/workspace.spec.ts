import { test, expect, type Page } from "@playwright/test";

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

async function mockApi(page: Page) {
  const documents: Record<string, unknown>[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");    const health = {
      status: "ok",
      version: "1.0.0",
      embedding: {
        model: "gemini-embedding-001",
        dimension: 768,
        ready: true,
        error: null,
        device: "gemini-api",
      },
      index: {
        state: "ready",
        ready: true,
        model: "gemini-embedding-001",
        dimension: 768,
        error: null,
      },
      runtime: { embedding_state: "ready", hosted_platform: "test" },
      llm: {
        configured_provider: "gemini",
        active_provider: "gemini",
        model: "gemini-3.8-flash",
        available: true,
        fallback_enabled: true,
        detail: null,
        generation_active: true,
        status: "configured",
      },
      counts: {
        documents: documents.length,
        chunks: documents.reduce(
          (total, item) => total + Number(item.chunk_count ?? 0),
          0,
        ),
        index_vectors: documents.reduce(
          (total, item) => total + Number(item.chunk_count ?? 0),
          0,
        ),
      },
      limits: { max_upload_mb: 20, allowed_extensions: ["pdf", "txt"] },
      defaults: {
        chunk_size: 800,
        chunk_overlap: 120,
        top_k: 5,
        score_threshold: 0.2,
        min_similarity_floor: 0.15,
      },
    };

    if (path === "/health" && request.method() === "GET") {
      await route.fulfill({ json: health });
      return;
    }
    if (path === "/documents" && request.method() === "GET") {
      await route.fulfill({ json: documents });
      return;
    }
    if (path === "/documents" && request.method() === "POST") {
      const body = request.postData() ?? "";
      const filename =
        body.match(/filename="([^"]+)"/)?.[1] ?? fixtureName;
      const document = {
        id: "doc-zephyr",
        filename,
        file_type: "txt",
        size_bytes: Buffer.byteLength(fixtureContent),
        pages: 1,
        chunk_count: 4,
        character_count: fixtureContent.length,
        created_at: "2026-10-30T00:00:00Z",
      };
      documents.push(document);
      await route.fulfill({ status: 201, json: document });
      return;
    }
    if (path.startsWith("/documents/") && request.method() === "DELETE") {
      const id = decodeURIComponent(path.slice("/documents/".length));
      const index = documents.findIndex((item) => item.id === id);
      if (index >= 0) documents.splice(index, 1);
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (path === "/query" && request.method() === "POST") {
      const payload = JSON.parse(request.postData() ?? "{}") as {
        question?: string;
      };
      const greeting = payload.question?.trim().toLowerCase() === "hii";
      await route.fulfill({
        json: {
          answer: greeting
            ? "Greeting detected. Document retrieval was skipped because no evidence was needed."
            : "The Zephyr evaluation identifier is ZX-4417 [1].",
          answerable: true,
          reason: greeting ? "greeting" : "answered",
          sources: greeting
            ? []
            : [
                {
                  id: 1,
                  document_id: "doc-zephyr",
                  filename: fixtureName,
                  file_type: "txt",
                  page: 1,
                  chunk_id: "chunk-zephyr-1",
                  chunk_index: 0,
                  score: 0.91,
                  excerpt: "The Zephyr evaluation identifier is ZX-4417.",
                  cited: true,
                },
              ],
          retrieval: {
            top_k: 5,
            threshold: 0.2,
            chunks_retrieved: greeting ? 0 : 1,
            documents_searched: greeting ? 0 : 1,
            latency_ms: 25,
            candidates_considered: greeting ? 0 : 4,
            candidates_passed: greeting ? 0 : 2,
            top_score: greeting ? null : 0.91,
            effective_threshold: 0.2,
            min_similarity_floor: 0.15,
          },
          generation: {
            provider: "gemini",
            model: "gemini-3.8-flash",
            mode: greeting ? "none" : "llm",
            latency_ms: 12,
            fallback_reason: null,
          },
        },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { detail: `Unexpected API route: ${path}` } });
  });
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

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test.describe("workspace", () => {
  test("upload, ask, cite, greet, and delete a document", async ({ page }, testInfo) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 640,
      "desktop end-to-end flow",
    );
    test.setTimeout(90_000);
    const errors = collectErrors(page);

    await page.goto("/workspace/documents");
    await expect(
      page.getByRole("heading", { name: "Your documents", exact: true }),
    ).toBeVisible();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: fixtureName,
      mimeType: "text/plain",
      buffer: Buffer.from(fixtureContent),
    });

    await expect(page.getByText(/chunks? indexed/i).first()).toBeVisible();
    await expect(page.getByText(fixtureName).first()).toBeVisible();
    await expect(page.getByText("Indexed").first()).toBeVisible();

    await page.getByRole("link", { name: "Workspace", exact: true }).first().click();
    await expect(
      page.getByRole("heading", { name: "Ask your documents", exact: true }),
    ).toBeVisible();
    const composer = page.getByRole("textbox", {
      name: /ask a question about your documents/i,
    });
    await expect(composer).toBeEnabled();
    await composer.fill(fixtureQuestion);
    await composer.press("Enter");

    await expect(page.getByText("ZX-4417").first()).toBeVisible();
    await expect(page.getByText(fixtureName).first()).toBeVisible();
    await expect(page.getByText(/Sources/i).first()).toBeVisible();
    await expect(page.getByText("Candidates", { exact: true })).toBeVisible();
    await expect(page.getByText("Passed cutoff", { exact: true })).toBeVisible();
    await expect(page.getByText("In prompt", { exact: true })).toBeVisible();
    await expect(page.getByText("Top match", { exact: true })).toBeVisible();
    await expect(page.getByText("Rel. cutoff", { exact: true })).toBeVisible();
    await expect(page.getByText(/Not enough evidence/i)).toHaveCount(0);
    await composer.fill("hii");
    await composer.press("Enter");
    await expect(
      page.getByText(
        "Greeting detected. Document retrieval was skipped because no evidence was needed.",
        { exact: true },
      ).first(),
    ).toBeVisible();
    await expect(page.getByText("Greeting · no retrieval needed")).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("workspace-answer.png"),
      fullPage: false,
    });
    await page.goto("/workspace/documents");
    const row = page.locator("tr", { hasText: fixtureName });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: `Delete ${fixtureName}` }).click();
    await expect(
      page.getByRole("heading", { name: "Delete document?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete document" }).click();
    await expect(page.getByText(`${fixtureName} was deleted.`)).toBeVisible();
    await expect(page.getByText(fixtureName)).toHaveCount(0);
    expect(errors, errors.join("\n")).toEqual([]);
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
    await page.getByRole("button", { name: "Save changes" }).first().click();
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
      page.getByRole("heading", { name: "Your documents", exact: true }),
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
