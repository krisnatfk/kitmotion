import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  listRuntimeAIProviders: vi.fn(),
  recordAIProviderHealth: vi.fn(),
}));

vi.mock("./provider-store", () => ({
  listRuntimeAIProviders: mocks.listRuntimeAIProviders,
  recordAIProviderHealth: mocks.recordAIProviderHealth,
}));

import { generateStructuredCompletionWithFailover } from "./client";

const schema = z.object({ status: z.literal("ok") });
const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: { status: { type: "string", enum: ["ok"] } },
} as const;

describe("AI provider failover", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("uses the next configured provider when the primary fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.listRuntimeAIProviders.mockResolvedValue([
      { id: "primary", name: "Primary", source: "database", provider: "Primary", apiKey: "one", baseUrl: "https://one.example/v1", model: "model-one", timeoutMs: 2000, responseFormat: "json_schema" },
      { id: "secondary", name: "Secondary", source: "database", provider: "Secondary", apiKey: "two", baseUrl: "https://two.example/v1", model: "model-two", timeoutMs: 2000, responseFormat: "json_object" },
    ]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "invalid key" } }), { status: 401, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"status":"ok"}' } }] }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateStructuredCompletionWithFailover({
      schemaName: "health",
      schema,
      jsonSchema,
      systemPrompt: "Return JSON.",
      input: {},
    });

    expect(result?.model).toBe("model-two");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mocks.recordAIProviderHealth).toHaveBeenNthCalledWith(1, "primary", false, expect.any(Number));
    expect(mocks.recordAIProviderHealth).toHaveBeenNthCalledWith(2, "secondary", true, expect.any(Number), undefined, "json_object");
  });
});
