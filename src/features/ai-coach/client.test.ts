import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateStructuredCompletion } from "./client";

const outputSchema = z.object({ status: z.literal("ok") });
const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: { status: { type: "string", enum: ["ok"] } },
} as const;

describe("AI structured completion", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls the configured server endpoint and validates structured output", async () => {
    vi.stubEnv("AI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai");
    vi.stubEnv("AI_MODEL", "gemini-test");
    vi.stubEnv("AI_API_KEY", "server-secret");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"status":"ok"}' } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateStructuredCompletion({
      schemaName: "health",
      schema: outputSchema,
      jsonSchema,
      systemPrompt: "Return JSON.",
      input: { check: true },
    });

    expect(result?.data).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer server-secret" }),
      }),
    );
    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(request.response_format.json_schema.schema).toEqual(jsonSchema);
  });

  it("rejects output that does not match the application schema", async () => {
    vi.stubEnv("AI_BASE_URL", "https://example.com/v1");
    vi.stubEnv("AI_MODEL", "example-model");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"status":"wrong"}' } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    await expect(generateStructuredCompletion({
      schemaName: "health",
      schema: outputSchema,
      jsonSchema,
      systemPrompt: "Return JSON.",
      input: {},
    })).resolves.toBeNull();
  });

  it("retries once when Gemini is temporarily unavailable", async () => {
    vi.stubEnv("AI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai");
    vi.stubEnv("AI_MODEL", "gemini-test");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("service unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"status":"ok"}' } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateStructuredCompletion({
      schemaName: "health",
      schema: outputSchema,
      jsonSchema,
      systemPrompt: "Return JSON.",
      input: {},
    });

    expect(result?.data).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to json_object for providers without json_schema support", async () => {
    vi.stubEnv("AI_BASE_URL", "https://provider.example/v1");
    vi.stubEnv("AI_MODEL", "deepseek-test");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: "This response_format type is unavailable now." },
      }), { status: 400, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"status":"ok"}' } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateStructuredCompletion({
      schemaName: "health",
      schema: outputSchema,
      jsonSchema,
      systemPrompt: "Return JSON.",
      input: {},
    });

    expect(result?.data).toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const fallbackRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(fallbackRequest.response_format).toEqual({ type: "json_object" });
    expect(fallbackRequest.messages[0].content).toContain(JSON.stringify(jsonSchema));
  });
});
