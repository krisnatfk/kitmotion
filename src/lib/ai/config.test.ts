import { describe, expect, it } from "vitest";
import { getAIConfig, isAIConfigured } from "./config";

describe("AI server configuration", () => {
  it("stays disabled when no endpoint and model are configured", () => {
    expect(getAIConfig({})).toBeNull();
    expect(isAIConfigured({})).toBe(false);
  });

  it("accepts an OpenAI-compatible provider without locking the model vendor", () => {
    expect(getAIConfig({
      AI_PROVIDER: "local-ollama",
      AI_BASE_URL: "http://localhost:11434/v1/",
      AI_MODEL: "my-local-model",
      AI_TIMEOUT_MS: "30000",
    })).toEqual({
      provider: "local-ollama",
      apiKey: null,
      baseUrl: "http://localhost:11434/v1",
      model: "my-local-model",
      timeoutMs: 30000,
      responseFormat: "json_schema",
    });
  });

  it("supports providers that only expose JSON object mode", () => {
    expect(getAIConfig({
      AI_BASE_URL: "https://provider.example/v1",
      AI_MODEL: "deepseek-model",
      AI_RESPONSE_FORMAT: "json_object",
    })?.responseFormat).toBe("json_object");
  });

  it("rejects insecure remote endpoints", () => {
    expect(() => getAIConfig({
      AI_BASE_URL: "http://example.com/v1",
      AI_MODEL: "example-model",
    })).toThrow(/HTTPS/);
  });
});
