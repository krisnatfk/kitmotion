import { describe, expect, it } from "vitest";
import { translateAuthError } from "./errors";

describe("translateAuthError", () => {
  it("distinguishes the project-wide email quota from request throttling", () => {
    expect(translateAuthError("rate limit exceeded", "over_email_send_rate_limit", 429)).toContain("Kuota email");
    expect(translateAuthError("too many requests", "over_request_rate_limit", 429)).toContain("jaringan ini");
  });

  it("explains the built-in SMTP recipient restriction", () => {
    expect(translateAuthError("Email address not authorized", "email_address_not_authorized", 422)).toContain("belum mengizinkan");
  });

  it("keeps existing credential translations", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("Email atau kata sandi salah.");
  });
});
