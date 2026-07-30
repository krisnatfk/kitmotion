import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptAICredential, encryptAICredential } from "./credentials";

describe("AI credential encryption", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("encrypts API keys with authenticated encryption", () => {
    vi.stubEnv("AI_ENCRYPTION_KEY", "a-stable-test-secret");
    const encrypted = encryptAICredential("secret-api-key");
    expect(encrypted).not.toContain("secret-api-key");
    expect(decryptAICredential(encrypted)).toBe("secret-api-key");
  });

  it("rejects ciphertext modified after encryption", () => {
    vi.stubEnv("AI_ENCRYPTION_KEY", "a-stable-test-secret");
    const encrypted = encryptAICredential("secret-api-key");
    expect(() => decryptAICredential(`${encrypted}x`)).toThrow();
  });
});
